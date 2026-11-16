// Usage : node tools/regions-project.js in.json out.json
// Projette lieu.lon/lat des brèves régionales dans l'espace 600x600 de data/regions.svg (ajoute lieu.x, lieu.y).
const path=require('path'),fs=require('fs');let d3;try{d3=require('d3-geo');}catch(e){d3=require(path.join(process.cwd(),'node_modules','d3-geo'));}
const g=JSON.parse(fs.readFileSync(path.join(__dirname,'regions.geojson')));
const proj=d3.geoConicConformal().parallels([44,49]).rotate([-3,0]).fitExtent([[10,10],[590,590]],g);
const [inp,outp]=process.argv.slice(2);const L=JSON.parse(fs.readFileSync(inp));const A=Array.isArray(L)?L:L.regions;
A.forEach(b=>{if(b.lieu&&b.lieu.lon!=null){const p=proj([b.lieu.lon,b.lieu.lat]);b.lieu.x=+p[0].toFixed(1);b.lieu.y=+p[1].toFixed(1);}});
fs.writeFileSync(outp,JSON.stringify(L));console.log(A.length+' brèves projetées');
