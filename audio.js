// Enregistre le journal audio du jour dans data/audio.json (garde les 7 derniers) et liste les MP3 à retirer.
// Usage : node tools/audio.js AAAA-MM-JJ data/audio/AAAA-MM-JJ.mp3 script.txt "Nom de la voix"
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [date, mp3, script, voix] = process.argv.slice(2);
const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]).toString().trim());
const file = 'data/audio.json';
const d = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { editions: {} };
d.editions[date] = { fichier: path.basename(mp3), duree: Math.floor(dur / 60) + ' min ' + String(Math.round(dur % 60)).padStart(2, '0'), secondes: Math.round(dur), voix, script: fs.readFileSync(script, 'utf8').trim() };
const keep = Object.keys(d.editions).sort().reverse().slice(0, 7);
const old = Object.keys(d.editions).filter(k => !keep.includes(k)).map(k => 'data/audio/' + d.editions[k].fichier);
d.editions = Object.fromEntries(keep.map(k => [k, d.editions[k]]));
d.maj = date;
fs.writeFileSync(file, JSON.stringify(d, null, 1));
console.log(JSON.stringify({ duree: d.editions[date].duree, a_retirer: old }));
