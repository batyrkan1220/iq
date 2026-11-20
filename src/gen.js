/* ===== Matrix puzzle generator (original rules) ===== */
const INK='#111111';
const ACC='#111111';
const FILLS=['#ffffff','#b8bcc6','#111111'];
const DEFS=`<defs><linearGradient id="gA"><stop offset="0" stop-color="#111"/></linearGradient><linearGradient id="gL"><stop offset="0" stop-color="#fff"/></linearGradient><linearGradient id="gD"><stop offset="0" stop-color="#111"/></linearGradient><linearGradient id="gS"><stop offset="0" stop-color="#111"/></linearGradient><filter id="sh"><feOffset dx="0" dy="0"/></filter></defs>`;
const SH=['circle','square','triangle','diamond','pentagon','hexagon'];
function mkR(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const pick=(R,a)=>a[Math.floor(R()*a.length)];
const perm=(R,a)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const ri=(R,a,b)=>a+Math.floor(R()*(b-a+1));

function poly(n,cx,cy,r,rot){rot=rot==null?-90:rot;const p=[];for(let i=0;i<n;i++){const a=(rot+i*360/n)*Math.PI/180;p.push((cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1))}return p.join(' ')}
function shp(t,cx,cy,r,fill){
  const sw=r<14?0:2.4,st=`stroke="${sw?INK:'none'}" stroke-width="${sw}" stroke-linejoin="round" fill="${fill}" filter="url(#sh)"`;
  if(t==='circle')return `<circle cx="${cx}" cy="${cy}" r="${r}" ${st}/>`;
  if(t==='square')return `<rect x="${cx-r*.85}" y="${cy-r*.85}" width="${r*1.7}" height="${r*1.7}" rx="${r*.22}" ${st}/>`;
  const n={triangle:3,diamond:4,pentagon:5,hexagon:6}[t];
  return `<polygon points="${poly(n,cx,cy+(n===3?r*.15:0),r)}" ${st}/>`;
}
const POS={1:[[0,0]],2:[[-17,0],[17,0]],3:[[-28,0],[0,0],[28,0]],4:[[-16,-16],[16,-16],[-16,16],[16,16]],5:[[-27,-15],[0,-15],[27,-15],[-13.5,15],[13.5,15]]};
const rotMask=(m,k)=>{k=((k%4)+4)%4;return((m<<k)|(m>>(4-k)))&15};
const bits=m=>{let c=0;while(m){c+=m&1;m>>=1}return c};

const FAM={
 count:{
  gen(R,o){const S=perm(R,SH).slice(0,3);return(r,c)=>({s:S[r],n:o.latin?((r+c)%3)+1:c+1})},
  render:(v,x,y)=>POS[v.n].map(([dx,dy])=>shp(v.s,x+dx,y+dy,11.5,'url(#gS)')).join(''),
  mut:(v,R)=>R()<.6?{...v,n:ri(R,1,5)}:{...v,s:pick(R,SH)},
  ex:o=>o.latin?'В каждой строке одна фигура, а количество фигур (1, 2, 3) встречается в каждой строке и столбце ровно один раз.':'В каждой строке одна и та же фигура, а количество растёт слева направо: 1, 2, 3.'
 },
 sides:{
  gen(R,o){const f=pick(R,[1,2]);return(r,c)=>({n:3+r+c,f})},
  render:(v,x,y)=>`<polygon points="${poly(v.n,x,y,33)}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" fill="${FILLS[v.f]}" filter="url(#sh)"/>`,
  mut:(v,R)=>({...v,n:ri(R,3,9)}),
  ex:()=>'Число сторон многоугольника = 3 + номер строки + номер столбца (с нуля). В правом нижнем углу — семиугольник.'
 },
 size:{
  gen(R){const S=perm(R,SH).slice(0,3),Z=[11,20,31];const inc=R()<.5;return(r,c)=>({s:S[(r+c)%3],z:Z[inc?c:2-c]})},
  render:(v,x,y)=>shp(v.s,x,y,v.z,v.z<14?'url(#gS)':'url(#gL)'),
  mut:(v,R)=>R()<.5?{...v,z:pick(R,[11,20,31])}:{...v,s:pick(R,SH)},
  ex:()=>'Размер фигуры зависит от столбца, а каждая форма встречается в строке и столбце по одному разу.'
 },
 rotate:{
  gen(R,o){const a0=pick(R,[0,45,90,135,180,225,270,315]);return o.two?(r,c)=>({a:(a0+r*45+c*90)%360}):(r,c)=>({a:(a0+(r*3+c)*45)%360})},
  render:(v,x,y)=>`<g transform="rotate(${v.a} ${x} ${y})" filter="url(#sh)"><path d="M${x-6} ${y+27} L${x-6} ${y-10} L${x-16} ${y-10} L${x} ${y-32} L${x+16} ${y-10} L${x+6} ${y-10} L${x+6} ${y+27} Z" fill="url(#gA)" stroke="url(#gA)" stroke-width="3" stroke-linejoin="round"/></g>`,
  mut:(v,R)=>({a:pick(R,[0,45,90,135,180,225,270,315])}),
  ex:o=>o.two?'Вправо по строке стрелка поворачивается на 90°, а каждая следующая строка начинается с поворота на 45°.':'Читая слева направо и сверху вниз, каждая следующая стрелка поворачивается на 45° по часовой стрелке.'
 },
 latin:{
  gen(R){const S=perm(R,SH).slice(0,3),F=perm(R,[0,1,2]);return(r,c)=>({s:S[(r+c)%3],f:F[(r+2*c)%3]})},
  render:(v,x,y)=>shp(v.s,x,y,26,FILLS[v.f]),
  mut:(v,R)=>R()<.5?{...v,f:ri(R,0,2)}:{...v,s:pick(R,SH)},
  ex:()=>'Каждая форма и каждая заливка (белая, серая, чёрная) встречается в каждой строке и каждом столбце ровно один раз.'
 },
 corner:{
  gen(R){const off=ri(R,0,3),d=pick(R,[1,-1]),o2=ri(R,0,2);return(r,c)=>({p:((off+d*(r+c))%4+4)%4,l:(r+2*c+o2)%3})},
  render(v,x,y){const P=[[-19,-19],[19,-19],[19,19],[-19,19]];let s=shp('square',x,y,37,'#fff');
    if(v.l===1)s+=`<line x1="${x-24}" y1="${y}" x2="${x+24}" y2="${y}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
    if(v.l===2)s+=`<line x1="${x}" y1="${y-24}" x2="${x}" y2="${y+24}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
    return s+`<circle cx="${x+P[v.p][0]}" cy="${y+P[v.p][1]}" r="7.5" fill="#111"/>`},
  mut:(v,R)=>R()<.5?{...v,p:ri(R,0,3)}:{...v,l:ri(R,0,2)},
  ex:()=>'Два правила сразу: точка в каждой следующей клетке переходит в соседний угол (по кругу), а линия (нет / горизонтальная / вертикальная) встречается в каждой строке и столбце по одному разу.'
 },
 quad:{
  gen(R,o){const d=o.d||1;const B=[0,1,2].map(()=>{let m=0;while(bits(m)<1||bits(m)>2||m===5||m===10)m=ri(R,1,14);return m});return(r,c)=>({m:rotMask(B[r],c*d)})},
  render(v,x,y){let s='';for(let k=0;k<4;k++){const a1=(k*90-90)*Math.PI/180,a2=(k*90)*Math.PI/180,R=32;
    s+=`<path d="M${x} ${y} L${(x+R*Math.cos(a1)).toFixed(1)} ${(y+R*Math.sin(a1)).toFixed(1)} A${R} ${R} 0 0 1 ${(x+R*Math.cos(a2)).toFixed(1)} ${(y+R*Math.sin(a2)).toFixed(1)} Z" fill="${(v.m>>k)&1?'#111':'#fff'}" stroke="#111" stroke-width="2.4" stroke-linejoin="round"/>`}return s},
  mut:(v,R)=>R()<.6?{m:rotMask(v.m,ri(R,1,3))}:{m:v.m^(1<<ri(R,0,3))},
  ex:o=>`В каждой строке закрашенные сектора поворачиваются на четверть круга ${(o.d||1)===1?'по часовой стрелке':'против часовой стрелки'} с каждым шагом вправо.`
 },
 nest:{
  gen(R){const S=perm(R,SH),O=S.slice(0,3),I=S.slice(3,6);return(r,c)=>({o:O[(r+c)%3],i:I[(r+2*c)%3]})},
  render:(v,x,y)=>shp(v.o,x,y,34,'url(#gL)')+shp(v.i,x,y,12,'url(#gS)'),
  mut:(v,R)=>R()<.5?{...v,o:pick(R,SH)}:{...v,i:pick(R,SH)},
  ex:()=>'Внешняя и внутренняя фигуры подчиняются разным правилам: каждая из них встречается в каждой строке и каждом столбце ровно один раз.'
 },
 cfill:{
  gen(R){const s=pick(R,SH),F=perm(R,[0,1,2]);return(r,c)=>({s,n:c+1,f:F[(r+2*c)%3]})},
  render:(v,x,y)=>POS[v.n].map(([dx,dy])=>shp(v.s,x+dx,y+dy,11.5,FILLS[v.f]).replace('stroke="none" stroke-width="0"','stroke="'+INK+'" stroke-width="2"')).join(''),
  mut:(v,R)=>R()<.5?{...v,n:ri(R,1,4)}:{...v,f:ri(R,0,2)},
  ex:()=>'Количество фигур растёт по столбцам (1, 2, 3), а цвет заливки встречается в каждой строке и столбце по одному разу.'
 },
 logic:{ // op: xor | or | and on 8 radial strokes
  gen(R,o){const op={xor:(a,b)=>a^b,or:(a,b)=>a|b,and:(a,b)=>a&b}[o.op];const rows=[];
    for(let r=0;r<3;r++){let a,b,ok=false;while(!ok){a=ri(R,1,255);b=ri(R,1,255);const ba=bits(a),bb=bits(b),ab=bits(a&b);
      ok=ba>=3&&ba<=5&&bb>=3&&bb<=5&&ab>=1&&ab<=2&&a!==b&&op(a,b)!==0}
      rows.push([a,b,op(a,b)])}
    return(r,c)=>({m:rows[r][c]})},
  render(v,x,y){let s=`<circle cx="${x}" cy="${y}" r="37" fill="#fff" stroke="#111" stroke-width="2.4"/>`;
    for(let k=0;k<8;k++)if((v.m>>k)&1){const a=k*45*Math.PI/180;s+=`<line x1="${x}" y1="${y}" x2="${(x+33*Math.sin(a)).toFixed(1)}" y2="${(y-33*Math.cos(a)).toFixed(1)}" stroke="#111" stroke-width="4" stroke-linecap="round"/>`}
    return s+`<circle cx="${x}" cy="${y}" r="4.5" fill="${INK}"/>`},
  mut:(v,R)=>{let m=v.m^(1<<ri(R,0,7));if(R()<.4)m^=(1<<ri(R,0,7));return{m:m||1}},
  ex:o=>({xor:'Третья клетка строки получается наложением первых двух, при этом совпадающие линии исчезают, а остаются только несовпадающие.',
          or:'Третья клетка строки — наложение первых двух: в ней все линии из первой и второй клеток.',
          and:'В третьей клетке строки остаются только те линии, которые есть одновременно в первой и во второй клетке.'})[o.op]
 }
};

const PLAN=[
 ['count',{},11],['sides',{},12],['size',{},13],['rotate',{},14],['latin',{},15],['quad',{d:1},17],
 ['count',{latin:1},16],['nest',{},18],['logic',{op:'or'},19],['corner',{},20],['cfill',{},22],['rotate',{two:1},21],
 ['logic',{op:'xor'},24],['quad',{d:-1},25],['logic',{op:'and'},27],['corner',{},28],['logic',{op:'xor'},31],['logic',{op:'and'},36]
];
const key=v=>JSON.stringify(v);
function buildQuestions(){
  return PLAN.map(([fam,o,seed])=>{
    const F=FAM[fam],R=mkR(seed*7919),fn=F.gen(R,o);
    const cells=[0,1,2].map(r=>[0,1,2].map(c=>fn(r,c)));
    const ans=cells[2][2],seen=new Set([key(ans)]),opts=[ans];
    if(fam==='logic'){const[a,b]=[cells[2][0].m,cells[2][1].m];[a^b,a|b,a&b,a,b].forEach(m=>{if(m&&!seen.has(key({m}))&&opts.length<6){seen.add(key({m}));opts.push({m})}})}
    let guard=0;while(opts.length<6&&guard++<500){const m=F.mut(ans,R);if(!seen.has(key(m))){seen.add(key(m));opts.push(m)}}
    const order=perm(mkR(seed*104729+13),[0,1,2,3,4,5]);
    return{fam,o,cells,opts:order.map(i=>opts[i]),a:order.indexOf(0),ex:F.ex(o)};
  });
}
if(typeof module!=='undefined')module.exports={buildQuestions,FAM};
