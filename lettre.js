// Génère le flux RSS de la lettre du matin (data/lettre.xml) à partir des dernières éditions.
// Usage : node tools/lettre.js <dossier des éditions (contenant index.json)> <fichier de sortie>
// Le service d'envoi (Brevo, intégration « RSS Campaign ») lit ce flux chaque matin et envoie la lettre aux abonnés.
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || 'data/editions', out = process.argv[3] || 'data/lettre.xml';
const SITE = 'https://mosaiq.news/';
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const RUBS = [['france', 'France'], ['outremer', 'Outre-mer'], ['afrique', 'Afrique'], ['eco', 'Économie'], ['tech', 'Tech & Sciences'], ['culture', 'Culture']];
const idx = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
const items = idx.editions.slice(0, 7).map(ix => {
  let e; try { e = JSON.parse(fs.readFileSync(path.join(dir, ix.date + '.json'), 'utf8')); } catch (err) { return ''; }
  const link = SITE + '#edition-' + ix.date;
  const C = { ink: '#14161c', soft: '#5b6270', faint: '#8a909c', geo: '#0f7d84', line: '#e3e6ec' };
  const lab = (t, c) => '<p style="margin:28px 0 8px;font:700 12px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:' + (c || C.soft) + '">' + t + '</p>';
  const first = s => { s = String(s || ''); const m = s.match(/^(.+?[.!?])(\s|$)/); return m ? m[1] : s; };
  let h = '<p style="margin:0 0 4px;font:12px Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:' + C.soft + '">' + esc(ix.date_longue || ix.date) + '</p>';
  h += '<h1 style="margin:0 0 10px;font:700 24px/1.25 Arial,sans-serif;color:' + C.ink + '">' + esc((e.une && e.une.titre) || ix.titre) + '</h1>';
  h += '<p style="margin:0;font:17px/1.55 Georgia,serif;color:' + C.ink + '">' + esc(e.une && e.une.chapeau) + '</p>';
  const G = e.geopolitique || [];
  if (G.length) {
    // le sujet du jour : celui qui a le plus de regards
    const g = G.slice().sort((a, b) => (b.regards || []).length - (a.regards || []).length)[0];
    h += lab('Le sujet du jour · regards croisés', C.geo);
    h += '<h2 style="margin:0 0 6px;font:700 19px/1.3 Arial,sans-serif"><a href="' + SITE + '#g-' + esc(g.id) + '" style="color:' + C.ink + ';text-decoration:none">' + esc(g.titre) + '</a></h2>';
    h += '<p style="margin:0 0 12px;font:15.5px/1.5 Georgia,serif;color:' + C.soft + '">' + esc(first(g.chapeau)) + '</p>';
    h += (g.regards || []).slice(0, 4).map(r => '<div style="border-left:3px solid ' + C.geo + ';padding:2px 0 2px 12px;margin:0 0 10px"><b style="font:700 13.5px Arial,sans-serif;color:' + C.ink + '">' + esc(r.lecture || r.region) + '</b><br><span style="font:14.5px/1.45 Georgia,serif;color:' + C.soft + '">' + esc(r.angle || first(r.texte)) + '</span></div>').join('');
    h += '<p style="margin:12px 0 0"><a href="' + SITE + '#g-' + esc(g.id) + '" style="font:700 14px Arial,sans-serif;color:' + C.geo + '">Comparer les ' + (g.regards || []).length + ' regards →</a></p>';
    const others = G.filter(x => x !== g);
    if (others.length) h += '<p style="margin:16px 0 0;font:14.5px/1.6 Arial,sans-serif;color:' + C.ink + '"><b style="color:' + C.geo + '">Aussi en géopolitique</b> · ' + others.map(x => '<a href="' + SITE + '#g-' + esc(x.id) + '" style="color:' + C.ink + '">' + esc(x.titre) + '</a>').join(' · ') + '</p>';
  }
  h += lab('Dans l\'édition');
  const row = (nom, links) => '<tr><td style="padding:9px 12px 9px 0;border-top:1px solid ' + C.line + ';vertical-align:top;white-space:nowrap;font:700 12px Arial,sans-serif;letter-spacing:.05em;text-transform:uppercase;color:' + C.soft + '">' + nom + '</td><td style="padding:9px 0;border-top:1px solid ' + C.line + ';font:14.5px/1.5 Arial,sans-serif;color:' + C.ink + '">' + links + '</td></tr>';
  let rows = '';
  RUBS.forEach(([id, nom]) => {
    const A = (e.articles || []).filter(a => a.rubrique === id);
    if (A.length) rows += row(nom, A.map(a => '<a href="' + SITE + '#a-' + esc(a.id) + '" style="color:' + C.ink + '">' + esc(a.titre) + '</a>').join('<br>'));
  });
  const sb = (e.sport && e.sport.breves) || [];
  if (sb.length) rows += row('Sport', sb.map(b => esc(b.titre)).join('<br>'));
  h += '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">' + rows + '</table>';
  h += '<p style="margin:28px 0 8px;text-align:center"><a href="' + link + '" style="display:inline-block;background:' + C.ink + ';color:#ffffff;text-decoration:none;font:700 15px Arial,sans-serif;padding:12px 22px;border-radius:8px">Lire l\'édition complète</a></p>';
  h += '<p style="margin:18px 0 0;font:12px/1.5 Arial,sans-serif;color:' + C.faint + ';text-align:center">Textes rédigés avec l\'aide d\'une intelligence artificielle à partir des sources citées sur le site. <a href="' + SITE + '#methode" style="color:' + C.faint + '">Notre méthode</a>.</p>';
  const d = new Date(ix.date + 'T06:00:00+01:00');
  return '<item><title>' + esc('Mosaiq du ' + (ix.date_longue || ix.date).replace(/^./, c => c.toLowerCase()) + ' : ' + ix.titre) + '</title><link>' + esc(link) + '</link><guid isPermaLink="false">mosaiq-' + ix.date + '</guid><pubDate>' + d.toUTCString() + '</pubDate><description><![CDATA[' + h.replace(/]]>/g, ']]&gt;') + ']]></description></item>';
}).filter(Boolean).join('\n');
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Mosaiq — la lettre du matin</title><link>' + SITE + '</link><description>Le monde à 7 h. Tous les regards. L\'essentiel de l\'édition du jour.</description><language>fr</language><lastBuildDate>' + new Date().toUTCString() + '</lastBuildDate>\n' + items + '\n</channel></rss>\n';
fs.writeFileSync(out, xml);
console.log('lettre.xml :', (xml.match(/<item>/g) || []).length, 'éditions');
