// Fond de carte monde : un <path data-n="Nom world-atlas"> par pays, pour zoomer côté navigateur.
const d3=require('d3-geo'),topo=require('topojson-client'),world=require('world-atlas/countries-110m.json');
const f=topo.feature(world,world.objects.countries).features.filter(x=>x.properties.name!=='Antarctica');
const W=1000,H=520,proj=d3.geoNaturalEarth1().fitExtent([[0,0],[W,H]],{type:'FeatureCollection',features:f}),path=d3.geoPath(proj);
let s=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
for(const c of f){const d=path(c);if(!d)continue;
  // boîte du plus grand morceau (évite que la Guyane ou l'Alaska élargissent le zoom)
  let g=c.geometry,main=g;if(g.type==='MultiPolygon'){let best=0;for(const poly of g.coordinates){const a=path.area({type:'Polygon',coordinates:poly});if(a>best){best=a;main={type:'Polygon',coordinates:poly};}}}
  const [[x0,y0],[x1,y1]]=path.bounds(main);
  s+=`<path data-n="${c.properties.name.replace(/"/g,'')}" data-b="${[x0,y0,x1-x0,y1-y0].map(v=>v.toFixed(1)).join(',')}" d="${d.replace(/(\d+\.\d)\d+/g,'$1')}"/>`;}
process.stdout.write(s+'</svg>');
