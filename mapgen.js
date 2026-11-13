// Génère une carte SVG inline (monde ou Afrique) avec pays surlignés et pastilles numérotées.
// Usage : node mapgen.js config.json > out.svg
// config = { region: "world" | "europe" | "africa", color: "var(--c-fr)", highlights: [ {name: "France", n: 1}, ... ] }
// Les noms suivent world-atlas 110m (ex. "United States of America", "Dem. Rep. Congo", "Burkina Faso", "South Africa").
// Dépendances : npm i d3-geo@3 topojson-client@3 world-atlas@2
const fs = require('fs');
const d3 = require('d3-geo');
const topo = require('topojson-client');
const world = require('world-atlas/countries-110m.json');
const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const all = topo.feature(world, world.objects.countries).features;
const W = cfg.region === 'africa' ? 360 : 640, H = cfg.region === 'africa' ? 380 : (cfg.region === 'europe' ? 400 : 330);
let proj, feats = all.filter(f => f.properties.name !== 'Antarctica');
if (cfg.region === 'africa') {
  const AFR = ['Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cameroon','Central African Rep.','Chad','Congo','Dem. Rep. Congo',"Côte d'Ivoire",'Djibouti','Egypt','Eq. Guinea','Eritrea','eSwatini','Ethiopia','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau','Kenya','Lesotho','Liberia','Libya','Madagascar','Malawi','Mali','Mauritania','Morocco','Mozambique','Namibia','Niger','Nigeria','Rwanda','Senegal','Sierra Leone','Somalia','Somaliland','South Africa','S. Sudan','Sudan','Tanzania','Togo','Tunisia','Uganda','W. Sahara','Zambia','Zimbabwe'];
  const afr = { type: 'FeatureCollection', features: all.filter(f => AFR.includes(f.properties.name)) };
  proj = d3.geoMercator().fitExtent([[6, 6], [W - 6, H - 6]], afr);
} else if (cfg.region === 'europe') {
  // Europe + Moyen-Orient, de l'Atlantique à l'Iran
  const box = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-12, 22], [-12, 62], [62, 62], [62, 22], [-12, 22]]] } };
  proj = d3.geoConicConformal().rotate([-22, 0]).parallels([35, 60]).fitExtent([[0, 0], [W, H]], box).clipExtent([[0, 0], [W, H]]);
} else {
  proj = d3.geoNaturalEarth1().fitExtent([[4, 4], [W - 4, H - 4]], { type: 'Sphere' });
}
const path = d3.geoPath(proj);
const hi = new Map(cfg.highlights.map(h => [h.name, h]));
const missing = cfg.highlights.filter(h => !all.some(f => f.properties.name === h.name));
if (missing.length) console.error('Introuvable :', missing.map(m => m.name).join(', '));
let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${cfg.highlights.map(h => h.label || h.name).join(', ')}">`;
if (cfg.region === 'europe') s += `<rect width="${W}" height="${H}" fill="var(--sea)"/>`;
else if (cfg.region !== 'africa') s += `<path d="${path({ type: 'Sphere' })}" fill="var(--sea)" stroke="none"/>`;
for (const f of feats) {
  const d = path(f); if (!d) continue;
  const on = hi.has(f.properties.name);
  s += `<path d="${d}" fill="${on ? cfg.color : 'var(--land)'}" stroke="var(--surface)" stroke-width="${on ? 0.8 : 0.5}"/>`;
}
const K = W / 360; // pastilles lisibles quelle que soit la largeur de la carte
for (const h of cfg.highlights) {
  if (h.n == null) continue; // pays surligné sans pastille
  const f = all.find(x => x.properties.name === h.name); if (!f) continue;
  let [x, y] = h.at ? proj(h.at) : path.centroid(f);
  if (!isFinite(x)) continue;
  s += `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(9*K).toFixed(1)}" fill="var(--ink)" stroke="var(--surface)" stroke-width="${(2*K).toFixed(1)}"/><text x="${x.toFixed(1)}" y="${(y + 3.8*K).toFixed(1)}" text-anchor="middle" font-size="${(10.5*K).toFixed(1)}" font-weight="700" fill="var(--surface)">${h.n}</text></g>`;
}
s += '</svg>';
// arrondi des coordonnées pour alléger
process.stdout.write(s.replace(/(\d+\.\d)\d+/g, '$1'));
