// Assemble le journal audio de Mosaiq : voix par rubrique + habillage (générique, jingles, tapis, fin).
// Usage : node tools/journal-mix.js <dossier des voix> <dossier du kit> <sortie.mp3>
// Le dossier des voix contient un MP3 par section, nommé d'après l'ordre ci-dessous (les absents sont sautés) :
//   ouverture, monde, france, afrique, outremer, eco, culture, sport, fin
// Le kit contient : generique.mp3, tapis.mp3, fin.mp3, j-<rubrique>.mp3 (monde, france, afrique, outremer, eco, culture, sport).
// Nécessite ffmpeg et ffprobe.
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const [voixDir, kitDir, out] = process.argv.slice(2);
if (!voixDir || !kitDir || !out) { console.error('usage: node tools/journal-mix.js voix/ kit/ sortie.mp3'); process.exit(1); }
const ORDRE = ['ouverture', 'monde', 'france', 'afrique', 'outremer', 'eco', 'culture', 'sport', 'fin'];
const SR = 44100, BED = 0.17; // volume du tapis sous la voix
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mix-'));
const ff = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
const dur = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
const kit = n => path.join(kitDir, n + '.mp3');
const W = n => path.join(tmp, n + '.wav');
const norm = (src, dst, I) => ff(['-i', src, '-af', `loudnorm=I=${I}:TP=-2:LRA=11,aresample=${SR}`, '-ac', '1', dst]);

// 1. normalisation : voix à -16 LUFS, musique plus bas pour rester derrière
const secs = ORDRE.filter(s => fs.existsSync(path.join(voixDir, s + '.mp3')));
secs.forEach(s => norm(path.join(voixDir, s + '.mp3'), W('v-' + s), -16));
norm(kit('generique'), W('generique'), -18);
norm(kit('fin'), W('fin'), -18);
norm(kit('tapis'), W('tapis'), -18);
['monde', 'france', 'afrique', 'outremer', 'eco', 'culture', 'sport'].forEach(j => { if (fs.existsSync(kit('j-' + j))) norm(kit('j-' + j), W('j-' + j), -17); });
const tapisLen = dur(W('tapis'));
let off = 0; // décalage dans le tapis, pour ne pas toujours entendre le même passage

// 2. une section = voix (légèrement retardée) sur le tapis bouclé, avec fondus
function section(s, opts = {}) {
  const v = W('v-' + s), dv = dur(v), pre = opts.pre ?? 0.35, post = opts.post ?? 0.9, L = pre + dv + post;
  const start = off % Math.max(1, tapisLen - L - 1); off += L + 7;
  ff(['-i', v, '-stream_loop', '-1', '-i', W('tapis'), '-filter_complex',
    `[1:a]atrim=start=${start.toFixed(2)}:duration=${L.toFixed(2)},asetpts=PTS-STARTPTS,volume=${BED},afade=t=in:d=${opts.fadeIn ?? 0.8},afade=t=out:st=${(L - 1.2).toFixed(2)}:d=1.2[b];` +
    `[0:a]adelay=${Math.round(pre * 1000)},apad=whole_dur=${L.toFixed(2)}[vv];[vv][b]amix=inputs=2:normalize=0:duration=first[o]`,
    '-map', '[o]', '-ar', SR, '-ac', '1', W('s-' + s)]);
  return W('s-' + s);
}

// 3. ouverture : le générique démarre seul puis baisse sous la voix
function ouverture() {
  const v = W('v-ouverture'), dv = dur(v), g = W('generique'), dg = dur(g), at = 3.6, L = at + dv + 1.0;
  ff(['-i', v, '-i', g, '-stream_loop', '-1', '-i', W('tapis'), '-filter_complex',
    `[1:a]volume='if(lt(t,${at - 0.6}),1,if(lt(t,${at + 0.4}),1-${1 - BED * 1.4}*(t-${at - 0.6}),${BED * 1.4}))':eval=frame,afade=t=out:st=${(dg - 1.5).toFixed(2)}:d=1.5,apad=whole_dur=${L.toFixed(2)}[g];` +
    `[2:a]atrim=duration=${Math.max(0.1, L - dg + 2).toFixed(2)},asetpts=PTS-STARTPTS,volume=${BED},afade=t=in:d=1.5,afade=t=out:st=${Math.max(0, L - dg + 0.8).toFixed(2)}:d=1.2,adelay=${Math.round((dg - 2) * 1000)},apad=whole_dur=${L.toFixed(2)}[t];` +
    `[0:a]adelay=${Math.round(at * 1000)},apad=whole_dur=${L.toFixed(2)}[vv];[vv][g][t]amix=inputs=3:normalize=0:duration=first[o]`,
    '-map', '[o]', '-ar', SR, '-ac', '1', W('s-ouverture')]);
  return W('s-ouverture');
}

// 4. fin : voix sur le tapis, puis la musique de fin prend le relais
function fin() {
  const sv = section('fin', { post: 0.2 }), dsv = dur(sv);
  ff(['-i', sv, '-i', W('fin'), '-filter_complex', `[1:a]adelay=${Math.round((dsv - 0.6) * 1000)}[f];[0:a][f]amix=inputs=2:normalize=0:duration=longest[o]`,
    '-map', '[o]', '-ar', SR, '-ac', '1', W('s-fin2')]);
  return W('s-fin2');
}

// 5. enchaînement : jingle de rubrique avant chaque section (l'éco-tech a le jingle « eco »)
const parts = [];
secs.forEach(s => {
  if (s === 'ouverture') return parts.push(ouverture());
  if (s === 'fin') return parts.push(fin());
  if (fs.existsSync(W('j-' + s))) parts.push(W('j-' + s));
  parts.push(section(s));
});
// placement sur une ligne de temps : la voix entre pendant la résonance du jingle (pas de blanc)
const JOVER = 1.6; // recouvrement jingle → voix, en secondes
let t = 0; const place = [];
parts.forEach((f, i) => {
  place.push([f, t]);
  const d = dur(f), isJ = path.basename(f).startsWith('j-');
  t += isJ ? Math.max(1, d - JOVER) : d - 0.15;
});
const total = place.reduce((m, [f, s]) => Math.max(m, s + dur(f)), 0);
const cur = path.join(tmp, 'mix.wav');
ff([...place.flatMap(([f]) => ['-i', f]), '-filter_complex',
  place.map(([f, s], i) => `[${i}:a]adelay=${Math.round(s * 1000)},apad=whole_dur=${total.toFixed(2)}[p${i}]`).join(';') + ';' +
  place.map((_, i) => `[p${i}]`).join('') + `amix=inputs=${place.length}:normalize=0:duration=longest[o]`,
  '-map', '[o]', '-ac', '1', cur]);
ff(['-i', cur, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=9', '-ar', SR, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', out]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ fichier: out, duree_s: Math.round(dur(out)), sections: secs }));
