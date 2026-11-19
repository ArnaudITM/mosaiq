// Génère le flux RSS de la lettre du matin (data/lettre.xml) à partir des dernières éditions.
// Usage : node tools/lettre.js <dossier des éditions (contenant index.json)> <fichier de sortie>
// Le service d'envoi (Brevo, intégration « RSS Campaign ») lit ce flux chaque matin et envoie la lettre aux abonnés.
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || 'data/editions', out = process.argv[3] || 'data/lettre.xml';
const SITE = 'https://mosaiq.news/';
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const RUBS = [['france', 'France'], ['afrique', 'Afrique'], ['eco', 'Économie'], ['tech', 'Tech & Sciences'], ['culture', 'Culture'], ['outremer', 'Outre-mer']];
const idx = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
const items = idx.editions.slice(0, 7).map(ix => {
  let e; try { e = JSON.parse(fs.readFileSync(path.join(dir, ix.date + '.json'), 'utf8')); } catch (err) { return ''; }
  const link = SITE + '#edition-' + ix.date;
  const st = 'color:#5b6270;font-size:13px;letter-spacing:.06em;text-transform:uppercase;margin:22px 0 6px';
  let h = '<p style="font-size:17px;line-height:1.5">' + esc(e.une && e.une.chapeau) + '</p>';
  if (e.geopolitique && e.geopolitique.length) {
    h += '<p style="' + st + '"><b>Géopolitique · regards croisés</b></p><ul>' + e.geopolitique.map(g => '<li><a href="' + SITE + '#g-' + esc(g.id) + '">' + esc(g.titre) + '</a></li>').join('') + '</ul>';
  }
  RUBS.forEach(([id, nom]) => {
    const A = (e.articles || []).filter(a => a.rubrique === id);
    if (!A.length) return;
    h += '<p style="' + st + '"><b>' + nom + '</b></p><ul>' + A.map(a => '<li><a href="' + SITE + '#a-' + esc(a.id) + '">' + esc(a.titre) + '</a>' + (a.resume ? '<br><span style="color:#5b6270">' + esc(a.resume) + '</span>' : '') + '</li>').join('') + '</ul>';
  });
  const sb = (e.sport && e.sport.breves) || [];
  if (sb.length) h += '<p style="' + st + '"><b>Sport</b></p><ul>' + sb.map(b => '<li><b>' + esc(b.discipline || '') + '</b> · ' + esc(b.titre) + '</li>').join('') + '</ul>';
  h += '<p style="margin-top:24px"><a href="' + link + '"><b>Lire l\'édition complète sur mosaiq.news →</b></a></p>';
  h += '<p style="color:#8a909c;font-size:12px">Textes rédigés avec l\'aide d\'une intelligence artificielle à partir des sources citées sur le site. <a href="' + SITE + '#methode">Notre méthode</a>.</p>';
  const d = new Date(ix.date + 'T06:00:00+01:00');
  return '<item><title>' + esc('Mosaiq du ' + (ix.date_longue || ix.date).replace(/^./, c => c.toLowerCase()) + ' : ' + ix.titre) + '</title><link>' + esc(link) + '</link><guid isPermaLink="false">mosaiq-' + ix.date + '</guid><pubDate>' + d.toUTCString() + '</pubDate><description><![CDATA[' + h.replace(/]]>/g, ']]&gt;') + ']]></description></item>';
}).filter(Boolean).join('\n');
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Mosaiq — la lettre du matin</title><link>' + SITE + '</link><description>Le monde à 7 h. Tous les regards. L\'essentiel de l\'édition du jour.</description><language>fr</language><lastBuildDate>' + new Date().toUTCString() + '</lastBuildDate>\n' + items + '\n</channel></rss>\n';
fs.writeFileSync(out, xml);
console.log('lettre.xml :', (xml.match(/<item>/g) || []).length, 'éditions');
