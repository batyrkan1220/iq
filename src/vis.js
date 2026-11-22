/* ===== Visual reasoning items (quiz2-style formats, original content) ===== */
const VINK='#1f2433',VACC='#4f46e5',VGR='#d5d9e3',VSOFT='#f3f4f8';
const vcell=(x,y,w,h,inner,q)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${q?'#fff':VSOFT}" stroke="${q?VACC:'#e3e6ee'}" stroke-width="${q?3:1.5}"${q?' stroke-dasharray="7 6"':''}/>`+(q?`<text x="${x+w/2}" y="${y+h/2+12}" text-anchor="middle" font-size="34" font-weight="800" fill="${VACC}" font-family="Manrope,Arial">?</text>`:inner);
// 3×3 matrix; cells[r][c] = fn(cx,cy) → svg (null = «?»)
function vMatrix(cells){let s=`<svg class="matrix" viewBox="0 0 330 330">`;for(let r=0;r<3;r++)for(let c=0;c<3;c++){const x=10+c*105,y=10+r*105,f=cells[r][c];s+=vcell(x,y,100,100,f?f(x+50,y+50):'',!f)}return s+'</svg>'}
// 2×2 analogy A→B, C→?
function vAna(a,b,c){let s=`<svg class="matrix" viewBox="0 0 330 230">`;const ar=(y)=>`<path d="M150 ${y}h22m-8-7l8 7-8 7" fill="none" stroke="#9aa0b4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  s+=vcell(25,10,100,100,a(75,60))+ar(60)+vcell(195,10,100,100,b(245,60))+vcell(25,120,100,100,c(75,170))+ar(170)+vcell(195,120,100,100,'',1);return s+'</svg>'}
// horizontal row of cards, last = «?»
function vRow(items){const n=items.length+1,w=66,g=12,x0=(330-(n*w+(n-1)*g))/2;let s=`<svg class="matrix" viewBox="0 0 330 120">`;
  items.forEach((f,i)=>{const x=x0+i*(w+g);s+=vcell(x,10,w,100,f(x+w/2,60))});s+=vcell(x0+(n-1)*(w+g),10,w,100,'',1);return s+'</svg>'}
const vopt=(f)=>`<svg viewBox="0 0 100 100" width="80" height="80" style="vertical-align:middle">${f(50,50)}</svg>`;
// primitives
const vDot=(dx,dy)=>(cx,cy)=>`<rect x="${cx-32}" y="${cy-32}" width="64" height="64" rx="12" fill="#fff" stroke="${VINK}" stroke-width="2.5"/><circle cx="${cx+dx*20}" cy="${cy+dy*20}" r="7.5" fill="${VACC}"/>`;
const vLine=(a)=>(cx,cy)=>`<line x1="${cx-26}" y1="${cy}" x2="${cx+26}" y2="${cy}" stroke="${VINK}" stroke-width="6" stroke-linecap="round" transform="rotate(${a} ${cx} ${cy})"/>`;
function vShape(k,cx,cy,sz,fill){const h=sz/2;if(k==='c')return `<circle cx="${cx}" cy="${cy}" r="${h}" ${fill}/>`;if(k==='s')return `<rect x="${cx-h}" y="${cy-h}" width="${sz}" height="${sz}" rx="3" ${fill}/>`;return `<polygon points="${cx},${cy-h} ${cx+h},${cy+h*.8} ${cx-h},${cy+h*.8}" ${fill}/>`}
const vCount=(k,n,rot)=>(cx,cy)=>{let s='';const sz=n>2?20:24,gap=sz+6,x0=cx-(n-1)*gap/2;for(let i=0;i<n;i++)s+=`<g transform="rotate(${rot||0} ${x0+i*gap} ${cy})">${vShape(k,x0+i*gap,cy,sz,`fill="${VINK}"`)}</g>`;return s};
const vFill=(k,mode)=>(cx,cy)=>{const id='h'+Math.random().toString(36).slice(2,7),sz=56,h=sz/2;
  const clip=`<clipPath id="${id}"><rect x="${mode==='R'?cx:cx-h-4}" y="${cy-h-4}" width="${h+4}" height="${sz+8}"/></clipPath>`;
  const out=vShape(k,cx,cy,sz,`fill="none" stroke="${VINK}" stroke-width="3.5"`);
  if(mode==='F')return vShape(k,cx,cy,sz,`fill="${VINK}" stroke="${VINK}" stroke-width="3.5"`);if(mode==='E')return out;
  return `<defs>${clip}</defs><g clip-path="url(#${id})">${vShape(k,cx,cy,sz,`fill="${VINK}"`)}</g>`+out};
const vArrow=(a,big)=>(cx,cy)=>{const s=big?1.7:1;return `<g transform="translate(${cx} ${cy}) rotate(${a}) scale(${s})"><path d="M0 -30 L24 -4 L9 -4 L9 28 L-9 28 L-9 -4 L-24 -4 Z" fill="${big?'#dfe3ec':VINK}" stroke="${VINK}" stroke-width="${big?2.2:0}" stroke-linejoin="round"/></g>`};
const PIPS={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]};
const vDie=(n)=>(cx,cy)=>`<rect x="${cx-30}" y="${cy-30}" width="60" height="60" rx="12" fill="#fff" stroke="${VINK}" stroke-width="3"/>`+PIPS[n].map(([x,y])=>`<circle cx="${cx+x*15}" cy="${cy+y*15}" r="5.5" fill="${VINK}"/>`).join('');
// folded corner: c = 0 TL,1 TR,2 BR,3 BL ; big = solid triangle distractor
const vFold=(cs,big)=>(cx,cy)=>{const h=30,f=big?30:16;let s=`<rect x="${cx-h}" y="${cy-h}" width="${2*h}" height="${2*h}" rx="4" fill="#fff" stroke="${VINK}" stroke-width="3"/>`;
  cs.forEach(c=>{const sx=c===1||c===2?1:-1,sy=c===2||c===3?1:-1,X=cx+sx*h,Y=cy+sy*h;s+=`<polygon points="${X},${Y-sy*f} ${X-sx*f},${Y} ${X-sx*f},${Y-sy*f}" fill="#c9ced9" stroke="${VINK}" stroke-width="2" stroke-linejoin="round"/>`});return s};
const vRing=(r,w,full)=>(cx,cy)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${full?VINK:'none'}" stroke="${VINK}" stroke-width="${w}"/>`;
const vFlower=(ps)=>(cx,cy)=>{let s='';for(let k=0;k<5;k++){const an=(-90+72*k)*Math.PI/180,x=cx+Math.cos(an)*22,y=cy+Math.sin(an)*22;s+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12" fill="${ps.includes(k)?VINK:'#fff'}" stroke="${VINK}" stroke-width="2.5"/>`}return s};

const VIS=[
 {cat:'logic',q:'Какая плитка стоит на месте «?»',main:()=>vMatrix([[vDot(-1,-1),vDot(0,-1),vDot(1,-1)],[vDot(-1,0),vDot(0,0),null],[vDot(-1,1),vDot(0,1),vDot(1,1)]]),
  opts:[vDot(1,0),vDot(1,-1),vDot(1,1),vDot(0,0),vDot(-1,0),vDot(0,1)],a:0,
  ex:'В каждой строке точка сдвигается слева направо, а в каждом столбце — сверху вниз. На месте «?» точка должна быть справа посередине.'},
 {cat:'spat',q:'Какая линия продолжает ряд?',main:()=>vRow([vLine(0),vLine(45),vLine(90)]),
  opts:[vLine(135),vLine(45),vLine(90),vLine(0),vLine(120),vLine(160)],a:0,
  ex:'Линия каждый раз поворачивается на 45° по часовой стрелке: 0° → 45° → 90° → 135°.'},
 {cat:'num',q:'Какая клетка дополняет таблицу?',main:()=>vMatrix([[vCount('c',3),vCount('c',2),vCount('c',1)],[vCount('t',3),vCount('t',2),null],[vCount('s',3),vCount('s',2),vCount('s',1)]]),
  opts:[vCount('t',1),vCount('t',2),vCount('t',1,180),vCount('c',1),vCount('s',1),vCount('t',3)],a:0,
  ex:'В каждой строке одна и та же фигура, а количество уменьшается: 3 → 2 → 1. Во второй строке — один треугольник.'},
 {cat:'spat',q:'Какая клетка дополняет таблицу?',main:()=>vMatrix([[vFill('c','F'),vFill('c','H'),vFill('c','E')],[vFill('t','F'),vFill('t','H'),vFill('t','E')],[vFill('s','F'),null,vFill('s','E')]]),
  opts:[vFill('s','H'),vFill('s','R'),vFill('s','F'),vFill('s','E'),vFill('c','H'),vFill('t','H')],a:0,
  ex:'В каждом столбце одинаковая заливка: полная → половина → пустая, а в каждой строке одна фигура. Значит, нужен квадрат, закрашенный наполовину слева.'},
 {cat:'spat',q:'Какой будет эта стрелка, если повернуть её на 135° по часовой стрелке?',main:()=>`<svg class="matrix" viewBox="0 0 330 160"><rect x="0" y="0" width="330" height="160" rx="16" fill="${VSOFT}"/>${vArrow(0,1)(165,82)}</svg>`,
  opts:[vArrow(135),vArrow(45),vArrow(225),vArrow(90),vArrow(180),vArrow(315)],a:0,
  ex:'Стрелка смотрела вверх. Поворот на 90° по часовой — вправо, ещё на 45° — вправо-вниз.'},
 {cat:'num',q:'Какой кубик стоит на месте «?»',main:()=>vMatrix([[vDie(6),vDie(5),vDie(4)],[vDie(5),vDie(4),vDie(3)],[vDie(4),vDie(3),null]]),
  opts:[vDie(2),vDie(1),vDie(3),vDie(5),vDie(4),vDie(6)],a:0,
  ex:'В каждой строке число точек уменьшается на 1, и каждая строка начинается на 1 меньше предыдущей: 4 → 3 → 2.'},
 {cat:'logic',q:'Первая пара фигур связана по правилу. Какая фигура продолжает вторую пару?',main:()=>vAna(vFold([1]),vFold([2]),vFold([3])),
  opts:[vFold([0]),vFold([1]),vFold([2]),vFold([3]),vFold([0,2]),vFold([0],1)],a:0,
  ex:'Загнутый уголок поворачивается на 90° по часовой стрелке: из правого верхнего угла — в правый нижний. Из левого нижнего он переходит в левый верхний.'},
 {cat:'spat',q:'Какой круг стоит на месте «?»',main:()=>vMatrix([[vRing(14,2),vRing(22,2),null],[vRing(14,4),vRing(22,4),vRing(32,4)],[vRing(14,7),vRing(22,7),vRing(32,7)]]),
  opts:[vRing(32,2),vRing(32,7),vRing(22,2),vRing(32,4),vRing(14,2),vRing(32,2,1)],a:0,
  ex:'Слева направо круг становится больше, а сверху вниз линия становится толще. В первой строке — самый большой круг с самой тонкой линией.'},
 {cat:'logic',q:'Первая пара фигур связана по правилу. Какая фигура продолжает вторую пару?',main:()=>vAna(vFlower([0]),vFlower([2]),vFlower([1])),
  opts:[vFlower([3]),vFlower([1]),vFlower([2]),vFlower([4]),vFlower([0]),vFlower([1,3])],a:0,
  ex:'Тёмный кружок сдвигается на две позиции по часовой стрелке. Во второй паре он тоже сдвигается на две позиции.'}
];
