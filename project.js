// Projette des coordonnées [lon,lat] dans le repère du fond de carte monde (data/monde.svg, 1000×520) : node project.js in.json out.json
// Traite d.carte.points (dossier) et d.articles[].lieu (articles avec un lieu précis, ex. Outre-mer).
const fs=require('fs'),d3=require('d3-geo'),topo=require('topojson-client'),world=require('world-atlas/countries-110m.json');
const f=topo.feature(world,world.objects.countries).features.filter(x=>x.properties.name!=='Antarctica');
const proj=d3.geoNaturalEarth1().fitExtent([[0,0],[1000,520]],{type:'FeatureCollection',features:f});
const d=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const put=p=>{const [x,y]=proj([p.lon,p.lat]);p.x=+x.toFixed(1);p.y=+y.toFixed(1);};
if(d.carte&&d.carte.points)d.carte.points.forEach(put);
if(d.articles)d.articles.forEach(a=>{if(a.lieu&&a.lieu.lon!=null)put(a.lieu);});
fs.writeFileSync(process.argv[3],JSON.stringify(d));
