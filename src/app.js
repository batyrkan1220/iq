/* ===== App ===== */
let PRICE='';
let FREE=true; // admin-managed: /api/pay/config → paywall_enabled + price_kzt (Render server)
function fmtKzt(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,' ')+' ₸'}
const PAYCFG=fetch('/api/pay/config',{cache:'no-store'}).then(r=>r.json()).then(c=>{if(c&&c.enabled&&c.priceKzt){FREE=false;PRICE=fmtKzt(c.priceKzt);document.querySelectorAll('.price').forEach(e=>e.textContent=PRICE)}}).catch(()=>{});
const TEXT=[
 {cat:'attn',q:'У фермера 15 овец. Все, кроме 8, погибли. Сколько овец осталось?',o:['7','8','15','0','3'],a:1,ex:'«Все, кроме 8» означает, что выжили ровно 8 овец. Вопрос проверяет внимательность к формулировке.'},
 {cat:'num',q:'Какого числа не хватает?\n5, 10, 15, 20, __, 30',o:['22','24','25','26','28'],a:2,ex:'Каждое число больше предыдущего на 5: 20 + 5 = 25.'},
 {cat:'num',q:'Какое число следующее?\n3, 6, 11, 18, 27, …',o:['36','38','39','40'],a:1,ex:'Разница растёт на 2: +3, +5, +7, +9, затем +11. 27 + 11 = 38.'},
 {cat:'attn',q:'У Маши три брата. У каждого брата есть одна сестра. Сколько всего детей в семье?',o:['4','6','7','5'],a:0,ex:'Единственная сестра у всех братьев — это сама Маша. Итого 3 брата + Маша = 4.'},
 {cat:'logic',q:'Во время забега вы обогнали бегуна, который бежал вторым. Каким вы стали?',o:['Первым','Вторым','Третьим','Последним'],a:1,ex:'Вы заняли место того, кого обогнали, — второе. Первым вы не стали: впереди всё ещё лидер.'},
 {cat:'verb',q:'Какое слово лишнее?',o:['Кит','Дельфин','Акула','Тюлень','Морж'],a:2,ex:'Акула — рыба. Кит, дельфин, тюлень и морж — морские млекопитающие.'},
 {cat:'logic',q:'Кувшинки на озере каждый день удваивают свою площадь. За 48 дней они покрывают всё озеро. За сколько дней кувшинки покроют половину озера?',o:['24','47','46','36'],a:1,ex:'Площадь удваивается каждый день, значит за день до полного покрытия — на 47-й день — была покрыта ровно половина.'},
 {cat:'spat',q:'Сколько рёбер у куба?',o:['6','8','10','12','16'],a:3,ex:'У куба 4 ребра сверху, 4 снизу и 4 вертикальных — всего 12.'},
 {cat:'num',q:'Какое число следующее?\n2, 3, 5, 9, 17, …',o:['25','31','33','34'],a:2,ex:'Каждое следующее число = предыдущее × 2 − 1: 17 × 2 − 1 = 33.'},
 {cat:'num',q:'Какое число лишнее?\n3, 5, 7, 9, 11, 13',o:['3','9','11','13','7'],a:1,ex:'Все числа, кроме 9, — простые: делятся только на 1 и на самих себя. А 9 делится на 3.'},
 {cat:'logic',q:'Ручка и тетрадь вместе стоят 1 100 ₸. Ручка дороже тетради на 1 000 ₸. Сколько стоит тетрадь?',o:['100 ₸','50 ₸','1 000 ₸','550 ₸'],a:1,ex:'Если тетрадь стоит x, то ручка — x + 1000. Вместе: 2x + 1000 = 1100 → x = 50 ₸. Ответ «100 ₸» — интуитивная ловушка.'},
 {cat:'num',q:'Какое число следующее?\n2, 6, 12, 20, 30, …',o:['36','40','42','44'],a:2,ex:'Разница растёт на 2: +4, +6, +8, +10, затем +12. 30 + 12 = 42.'},
 {cat:'verb',q:'Какая буква следующая?\nA, C, F, J, …',o:['O','N','M','P','K'],a:0,ex:'Шаг между буквами растёт: +2, +3, +4, затем +5. J + 5 = O.'},
 {cat:'num',q:'Какое число следующее?\n4, 20, 6, 18, 8, 16, …',o:['10','14','12','9','18'],a:0,ex:'Здесь чередуются два ряда: 4, 6, 8, … (+2) и 20, 18, 16, … (−2). Следующее число из первого ряда — 10.'},
 {cat:'logic',q:'5 станков за 5 минут делают 5 деталей. За сколько минут 100 станков сделают 100 деталей?',o:['100','20','5','1'],a:2,ex:'Каждый станок делает одну деталь за 5 минут. 100 станков работают одновременно и сделают 100 деталей за те же 5 минут.'}
];
const MEM=[
 {mem:[6,2,9,4],show:4,q:'Какая цифра была второй?',o:['9','4','2','6','7'],a:2,ex:'Последовательность была 6 – 2 – 9 – 4. Второй была цифра 2.'},
 {mem:[2,7,4,9,1,6],show:5,q:'Какая цифра была четвёртой?',o:['4','1','9','7','6'],a:2,ex:'Последовательность была 2 – 7 – 4 – 9 – 1 – 6. Четвёртой была цифра 9.'}
];
const LIK=[
 {key:'prac',q:'Мне проще учиться на практике, чем по книгам'},
 {key:'det',q:'Я быстро замечаю мелкие детали и ошибки'},
 {key:'puz',q:'Мне нравится решать головоломки и сложные задачи'},
 {key:'vis',q:'Я легко представляю трёхмерные объекты в уме'},
 {key:'plan',q:'Прежде чем действовать, я обычно продумываю план'}
];
const PAT=[
 {p:{k:'grid',s:22,w:3,a:0},opts:[{k:'grid',s:14,w:2,a:0},{k:'grid',s:22,w:3,a:20},{k:'grid',s:22,w:3,a:0},{k:'grid',s:22,w:3,a:45},{k:'grid',s:40,w:3,a:0},{k:'grid',s:22,w:7,a:0}],a:2,ex:'Узор — ровная сетка с одинаковым шагом и толщиной линий без наклона. Подходит только фрагмент с тем же шагом, толщиной и углом.'},
 {p:{k:'cross',s:34,L:9,w:4,a:22},opts:[{k:'cross',s:34,L:9,w:4,a:0},{k:'cross',s:22,L:6,w:3,a:22},{k:'cross',s:34,L:9,w:4,a:22},{k:'cross',s:34,L:9,w:4,a:45},{k:'cross',s:34,L:15,w:4,a:22},{k:'cross',s:34,L:9,w:4,a:-22}],a:2,ex:'Крестики стоят рядами, повёрнутыми примерно на 22°, на одинаковом расстоянии и одного размера. Совпадают угол, шаг и размер только у одного фрагмента.'},
 {p:{k:'tile',s:58,a:0,inner:1},opts:[{k:'tile',s:58,a:0,inner:0},{k:'tile',s:58,a:0,inner:1,dx:29},{k:'tile',s:29,a:0,inner:1},{k:'tile',s:58,a:0,inner:1},{k:'tile',s:58,a:45,inner:1},{k:'tile',s:58,a:0,inner:1,dy:29}],a:3,ex:'Узор состоит из ромбов с перекрестием и точкой в центре, уложенных ровной сеткой. Правильный фрагмент совпадает не только по форме и размеру, но и по положению ромбов — он продолжает соседние ряды.'},
 {p:{k:'dot',s:18,r:3.5,a:30},opts:[{k:'dot',s:18,r:3.5,a:0},{k:'dot',s:12,r:3.5,a:30},{k:'dot',s:18,r:6.5,a:30},{k:'dot',s:18,r:3.5,a:60},{k:'stripe',s:18,w:4,a:30},{k:'dot',s:18,r:3.5,a:30}],a:5,ex:'Точки расположены рядами под наклоном 30°, с одинаковым шагом и размером. Совпадают все три признака только у одного варианта.'}
,
 {p:{k:'stripe',s:16,w:5,a:35},opts:[{k:'stripe',s:16,w:5,a:35},{k:'stripe',s:16,w:5,a:0},{k:'stripe',s:16,w:5,a:-35},{k:'stripe',s:26,w:5,a:35},{k:'stripe',s:16,w:10,a:35},{k:'dot',s:16,r:3.5,a:35}],a:0,
  ex:'Узор — наклонные полосы одинаковой толщины и шага. Подходит фрагмент с тем же наклоном, шагом и толщиной.'}
];
const ANA=[
 {A:{k:'sh',s:'circle',f:0,d:1},B:{k:'sh',s:'circle',f:2,d:1},C:{k:'sh',s:'hexagon',f:0,d:1},
  opts:[{k:'sh',s:'hexagon',f:0,d:1},{k:'sh',s:'circle',f:2,d:1},{k:'sh',s:'hexagon',f:2,d:1},{k:'sh',s:'hexagon',f:2,d:0},{k:'sh',s:'square',f:2,d:1},{k:'sh',s:'hexagon',f:1,d:1}],a:2,
  ex:'Из первой фигуры во вторую меняется только заливка: белая становится тёмной, точка остаётся. Значит, шестиугольник тоже становится тёмным с точкой.'},
 {A:{k:'ar',a:0},B:{k:'ar',a:90},C:{k:'ar',a:45},
  opts:[{k:'ar',a:45},{k:'ar',a:90},{k:'ar',a:135},{k:'ar',a:225},{k:'ar',a:315},{k:'ar',a:180}],a:2,
  ex:'Первая стрелка поворачивается на 90° по часовой стрелке. Поворачиваем стрелку, смотрящую на 45°, ещё на 90° — получаем 135°.'},
 {A:{k:'pc',c:[[0,0,1],[0,1,0],[1,1,0],[2,1,0]]},B:{k:'pc',c:[[2,0,1],[2,1,0],[1,1,0],[0,1,0]]},C:{k:'pc',c:[[0,0,0],[1,0,0],[1,1,1],[1,2,0]]},
  opts:[{k:'pc',c:[[0,0,0],[1,0,0],[1,1,1],[1,2,0]]},{k:'pc',c:[[1,0,0],[0,0,0],[0,1,1],[0,2,0]]},{k:'pc',c:[[0,2,0],[1,2,0],[1,1,1],[1,0,0]]},{k:'pc',c:[[1,0,0],[0,0,1],[0,1,0],[0,2,0]]},{k:'pc',c:[[0,0,0],[1,0,0],[2,0,0],[2,1,1]]},{k:'pc',c:[[1,0,0],[0,0,0],[0,1,0],[0,2,1]]}],a:1,
  ex:'Вторая фигура — зеркальное отражение первой слева направо (чёрная клетка тоже отражается). Отражаем третью фигуру так же.'},
 {A:{k:'sh',s:'circle',f:0,d:1,ln:1},B:{k:'sh',s:'circle',f:0,d:0,ln:1},C:{k:'sh',s:'square',f:1,d:1,ln:1},
  opts:[{k:'sh',s:'square',f:1,d:1,ln:0},{k:'sh',s:'square',f:1,d:0,ln:0},{k:'sh',s:'circle',f:0,d:0,ln:1},{k:'sh',s:'square',f:1,d:1,ln:1},{k:'sh',s:'square',f:1,d:0,ln:1},{k:'sh',s:'square',f:2,d:0,ln:1}],a:4,
  ex:'Из первой фигуры во вторую исчезает точка, а линия и форма остаются. Значит, у квадрата тоже убираем только точку.'},
 {A:{k:'sh',s:'pentagon',f:0,d:0,ln:0},B:{k:'sh',s:'pentagon',f:0,d:0,ln:1},C:{k:'sh',s:'pentagon',f:2,d:0,ln:0},
  opts:[{k:'sh',s:'pentagon',f:2,d:0,ln:0},{k:'sh',s:'pentagon',f:0,d:0,ln:1},{k:'sh',s:'pentagon',f:2,d:1,ln:0},{k:'sh',s:'hexagon',f:2,d:0,ln:1},{k:'sh',s:'pentagon',f:2,d:0,ln:1},{k:'sh',s:'pentagon',f:1,d:0,ln:1}],a:4,
  ex:'К фигуре добавляется горизонтальная линия, а форма и цвет не меняются. Тёмный пятиугольник получает линию и остаётся тёмным.'}
,
 {A:{k:'sh',s:'square',f:0,d:0,ln:0},B:{k:'sh',s:'square',f:2,d:1,ln:0},C:{k:'sh',s:'triangle',f:0,d:0,ln:1},
  opts:[{k:'sh',s:'triangle',f:2,d:1,ln:1},{k:'sh',s:'triangle',f:2,d:0,ln:1},{k:'sh',s:'triangle',f:0,d:1,ln:1},{k:'sh',s:'triangle',f:2,d:1,ln:0},{k:'sh',s:'square',f:2,d:1,ln:1},{k:'sh',s:'triangle',f:1,d:1,ln:1}],a:0,
  ex:'Фигура закрашивается, и в ней появляется точка, остальное не меняется. Треугольник с линией тоже становится тёмным с точкой.'}
];
const WORD='ГОРИЗОНТ';
const DEMO=[
 {q:'Сколько вам лет?',o:['До 18','18–25','26–34','35–44','45–59','60 и старше'],key:'age'},
 {q:'Ваше образование?',o:['Среднее школьное','Среднее специальное (колледж)','Высшее (бакалавриат)','Высшее (магистратура и выше)','Учусь сейчас']}
];
const NM=[
 {g:[[2,5,10],[3,4,12],[6,2,null]],o:['8','10','12','14','4','16'],a:2,ex:'В каждой строке третье число равно произведению первых двух: 6 × 2 = 12.'},
 {g:[[9,4,5],[12,5,7],[15,6,null]],o:['8','9','10','11','21','7'],a:1,ex:'В каждой строке третье число равно разности первых двух: 15 − 6 = 9.'},
 {g:[[7,10,13],[10,13,16],[13,16,null]],o:['19','17','18','16','21','13'],a:0,ex:'Числа растут на 3 и вправо, и вниз: 16 + 3 = 19.'}
];
const NUMR='5839';
const LIKO=['Совершенно верно','Скорее верно','Затрудняюсь ответить','Скорее неверно','Совершенно неверно'];
const LVLS=[0,0,0,0,0,0,1,1,1,1,1,1,2,2,2,2,2,2];
const MAT=buildQuestions().map((m,i)=>({...m,lvl:LVLS[i]}));
// лёгкий старт → «ага»-вопросы → рост сложности → пик → финиш на посильном задании
const SEQ='T0 M0 T12 V0 A0 R0 V1 M3 V2 M4 N2 V3 T3 V4 V5 M7 V6 T13 A2 V7 V8 M6 M10 A5 P4 P1 T14 W0 D0 D1'.split(' ');
const Q=SEQ.map(t=>{const k=t[0],i=+t.slice(1);
  if(k==='T')return{text:1,...TEXT[i]};if(k==='R')return{text:1,cat:'mem',...MEM[i]};if(k==='L')return{likert:1,text:1,...LIK[i],o:LIKO};if(k==='P')return{pat:1,cat:'spat',...PAT[i]};if(k==='A')return{ana:1,cat:'spat',...ANA[i]};if(k==='D')return{likert:1,demo:1,text:1,...DEMO[i]};if(k==='N')return{nmx:1,text:1,cat:'num',...NM[i]};if(k==='V')return{vq:1,...VIS[i]};
  if(k==='U')return{text:1,cat:'mem',q:'Какое число мы просили запомнить в середине теста?',o:['5893','5839','5398','8539','5938'],a:1,ex:'Число было 5839. Это задание на отложенное запоминание чисел.'};
  if(k==='W')return{text:1,cat:'mem',q:'Какое слово мы просили запомнить в самом начале теста?',o:['Граница','Галактика','Горизонт','Гармония','Город'],a:2,ex:'В начале теста мы просили запомнить слово «Горизонт». Это задание на отложенное запоминание.'};return MAT[i]});
Q.forEach((q,i)=>{if(!q.text||q.likert||!q.o)return;const R=mkR(i*7717+31),idx=perm(R,q.o.map((_,k)=>k));
  const o=idx.map(k=>q.o[k]),na=idx.indexOf(q.a);Q[i]={...q,o,a:na}});
Q.forEach((q,i)=>{if(!q.vq)return;const R=mkR(i*9173+57),idx=perm(R,q.opts.map((_,k)=>k));Q[i]={...q,opts:idx.map(k=>q.opts[k]),a:idx.indexOf(q.a)}});
const SC=Q.map((q,i)=>i).filter(i=>!Q[i].likert),NS=SC.length;
const TOTAL=Q.length,TIME=24*3600,L='АБВГДЕ';
const LV=['лёгкая','средняя','высокая'];
const CHEER={5:'Отличное начало! 👍',10:'Уже 10 вопросов позади — так держать!',15:'Отлично идёте! Дальше будет интереснее.',20:'Половина позади — так держать!'};

let _u=0;const uniq=s=>{const n=++_u;return s.replace(/id="(\w+)"/g,`id="$1_${n}"`).replace(/url\(#(\w+)\)/g,`url(#$1_${n})`)};
function matrixSVG(q){const R=FAM[q.fam];let s=`<svg class="matrix" viewBox="0 0 330 330">${DEFS}`;
  for(let r=0;r<3;r++)for(let c=0;c<3;c++){const x=c*110+5,y=r*110+5,last=r==2&&c==2;
    s+=`<rect x="${x}" y="${y}" width="100" height="100" rx="14" fill="#fff" stroke="${last?'#2f6fe4':'none'}" stroke-width="${last?3.5:0}"/>`;
    s+=last?`<text x="${x+50}" y="${y+66}" text-anchor="middle" font-size="50" font-weight="900" fill="#2f6fe4">?</text>`:R.render(q.cells[r][c],x+50,y+50);}
  return uniq(s+'</svg>')}
function patDef(p){const id='pt',S=p.s;let inner;
  if(p.k==='grid')inner=`<rect x="0" y="0" width="${p.w}" height="${S}" fill="${INK}"/><rect x="0" y="0" width="${S}" height="${p.w}" fill="${INK}"/>`;
  else if(p.k==='dot')inner=`<circle cx="${S/2}" cy="${S/2}" r="${p.r}" fill="${ACC}"/>`;
  else if(p.k==='stripe')inner=`<rect x="0" y="0" width="${p.w}" height="${S}" fill="${INK}"/>`;
  else if(p.k==='cross'){const c=S/2,L=p.L;inner=`<path d="M${c-L} ${c}H${c+L}M${c} ${c-L}V${c+L}" stroke="${INK}" stroke-width="${p.w}" stroke-linecap="butt"/>`}
  else if(p.k==='tile'){const m=2,q=S/4;inner=`<polygon points="${S/2},${m} ${S-m},${S/2} ${S/2},${S-m} ${m},${S/2}" fill="none" stroke="${INK}" stroke-width="2"/>`+
    (p.inner?`<path d="M${q} ${q}L${3*q} ${3*q}M${3*q} ${q}L${q} ${3*q}" stroke="${INK}" stroke-width="2"/><rect x="${S/2-3}" y="${S/2-3}" width="6" height="6" fill="${ACC}"/>`:'')}
  return `<pattern id="${id}" width="${S}" height="${S}" patternUnits="userSpaceOnUse" patternTransform="translate(${p.dx||0} ${p.dy||0}) rotate(${p.a||0})">${inner}</pattern>`}
const HOLE=[196,128,100,80];
function patMain(q){const[x,y,w,h]=HOLE;return uniq(`<svg class="matrix pat" viewBox="0 0 320 230"><defs>${patDef(q.p)}</defs><rect x="0" y="0" width="320" height="230" rx="16" fill="#fff"/><rect x="0" y="0" width="320" height="230" rx="16" fill="url(#pt)"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="#2f6fe4" stroke-width="3.5"/><text x="${x+w/2}" y="${y+h/2+17}" text-anchor="middle" font-size="48" font-weight="900" fill="#2f6fe4">?</text></svg>`)}
function patOpt(p,sz){const[x,y,w,h]=HOLE;sz=sz||88;return uniq(`<svg viewBox="${x} ${y} ${w} ${h}" width="${sz}" height="${sz*.8}" style="vertical-align:middle"><defs>${patDef(p)}</defs><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#pt)"/></svg>`)}
function anaCell(v,x,y){if(v.k==='ar')return FAM.rotate.render({a:v.a},x,y);
  if(v.k==='pc'){const S=19,mx=Math.max(...v.c.map(c=>c[0])),my=Math.max(...v.c.map(c=>c[1])),ox=x-(mx+1)*S/2,oy=y-(my+1)*S/2;
    return `<g filter="url(#sh)">${v.c.map(([cx,cy,b])=>`<rect x="${ox+cx*S}" y="${oy+cy*S}" width="${S}" height="${S}" fill="${b?'#111':'#fff'}" stroke="#111" stroke-width="2.2"/>`).join('')}</g>`}
  const lc=v.f===2?'#fff':INK;
  return shp(v.s,x,y,30,FILLS[v.f])+(v.ln?`<line x1="${x-19}" y1="${y+9}" x2="${x+19}" y2="${y+9}" stroke="${lc}" stroke-width="3.5" stroke-linecap="round"/>`:'')+(v.d?`<circle cx="${x}" cy="${y-6}" r="6" fill="${v.f===2?'#fff':ACC}"/>`:'')}
function nmMain(q){let s=`<svg class="matrix" viewBox="0 0 330 330">`;
  q.g.forEach((r,ri)=>r.forEach((v,ci)=>{const x=ci*110+5,y=ri*110+5,last=v===null;
    s+=`<rect x="${x}" y="${y}" width="100" height="100" rx="14" fill="#fff" stroke="${last?'#2f6fe4':'#111'}" stroke-width="${last?3.5:1.8}" />`+
    `<text x="${x+50}" y="${y+67}" text-anchor="middle" font-size="46" font-weight="800" fill="${last?'#2f6fe4':'#111'}">${last?'?':v}</text>`}));return s+'</svg>'}
function anaMain(q){let s=`<svg class="matrix" viewBox="0 0 330 230">${DEFS}`;
  const cell=(x,y,last)=>`<rect x="${x}" y="${y}" width="100" height="100" fill="#fff" stroke="${last?'#2f6fe4':'none'}" stroke-width="${last?3.5:0}"/>`;
  const arr=(y)=>`<path d="M140 ${y}H186M178 ${y-8}L188 ${y}L178 ${y+8}" stroke="#9aa0ad" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  s+=cell(15,10)+anaCell(q.A,65,60)+arr(60)+cell(215,10)+anaCell(q.B,265,60);
  s+=cell(15,120)+anaCell(q.C,65,170)+arr(170)+cell(215,120,1)+`<text x="265" y="188" text-anchor="middle" font-size="50" font-weight="900" fill="#2f6fe4">?</text>`;
  return uniq(s+'</svg>')}
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const optView=(q,k,sz)=>q.vq?uniq(`<svg viewBox="0 0 100 100" width="${sz||80}" height="${sz||80}" style="vertical-align:middle">${q.opts[k](50,50)}</svg>`):q.ana?uniq(`<svg viewBox="0 0 100 100" width="${sz||80}" height="${sz||80}" style="vertical-align:middle">${DEFS}${anaCell(q.opts[k],50,50)}</svg>`):q.pat?patOpt(q.opts[k],sz?sz*1.3:0):q.text?`<b>${esc(T(q.o[k]))}</b>`:uniq(`<svg viewBox="0 0 100 100" width="${sz||80}" height="${sz||80}" style="vertical-align:middle">${DEFS}${FAM[q.fam].render(q.opts[k],50,50)}</svg>`);
const nOpts=q=>q.text&&!q.vq?q.o.length:q.opts.length;

let ans=[],cur=0,left=TIME,tick=null,userName='';
const $=id=>document.getElementById(id);
function show(id){$('stickyCta').classList.toggle('on',false);document.querySelector('.pwsticky').classList.remove('on');['start','test','email','analyze','paywall','result'].forEach(s=>$(s).classList.toggle('hidden',s!==id));window.scrollTo(0,0)}
function start(){TR('start');if(PATH_LANG){$('wordModal').classList.add('on');return}$('langModal').classList.add('on')}
document.querySelectorAll('#langModal .lpick').forEach(b=>b.onclick=()=>{LANG=b.dataset.l;TR('lang',{l:LANG});try{localStorage.setItem('iq_lang',LANG)}catch(e){};applyLang();syncUrl();$('langModal').classList.remove('on');$('wordModal').classList.add('on')});
$('wordBtn').onclick=()=>{$('wordModal').classList.remove('on');begin()};
function begin(){TR('begin',{l:LANG});paceShown=false;shownI={};userName='';Q.forEach(q=>delete q.seen);ans=new Array(TOTAL).fill(null);cur=0;left=TIME;show('test');render();
  clearInterval(tick);tick=setInterval(()=>{left--},1000)}
function drawTimer(){return;const t=Math.max(left,0);$('timer').textContent=`⏱ ${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;$('timer').classList.toggle('low',left<=120)}
const CATN={attn:'Внимательность',num:'Числовое мышление',logic:'Логика',verb:'Вербальное мышление',mem:'Кратковременная память',spat:'Пространственное мышление'};
function tagOf(q){return T(q.demo?'О вас':q.likert?'Стиль мышления':q.text||q.vq?CATN[q.cat]:'Пространственное мышление')}
function confetti(n){try{const c=$('confetti'),x=c.getContext('2d'),W=c.width=innerWidth,H=c.height=innerHeight,C=['#4f46e5','#a855f7','#22c55e','#f59e0b','#ec4899','#06b6d4'];
  const P=Array.from({length:n},()=>({x:W/2+(Math.random()-.5)*W*.3,y:H*.35,vx:(Math.random()-.5)*11,vy:-Math.random()*12-4,r:Math.random()*6+4,c:C[Math.random()*C.length|0],a:Math.random()*6,va:(Math.random()-.5)*.3}));
  const t0=performance.now();(function f(now){x.clearRect(0,0,W,H);const el=now-t0;P.forEach(p=>{p.vy+=.35;p.x+=p.vx;p.y+=p.vy;p.a+=p.va;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.globalAlpha=Math.max(0,1-el/2200);x.fillStyle=p.c;x.fillRect(-p.r/2,-p.r/4,p.r,p.r/2);x.restore()});if(el<2200)requestAnimationFrame(f);else x.clearRect(0,0,W,H)})(t0)}catch(e){}}
function pwObs(){try{if(window._pwio)return;window._pwio=new IntersectionObserver(es=>{const st=!$('paywall').classList.contains('hidden');document.querySelector('.pwsticky').classList.toggle('on',st&&!es[0].isIntersecting)});window._pwio.observe($('payBtn'))}catch(e){}}
let memT=null;
function render(){const q=Q[cur];clearTimeout(memT);
  $('qcount').textContent=`${cur+1} / ${TOTAL}`;
  $('qleft').textContent=cur<TOTAL-1?L2(`осталось ${TOTAL-cur-1}`,`тағы ${TOTAL-cur-1} қалды`):T('последний вопрос');
  $('qcat').textContent=tagOf(q);
  const done=ans.filter(a=>a!==null).length;$('prog').style.width=(done/TOTAL*100)+'%';
  $('prevBtn').classList.toggle('invisible',cur===0);
  $('skipBtn').textContent=T(cur===TOTAL-1?'Завершить тест ✓':(ans[cur]===null?'Пропустить →':'Далее →'));
  $('dots').innerHTML=Q.map((_,i)=>`<button class="${ans[i]!==null?'done':''} ${i===cur?'cur':''}" data-i="${i}">${i+1}</button>`).join('');
  $('dots').querySelectorAll('button').forEach(b=>b.onclick=()=>{cur=+b.dataset.i;render()});
  const card=$('qcard');card.classList.remove('enter','enterBack');void card.offsetWidth;card.classList.add(window._back?'enterBack':'enter');window._back=false;
  if(q.mem&&!q.seen){ // фаза запоминания
    $('qtext').textContent=T('Запомните эту последовательность цифр');
    $('qvis').innerHTML=`<div class="memb"><div class="digs">${q.mem.map(d=>`<span>${d}</span>`).join('')}</div><div class="mbar"><i style="animation-duration:${q.show}s"></i></div></div><div class="fine" id="memc">${L2(`Исчезнет через <b>${q.show}</b> сек.`,`<b>${q.show}</b> секундтан кейін жоғалады`)}</div>`;
    $('opts').innerHTML='';$('skipBtn').classList.add('invisible');
    let t=q.show;const step=()=>{t--;if(t<=0){q.seen=1;$('skipBtn').classList.remove('invisible');render();return}const c=$('memc');if(c)c.innerHTML=L2(`Исчезнет через <b>${t}</b> сек.`,`<b>${t}</b> секундтан кейін жоғалады`);memT=setTimeout(step,1000)};
    memT=setTimeout(step,1000);return}
  $('skipBtn').classList.remove('invisible');
  $('qtext').textContent=T(q.vq?q.q:q.nmx?'Какое число должно стоять на месте «?»':q.ana?'Первая пара фигур связана по правилу. Какая фигура продолжает вторую пару?':q.pat?'Какой фрагмент дополняет узор?':q.text?q.q:'Какая фигура должна стоять на месте «?»');
  $('qvis').innerHTML=q.vq?uniq(q.main()):q.nmx?nmMain(q):q.ana?anaMain(q):q.pat?patMain(q):q.text?'':matrixSVG(q);
  $('opts').className=q.vq?'opts vis':q.nmx?'opts vis nums':q.demo?'opts':q.likert?'opts lik':q.text?'opts':'opts vis';
  let h='';for(let k=0;k<nOpts(q);k++)h+=q.demo?`<button class="opt${ans[cur]===k?' sel':''}" data-i="${k}"><span class="l">${L[k]}</span><span>${T(q.o[k])}</span></button>`:q.likert?`<button class="opt lk${k}${ans[cur]===k?' sel':''}" data-i="${k}">${T(LIKO[k])}</button>`:`<button class="opt${ans[cur]===k?' sel':''}" data-i="${k}"><span class="l">${L[k]}</span>${optView(q,k)}</button>`;
  $('opts').innerHTML=h;
  $('opts').querySelectorAll('.opt').forEach(b=>b.onclick=()=>choose(+b.dataset.i));
}
function toast(t){const el=$('toast');el.textContent=t;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),1800)}
function choose(k){try{navigator.vibrate&&navigator.vibrate(10)}catch(e){}const first=ans[cur]===null;ans[cur]=k;if(first)TR('answer',{n:cur+1,ok:Q[cur].likert?null:k===Q[cur].a});
  $('opts').querySelectorAll('.opt').forEach(b=>b.classList.toggle('sel',+b.dataset.i===k));
  const done=ans.filter(a=>a!==null).length;
  if(first&&CHEER[done])toast(T(CHEER[done]));
  setTimeout(()=>{if(cur<TOTAL-1){cur++;render();inter()}else askFinish()},280)}
let paceShown=false,shownI={};
const NUMAT=Math.floor(TOTAL*0.4),RADAT=Math.floor(TOTAL*0.7);
function inter(){const once=k=>!shownI[k]&&(shownI[k]=1);
  if(cur===Math.floor(TOTAL/2)&&!paceShown){showPace();return}
  if(cur===RADAT&&once('rad')){showRadar();return}
  if(TOTAL-cur===5&&once('prog')){showProg();return}}
const GRP=[['Логика',q=>q.cat==='logic'],['Внимательность',q=>q.cat==='attn'],['Память',q=>q.cat==='mem'],['Числа и слова',q=>q.cat==='num'||q.cat==='verb'],['Пространство',q=>(!q.text&&!q.vq)||q.cat==='spat']];
function showRadar(){const cx=110,cy=105,R=80,n=5;let s=`<svg viewBox="-40 0 300 210" width="300" height="210" style="max-width:100%">`;
  const pt=(i,r)=>{const an=-Math.PI/2+i*2*Math.PI/n;return[cx+r*Math.cos(an),cy+r*Math.sin(an)]};
  [1,.66,.33].forEach(f=>{s+=`<polygon points="${[0,1,2,3,4].map(i=>pt(i,R*f).join(',')).join(' ')}" fill="none" stroke="#e3e5f0"/>`});
  const v=GRP.map(([,f])=>{const idx=Q.map((q,i)=>!q.likert&&f(q)&&ans[i]!==null?i:-1).filter(i=>i>=0);return idx.length?idx.filter(i=>ans[i]===Q[i].a).length/idx.length:null});
  const vv=v.map(x=>x===null?.35:Math.max(.15,x));
  s+=`<polygon class="rd" points="${vv.map((x,i)=>pt(i,R*x).join(',')).join(' ')}" fill="rgba(99,102,241,.18)" stroke="#5b4ff0" stroke-width="2.5"/>`;
  vv.forEach((x,i)=>{const[p,q2]=pt(i,R*x);s+=`<circle cx="${p}" cy="${q2}" r="5" fill="${v[i]===null?'#fff':'#5b4ff0'}" stroke="#5b4ff0" stroke-width="2"/>`;const[lx,ly]=pt(i,R+14);s+=`<text x="${lx}" y="${ly+4}" font-size="10" font-weight="700" text-anchor="middle" fill="#676b85">${T(GRP[i][0])}</text>`});
  $('radarBox').innerHTML=s+'</svg>';$('radarModal').classList.add('on')}
function showProg(){confetti(40);const p=Math.round(cur/TOTAL*100),a2=Math.PI*(1-p/100);
  $('progT').innerHTML=L2(`Вы почти у цели! Осталось всего <em>5</em> вопросов ⚡`,`Мақсатқа аз қалды! Небәрі <em>5</em> сұрақ қалды ⚡`);
  $('progG').innerHTML=`<svg viewBox="0 0 200 110" width="200" height="110"><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#e3e5f0" stroke-width="12" stroke-linecap="round"/><path d="M20 100 A80 80 0 0 1 ${(100+80*Math.cos(a2)).toFixed(1)} ${(100-80*Math.sin(a2)).toFixed(1)}" fill="none" stroke="#5b4ff0" stroke-width="12" stroke-linecap="round"/><text x="100" y="92" text-anchor="middle" font-size="34" font-weight="800" fill="#4f46e5">${p}%</text></svg>`;
  $('progModal').classList.add('on')}
['radarBtn','progBtn'].forEach(id=>$(id).onclick=()=>$(id).closest('.modal').classList.remove('on'));
function showPace(){paceShown=true;const n=Math.max(1,ans.filter(x=>x!==null).length),avg=Math.round((TIME-left)/n);
  $('paceT').innerHTML=avg<=35?L2(`Отличный темп! Вы отвечаете в среднем за <em>${avg} сек.</em> ⚡`,`Керемет қарқын! Орта есеппен <em>${avg} секундта</em> жауап бересіз ⚡`):L2(`Половина теста позади! В среднем <em>${avg} сек.</em> на вопрос 👍`,`Тесттің жартысы артта! Бір сұраққа орта есеппен <em>${avg} сек.</em> 👍`);
  $('paceModal').classList.add('on')}
$('paceBtn').onclick=()=>$('paceModal').classList.remove('on');
function askFinish(){const miss=ans.filter(a=>a===null).length;
  $('confirmText').textContent=miss?L2(`Без ответа осталось вопросов: ${miss}. Можно вернуться к ним или завершить тест сейчас.`,`Жауапсыз қалған сұрақтар: ${miss}. Оларға оралуға немесе тестті қазір аяқтауға болады.`):T('Вы ответили на все вопросы. Готовы узнать результат?');
  $('confirmModal').classList.add('on')}
$('prevBtn').onclick=()=>{if(cur>0){cur--;window._back=true;render()}};
$('skipBtn').onclick=()=>{if(cur<TOTAL-1){cur++;render()}else askFinish()};
$('cNo').onclick=()=>{$('confirmModal').classList.remove('on');const i=ans.indexOf(null);if(i>=0){cur=i;render()}};
$('cYes').onclick=()=>{$('confirmModal').classList.remove('on');finish()};

function iqFrom(raw){const m=NS*0.55,sd=NS/6;return Math.max(55,Math.min(150,Math.round(100+15*(raw-m)/sd)))}
function pctOf(iq){const z=(iq-100)/15,t=1/(1+.2316419*Math.abs(z)),d=.3989423*Math.exp(-z*z/2),p=d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return Math.round((z>0?1-p:p)*100)}
function levelOf(iq){
  if(iq>=130)return'Очень высокий интеллект';if(iq>=115)return'Выше среднего';
  if(iq>=100)return'Средний (верхняя граница)';if(iq>=85)return'Средний';return'Ниже среднего'}
function finish(){TR('finish',{answered:ans.filter(a=>a!==null).length});clearInterval(tick);clearTimeout(memT);document.querySelectorAll('.modal').forEach(m=>m.classList.remove('on'));
  let em=null;try{em=localStorage.getItem('iq_email')}catch(e){}
  if(em){saveSession(em);runAnalyze();return}
  show('email');TR('email_view');setTimeout(()=>{try{$('emIn').focus()}catch(e){}},350)}
const EMAIL_RE=/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
function emSubmit(){const v=$('emIn').value.trim().toLowerCase(),er=$('emErr');
  if(!EMAIL_RE.test(v)||v.length>254){er.textContent=L2('Введите корректный email, например name@mail.com','Дұрыс email жазыңыз, мысалы name@mail.com');er.classList.remove('hidden');return}
  er.classList.add('hidden');try{localStorage.setItem('iq_email',v)}catch(e){}
  sbIns('leads',{visit_id:VID,email:v,lang:LANG,marketing_consent:!!$('emConsent').checked});saveSession(v);TR('email',{consent:!!$('emConsent').checked});runAnalyze()}
// A finished test, saved server-side so the emailed link can reopen it (Supabase test_sessions).
function saveSession(email){const token=uuid4();try{localStorage.setItem('iq_session',token)}catch(e){}
  sbIns('test_sessions',{token,visit_id:VID,order_id:orderId(),email:email||null,lang:LANG,answers:ans,left_sec:Math.max(0,left|0)})}
const MAIL_FN='https://dlhejkmuyyqvjzjxbwbg.supabase.co/functions/v1/mail';
function mailResult(){let t=null;try{t=localStorage.getItem('iq_session')}catch(e){}if(!t)return;
  setTimeout(()=>{fetch(MAIL_FN,{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY},body:JSON.stringify({action:'result',token:t})}).catch(()=>{})},2500)}
$('emBtn').onclick=emSubmit;$('emIn').addEventListener('keydown',e=>{if(e.key==='Enter')emSubmit()});
function runAnalyze(){show('analyze');const box=document.querySelector('#analyze .az');box.classList.remove('fin');
  const okA=Q.map((q,i)=>!q.likert&&ans[i]===q.a);
  const gv=RGRP.map(([e,n,sn,f])=>{const idx=Q.map((q,i)=>!q.likert&&f(q)?i:-1).filter(i=>i>=0),k=idx.filter(i=>okA[i]).length;return idx.length?k/idx.length:0});
  $('azBars').innerHTML=RGRP.map((g,i)=>`<div class="az-bar" data-i="${i}"><span>${g[0]}</span><span class="t">${T(g[2])}<span class="tr"><i></i></span></span><span class="v">…</span></div>`).join('');
  $('azH').textContent=L2('Анализируем ваши ответы','Жауаптарыңызды талдап жатырмыз');
  const steps=[...document.querySelectorAll('#steps li')],SD=1500,TT=steps.length*SD;steps.forEach(s=>s.className='');
  steps.forEach((s,i)=>setTimeout(()=>{if(i)steps[i-1].className='done';s.className='act'},i*SD));
  const bars=[...document.querySelectorAll('#azBars .az-bar')];
  bars.forEach((el,i)=>setTimeout(()=>{el.classList.add('on');const p=Math.round(gv[i]*100);el.querySelector('i').style.width=Math.max(4,p)+'%';
    let c=0;const iv=setInterval(()=>{c=Math.min(p,c+Math.max(1,Math.round(p/12)));el.querySelector('.v').textContent=c+'%';if(c>=p)clearInterval(iv)},70)},2*SD+i*420));
  const done=ans.filter(a=>a!==null).length,t0=performance.now();
  (function tk(now){const p=Math.min(1,(now-t0)/TT),e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
    $('azRing').style.strokeDashoffset=641*(1-e);$('azPct').textContent=Math.round(e*100);$('azCnt').textContent=Math.min(done,Math.round(done*Math.min(1,p*2.2)))+' / '+TOTAL;
    if(p<1)requestAnimationFrame(tk)})(t0);
  setTimeout(()=>{steps[steps.length-1].className='done';box.classList.add('fin');$('azH').textContent=L2('Готово! ✨','Дайын! ✨');try{confetti(60)}catch(e){}},TT+100);
  setTimeout(()=>PAYCFG.then(()=>FREE?showResult():showPaywall()),TT+1300)}
function showPaywall(re){
  const done=ans.filter(x=>x!==null).length,used=TIME-Math.max(left,0);
  $('pwStats').textContent=L2(`Вы ответили на ${done} из ${TOTAL} вопросов за ${Math.floor(used/60)} мин ${used%60} с — ваш IQ уже рассчитан.`,`Сіз ${TOTAL} сұрақтың ${done}-іне ${Math.floor(used/60)} мин ${used%60} с ішінде жауап бердіңіз — IQ-іңіз есептеліп қойды.`);
  const okA=Q.map((q,i)=>!q.likert&&ans[i]===q.a);
  const gv=RGRP.map(([e,n,sn,f])=>{const idx=Q.map((q,i)=>!q.likert&&f(q)?i:-1).filter(i=>i>=0),k=idx.filter(i=>okA[i]).length;return idx.length?k/idx.length:0});
  $('pwRadar').innerHTML=radarSVG(gv,RGRP.map(g=>T(g[2])));
  const st=styleList()[0];$('pwGift').style.display=st?'':'none';
  if(st)$('pwGift').innerHTML=`<div class="ge">${st[0]}</div><div><small>${L2('🎁 Уже открыто бесплатно','🎁 Тегін ашылды')}</small><b>${L2('Ваш стиль обучения','Сіздің үйрену стиліңіз')}: ${T(st[1])}</b><span>${T(st[2])} ${L2(`Ещё ${styleList().length-1} черты — в полном отчёте.`,`Тағы ${styleList().length-1} ерекшелік — толық есепте.`)}</span></div>`;
  $('pwReview').textContent=L2(`объяснение всех ${NS} вопросов`,`барлық ${NS} сұрақтың түсіндірмесі`);
  show('paywall');if(!re)confetti(70);pwObs()}
const PAY_FN='/api/pay';
function uuid4(){try{return crypto.randomUUID()}catch(e){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)})}}
function orderId(){let o=null;try{o=localStorage.getItem('iq_order')}catch(e){}if(!o){o=uuid4();try{localStorage.setItem('iq_order',o)}catch(e){}}return o}
function paySave(){try{localStorage.setItem('iq_pay',JSON.stringify({ans,left,userName,lang:LANG,t:Date.now()}))}catch(e){}}
function payClear(){try{localStorage.removeItem('iq_pay');localStorage.removeItem('iq_order')}catch(e){}}
const PM={timer:null,busy:false};
function pmPhoneFmt(v){let d=String(v).replace(/\D/g,'');if(d[0]==='8')d='7'+d.slice(1);if(d&&d[0]!=='7')d='7'+d;d=d.slice(0,11);const p=[d.slice(1,4),d.slice(4,7),d.slice(7,9),d.slice(9,11)];return d?('+7 '+p.filter(Boolean).join(' ')).trim():''}
function pmStep(n){$('pmStep1').classList.toggle('hidden',n!==1);$('pmStep2').classList.toggle('hidden',n!==2)}
function pmErr(ru,kz){const e=$('pmErr');if(!ru){e.classList.add('hidden');return}e.textContent=L2(ru,kz);e.classList.remove('hidden')}
function pmView(v){const msg=$('pmMsg'),wait=$('pmWait'),retry=$('pmRetry');retry.classList.add('hidden');wait.classList.add('hidden');$('pmWtxt').classList.add('hidden');$('pmCheck').classList.add('hidden');$('pmSpin').classList.remove('done');pmErr();
  const set=(ru,kz)=>{msg.textContent=L2(ru,kz)};
  if(v.paid){pmStep(2);set('Оплата получена ✓','Төлем қабылданды ✓');clearInterval(PM.timer);TR('paid');payClear();PM.pending=false;$('pmBar').classList.add('hidden');$('pmSpin').classList.add('done');setTimeout(()=>{$('payModal').classList.remove('on');showResult()},700);return}
  if(v.status==='pending'){pmStep(2);set('Счёт отправлен в Kaspi ✓','Kaspi-ге шот жіберілді ✓');wait.classList.remove('hidden');$('pmWtxt').classList.remove('hidden');$('pmCheck').classList.remove('hidden');PM.pending=true;paySave();return}
  if(v.status==='creating'||v.status==='processing'||v.status==='outcome_unknown'){pmStep(2);set('Отправляем счёт…','Шот жіберілуде…');if(v.status==='creating'&&v.retryable)retry.classList.remove('hidden');return}
  if(['expired','cancelled','failed','rejected'].includes(v.status)){PM.pending=false;$('pmBar').classList.add('hidden');pmStep(1);pmErr('Оплата не прошла. Проверьте номер и попробуйте ещё раз.','Төлем өтпеді. Нөмірді тексеріп, қайта жіберіңіз.');pmNewOrder();clearInterval(PM.timer);return}
  if(v.http===400&&v.error==='bad_phone'){pmStep(1);pmErr('Введите номер в формате +7 7XX XXX XX XX.','Нөмірді +7 7XX XXX XX XX түрінде жазыңыз.');return}
  if(v.http===404){pmNewOrder();pmStep(1);return}
  if(v.http===403){$('payModal').classList.remove('on');clearInterval(PM.timer);showResult();return}
  if(v.http===429){pmErr('Слишком много попыток. Попробуйте через несколько минут.','Тым көп әрекет. Бірнеше минуттан кейін қайталаңыз.');retry.classList.remove('hidden');return}
  pmErr('Оплата временно недоступна. Попробуйте позже.','Төлем уақытша қолжетімсіз. Кейінірек қайталаңыз.');retry.classList.remove('hidden')}
function pmNewOrder(){try{localStorage.removeItem('iq_order')}catch(e){}}
async function pmApi(action,extra){if(PM.busy)return;PM.busy=true;try{const r=await fetch(PAY_FN,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,orderId:orderId(),visitId:VID,...(extra||{})})});let j={};try{j=await r.json()}catch(e){}pmView({http:r.status,...j})}catch(e){pmView({http:0})}finally{PM.busy=false}}
function pmPoll(){clearInterval(PM.timer);PM.timer=setInterval(()=>{if(document.hidden)return;if(!$('payModal').classList.contains('on')&&!PM.pending)return;pmApi('status')},3000)}
async function pmOpen(){TR('pay_click');$('payModal').classList.add('on');pmErr();$('pmRetry').classList.add('hidden');
  let has=false;try{has=!!localStorage.getItem('iq_order')}catch(e){}
  if(has){pmStep(2);$('pmMsg').textContent=L2('Проверяем оплату…','Төлем тексерілуде…');await pmApi('status');if($('pmStep1').classList.contains('hidden'))pmPoll();else pmStep(1)}
  else{pmStep(1);setTimeout(()=>$('pmPhone').focus(),50)}}
$('pmPhone').addEventListener('input',e=>{e.target.value=pmPhoneFmt(e.target.value)});
$('pmPhone').addEventListener('keydown',e=>{if(e.key==='Enter')$('pmSend').click()});
$('pmSend').onclick=async()=>{const d=$('pmPhone').value.replace(/\D/g,'');if(!/^7\d{10}$/.test(d)){pmErr('Введите номер в формате +7 7XX XXX XX XX.','Нөмірді +7 7XX XXX XX XX түрінде жазыңыз.');return}
  $('pmSend').disabled=true;TR('pay_phone');PM.phone=d;await pmApi('create',{method:'invoice',phone:d});$('pmSend').disabled=false;if(!$('pmStep2').classList.contains('hidden'))pmPoll()};
$('pmChange').onclick=()=>{clearInterval(PM.timer);pmNewOrder();pmStep(1);pmErr();$('pmPhone').focus()};
$('payBtn').onclick=$('payBtn2').onclick=pmOpen;
$('pmRetry').onclick=async()=>{$('pmRetry').classList.add('hidden');if(PM.phone){await pmApi('create',{method:'invoice',phone:PM.phone});pmPoll()}else pmOpen()};
$('payClose').onclick=()=>{$('payModal').classList.remove('on');if(PM.pending)$('pmBar').classList.remove('hidden');else clearInterval(PM.timer)};
$('pmBar').onclick=()=>{$('pmBar').classList.add('hidden');$('payModal').classList.add('on');pmApi('status')};
$('pmCheck').onclick=async()=>{$('pmCheck').disabled=true;await pmApi('status');setTimeout(()=>$('pmCheck').disabled=false,1500)};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&(PM.pending||($('payModal').classList.contains('on')&&!$('pmStep2').classList.contains('hidden'))))pmApi('status')});
window.addEventListener('pageshow',e=>{if(e.persisted&&PM.pending)pmApi('status')});
// Restore an unfinished payment after the tab was reloaded/discarded while the user was in the Kaspi app
(function openByLink(){const tk=new URLSearchParams(location.search).get('s');if(!tk||!/^[0-9a-f-]{36}$/i.test(tk))return;window._byLink=1;
  history.replaceState(null,'',location.pathname);
  fetch(SB_URL+'rpc/get_test_session',{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:tk})}).then(r=>r.json()).then(d=>{
    if(!d||!Array.isArray(d.answers))return;ans=d.answers;left=d.left|0;
    try{localStorage.setItem('iq_session',tk);if(d.orderId)localStorage.setItem('iq_order',d.orderId)}catch(e){}
    TR('open_link',{paid:!!d.paid});
    PAYCFG.then(()=>{if(d.paid||FREE){showResult(true)}else{showPaywall(1)}})}).catch(()=>{})})();
(function payRestore(){if(window._byLink)return;let s=null;try{s=JSON.parse(localStorage.getItem('iq_pay')||'null')}catch(e){}
  if(!s||!Array.isArray(s.ans)||Date.now()-s.t>48*3600e3){if(s)payClear();return}
  let o=null;try{o=localStorage.getItem('iq_order')}catch(e){}if(!o)return;
  ans=s.ans;left=s.left;userName=s.userName||'';
  PAYCFG.then(()=>{if(FREE){payClear();showResult();return}showPaywall(1);PM.pending=true;$('payModal').classList.add('on');pmStep(2);$('pmMsg').textContent=L2('Проверяем оплату…','Төлем тексерілуде…');pmApi('status');pmPoll()})})();
function radarSVG(vals,labels){const cx=130,cy=96,Rr=70,n=vals.length;const pt=(i,r)=>{const an=-Math.PI/2+i*2*Math.PI/n;return[cx+r*Math.cos(an),cy+r*Math.sin(an)]};
  let s=`<svg viewBox="0 0 260 200" width="260" height="200">`;
  [1,.66,.33].forEach(f=>{s+=`<polygon points="${vals.map((_,i)=>pt(i,Rr*f).join(',')).join(' ')}" fill="none" stroke="rgba(255,255,255,.18)"/>`});
  vals.forEach((_,i)=>{const[p,q]=pt(i,Rr);s+=`<line x1="${cx}" y1="${cy}" x2="${p}" y2="${q}" stroke="rgba(255,255,255,.12)"/>`});
  const vv=vals.map(v=>Math.max(.12,v));
  s+=`<polygon class="rd" points="${vv.map((v,i)=>pt(i,Rr*v).join(',')).join(' ')}" fill="rgba(165,180,252,.35)" stroke="#c7d2fe" stroke-width="2.5" stroke-linejoin="round"/>`;
  vv.forEach((v,i)=>{const[p,q]=pt(i,Rr*v);s+=`<circle cx="${p}" cy="${q}" r="4" fill="#fff"/>`;const[lx,ly]=pt(i,Rr+16);
    s+=`<text x="${lx}" y="${ly+4}" font-size="10.5" font-weight="700" text-anchor="middle" fill="rgba(255,255,255,.85)">${labels[i]}</text>`});
  return s+'</svg>'}
const RGRP=[['🧩','Логика','Логика',q=>q.cat==='logic'],['🔍','Внимательность','Внимание',q=>q.cat==='attn'],['🧠','Память','Память',q=>q.cat==='mem'],
  ['🔢','Числа и слова','Числа',q=>q.cat==='num'||q.cat==='verb'],['🧊','Пространственное мышление','Пространство',q=>(!q.text&&!q.vq)||q.cat==='spat']];
const qTitle=q=>q.vq?T(q.q):q.nmx?T('Числовая матрица'):q.ana?T('Аналогия фигур'):q.pat?T('Дополните узор'):q.mem?T('Память')+': '+T(q.q):q.text?T(q.q):L2('Матрица · '+LV[q.lvl]+' сложность','Матрица · '+T(LV[q.lvl])+' күрделілік');
function styleList(){const lk=k=>{const i=Q.findIndex(q=>q.key===k);return ans[i]};const yes=v=>v!==null&&v!==undefined&&v<=1;const has=k=>Q.some(q=>q.key===k);const st=[];
  if(has('prac'))st.push(yes(lk('prac'))?['🛠','Практик','Лучше усваиваете знания через действие и опыт.']:['📚','Теоретик','Сначала разбираетесь в принципах, потом действуете.']);
  if(has('det'))st.push(yes(lk('det'))?['🔍','Внимание к деталям','Замечаете мелочи, которые другие пропускают.']:['🌐','Целостное восприятие','Быстро схватываете суть, видите картину целиком.']);
  if(has('puz'))st.push(yes(lk('puz'))?['🧩','Любитель сложных задач','Интеллектуальные вызовы вас заряжают.']:['⚡','Прагматик','Лучше всего думаете, когда видна практическая цель.']);
  if(has('vis'))st.push(yes(lk('vis'))?['🧊','Пространственное воображение','Легко вращаете объекты в уме.']:['🗺','Словесно-логический тип','Опираетесь на слова, схемы и правила.']);
  if(has('plan'))st.push(yes(lk('plan'))?['🧭','Стратег','Продумываете шаги заранее и реже ошибаетесь.']:['🎯','Импровизатор','Быстро действуете по ситуации и легко адаптируетесь.']);return st}
function showResult(re){if(!re)mailResult();
  const ok=Q.map((q,i)=>!q.likert&&ans[i]===q.a);const correct=ok.filter(Boolean).length;
  const iq=iqFrom(correct),lv=levelOf(iq),used=TIME-Math.max(left,0),pc=Math.min(99,Math.max(1,pctOf(iq)));
  $('level').textContent=T(lv);$('shDate').textContent=new Date().toLocaleDateString('ru-RU');
  $('pctLine').innerHTML=L2(`Ваш результат выше, чем примерно у <b>${pc}%</b> людей`,`Нәтижеңіз адамдардың шамамен <b>${pc}%</b>-ынан жоғары`);
  $('fCorrect').textContent=`${correct}/${NS}`;$('fTime').textContent=`${Math.floor(used/60)}:${String(used%60).padStart(2,'0')}`;$('fPct').textContent=pc+'%';
  const gv=RGRP.map(([e,n,sn,f])=>{const idx=Q.map((q,i)=>!q.likert&&f(q)?i:-1).filter(i=>i>=0),k=idx.filter(i=>ok[i]).length;return{e,n,sn,k,t:idx.length,p:idx.length?k/idx.length:0}});
  histResult(iq);$('shRadar').innerHTML=radarSVG(gv.map(g=>g.p),gv.map(g=>T(g.sn)));
  const best=gv.slice().sort((a,b)=>b.p-a.p)[0];
  $('shStr').innerHTML=L2(`Сильная сторона: <b>${best.n}</b>`,`Мықты жағыңыз: <b>${T(best.n)}</b>`);
  $('bars').innerHTML=gv.map(g=>`<div class="ab"><div class="ae">${g.e}</div><div><div class="an">${T(g.n)}${g===best?`<span class="tagS">${T('сильная сторона')}</span>`:''}</div><div class="at"><i data-w="${Math.round(g.p*100)}"></i></div></div><div class="ap">${Math.round(g.p*100)}%</div></div>`).join('');
  setTimeout(()=>document.querySelectorAll('#bars .at i').forEach(i=>i.style.width=i.dataset.w+'%'),250);
  // IQ ring count-up
  (function(){const t0=performance.now(),D=1500,L=433.5;(function tk(now){const p=Math.min(1,(now-t0)/D),e=1-Math.pow(1-p,3),v=Math.round(55+(iq-55)*e);
    $('iqNum').textContent=v;$('iqArc').setAttribute('stroke-dasharray',`${(L*Math.max(0,(v-55)/(150-55))).toFixed(1)} 578`);if(p<1)requestAnimationFrame(tk)})(t0)})();
  if(iq>=100&&!re)setTimeout(()=>confetti(110),900);
  // style
  const lk=k=>{const i=Q.findIndex(q=>q.key===k);return ans[i]};const yes=v=>v!==null&&v!==undefined&&v<=1;const has=k=>Q.some(q=>q.key===k);const st=[];
  if(has('prac'))st.push(yes(lk('prac'))?['🛠','Практик','Лучше усваиваете знания через действие и опыт.']:['📚','Теоретик','Сначала разбираетесь в принципах, потом действуете.']);
  if(has('det'))st.push(yes(lk('det'))?['🔍','Внимание к деталям','Замечаете мелочи, которые другие пропускают.']:['🌐','Целостное восприятие','Быстро схватываете суть, видите картину целиком.']);
  if(has('puz'))st.push(yes(lk('puz'))?['🧩','Любитель сложных задач','Интеллектуальные вызовы вас заряжают.']:['⚡','Прагматик','Лучше всего думаете, когда видна практическая цель.']);
  if(has('vis'))st.push(yes(lk('vis'))?['🧊','Пространственное воображение','Легко вращаете объекты в уме.']:['🗺','Словесно-логический тип','Опираетесь на слова, схемы и правила.']);
  if(has('plan'))st.push(yes(lk('plan'))?['🧭','Стратег','Продумываете шаги заранее и реже ошибаетесь.']:['🎯','Импровизатор','Быстро действуете по ситуации и легко адаптируетесь.']);
  $('style').closest('.card').style.display=st.length?'':'none';$('style').innerHTML=st.map(([e,t,d])=>`<div class="stc"><div class="se">${e}</div><b>${T(t)}</b><p>${T(d)}</p></div>`).join('');
  $('shChips').innerHTML=st.slice(0,3).map(([e,t])=>`<span>${e} ${T(t)}</span>`).join('');
  // review
  const sc=Q.map((q,i)=>i).filter(i=>!Q[i].likert),bad=sc.filter(i=>ans[i]!==null&&!ok[i]).length,skip=sc.filter(i=>ans[i]===null).length;
  $('rvSum').innerHTML=`<div class="rv-ok"><b>${correct}</b>${L2('верно','дұрыс')}</div><div class="rv-bad"><b>${bad}</b>${L2('ошибок','қате')}</div>${skip?`<div class="rv-skip"><b>${skip}</b>${L2('пропущено','өткізілген')}</div>`:''}`;
  window._rv=f=>{let n=0;const h=sc.filter(i=>f==='all'||!ok[i]).map(i=>{const q=Q[i];n++;const cls=ok[i]?'g':ans[i]===null?'s':'r';
    return `<details class="rv"><summary><span class="rn ${cls}">${i+1}</span><span class="rt">${esc(qTitle(q))}</span><span class="chev">⌄</span></summary><div class="rb">
      <div class="cmp"><div class="y ${ok[i]?'ok':''}">${L2('Ваш ответ','Сіздің жауабыңыз')}<div class="vv">${ans[i]===null?'—':optView(q,ans[i],46)}</div></div><div class="c">${L2('Правильный','Дұрыс жауап')}<div class="vv">${optView(q,q.a,46)}</div></div></div>
      <div class="rx">💡 ${T(q.ex)}</div></div></details>`}).join('');
    $('review').innerHTML=h||`<div class="empty">${L2('🎉 Ошибок нет — отличный результат!','🎉 Қате жоқ — керемет нәтиже!')}</div>`;
    $('tBad').classList.toggle('on',f==='bad');$('tAll').classList.toggle('on',f==='all')};
  $('tBad').textContent=L2(`Ошибки (${bad+skip})`,`Қателер (${bad+skip})`);$('tAll').textContent=T('Все вопросы');window._rv(bad+skip?'bad':'all');
  window._lastResult=L2(`Мой IQ по тесту: ${iq} — ${lv}. Сильная сторона: ${best.n}. А какой у тебя? — iqtest.live`,`Менің IQ-ім: ${iq} — ${T(lv)}. Мықты жағым: ${T(best.n)}. Сенікі қанша? — iqtest.live`);
  if(!re){const di=Q.findIndex(q=>q.key==='age'),de=Q.findIndex(q=>q.demo&&q.key!=='age');sbIns('results',{visit_id:VID,lang:LANG,iq,correct,total:NS,age:di>=0&&ans[di]!==null?Q[di].o[ans[di]]:null,edu:de>=0&&ans[de]!==null?Q[de].o[ans[de]]:null,duration_sec:used,traits:st.map(x=>x[1]),answers:ans});TR('result',{iq})}
  saveHist({d:new Date().toLocaleString('ru-RU'),n:userName||'—',c:correct,iq,age:ans[SEQ.indexOf('D0')],edu:ans[SEQ.indexOf('D1')]});show('result');if(!re)window.scrollTo(0,0)}
$('tBad').onclick=()=>window._rv('bad');$('tAll').onclick=()=>window._rv('all');
$('againBtn').onclick=()=>{TR('again');show('start')};
$('copyBtn').onclick=async()=>{TR('share');try{await navigator.clipboard.writeText(window._lastResult);$('copyBtn').textContent=T('Текст скопирован ✓')}catch(e){$('copyBtn').textContent=T('Сделайте скриншот 📸')}setTimeout(()=>$('copyBtn').textContent=T('Поделиться результатом'),2200)};
const HK='iqtest_history_v1';
function getHist(){try{return JSON.parse(localStorage.getItem(HK))||[]}catch(e){return[]}}
function saveHist(r){try{const h=getHist();h.unshift(r);localStorage.setItem(HK,JSON.stringify(h.slice(0,20)))}catch(e){}}
window._hist=()=>{const h=getHist();
  $('histBody').innerHTML=h.length?`<table class="hist"><tr><th>Дата</th><th>Имя</th><th>Верно</th><th>IQ</th></tr>${h.map(r=>`<tr><td>${esc(r.d)}</td><td>${esc(r.n)}</td><td>${r.c}</td><td><b>${r.iq}</b></td></tr>`).join('')}</table>`:'<p>Пока нет пройденных тестов.</p>';
  $('histModal').classList.add('on')};
$('histClose').onclick=()=>$('histModal').classList.remove('on');
$('histClear').onclick=()=>{try{localStorage.removeItem(HK)}catch(e){}window._hist()};
$('startBtn').onclick=start;$('startBtn2').onclick=start;if($('startBtn4'))$('startBtn4').onclick=start;
document.querySelectorAll('.totalN').forEach(e=>e.textContent=TOTAL);
document.querySelectorAll('.price').forEach(e=>e.textContent=PRICE);
(function(){
  try{fetch(SB_URL+'rpc/public_stats',{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:'{}'}).then(r=>r.json()).then(d=>{
    if(d&&d.n>=100){const n=d.n.toLocaleString('ru-RU').replace(/,/g,' ');const el=$('hcount2');if(el)el.innerHTML=L2(`👥 Тест прошли уже <b>${n}</b> человек`,`👥 Тестті <b>${n}</b> адам тапсырды`)}}).catch(()=>{})}catch(e){}})();
// sticky start CTA on mobile when main button scrolled away
try{const io=new IntersectionObserver(es=>{const vis=es[0].isIntersecting;const st=!$('start').classList.contains('hidden');$('stickyCta').classList.toggle('on',!vis&&st)});io.observe($('startBtn'))}catch(e){}
/* ===== landing widgets ===== */
// warm-up puzzle (not part of the test)
const WARM={fam:'count',cells:[[{s:'circle',n:1},{s:'circle',n:2},{s:'circle',n:3}],[{s:'square',n:1},{s:'square',n:2},{s:'square',n:3}],[{s:'triangle',n:1},{s:'triangle',n:2},null]],
  opts:[{s:'triangle',n:2},{s:'triangle',n:3},{s:'square',n:3}],a:1};
function renderWarm(){if(!$('warmBox'))return;const q=WARM;let s=`<svg viewBox="0 0 330 330">${DEFS}`;
  for(let r=0;r<3;r++)for(let c=0;c<3;c++){const x=c*110+5,y=r*110+5,last=r==2&&c==2;
    s+=`<rect x="${x}" y="${y}" width="100" height="100" fill="#fff" stroke="${last?'#2f6fe4':'none'}" stroke-width="${last?3.5:0}"/>`;
    s+=last?`<text x="${x+50}" y="${y+66}" text-anchor="middle" font-size="50" font-weight="900" fill="#2f6fe4">?</text>`:FAM.count.render(q.cells[r][c],x+50,y+50)}
  $('warmBox').innerHTML=uniq(s+'</svg>');
  $('warmOpts').innerHTML=q.opts.map((v,k)=>`<button data-i="${k}">${uniq(`<svg viewBox="0 0 100 100">${DEFS}${FAM.count.render(v,50,50)}</svg>`)}</button>`).join('');
  $('warmRes').innerHTML='';
  $('warmOpts').querySelectorAll('button').forEach(b=>b.onclick=()=>{const k=+b.dataset.i,ok=k===q.a;
    $('warmOpts').querySelectorAll('button').forEach(x=>x.classList.remove('ok','no'));
    b.classList.add(ok?'ok':'no');if(!ok)$('warmOpts').querySelector(`[data-i="${q.a}"]`).classList.add('ok');
    try{navigator.vibrate&&navigator.vibrate(ok?15:[20,40,20])}catch(e){}
    $('warmRes').innerHTML=`<div class="msg ${ok?'g':'r'}">${ok?L2('Верно! 🎉 У вас получается — дальше интереснее.','Дұрыс! 🎉 Жақсы бастадыңыз — әрі қарай қызығырақ.'):L2('Почти! В каждой строке фигур становится на одну больше.','Аз қалды! Әр жолда фигуралар бір-бірден көбейеді.')}</div>
      <button class="btn big cta" onclick="start()">${L2('Начать полный тест →','Толық тестті бастау →')}</button>`;
    if(ok)confetti(45)})}
// bell curve
function renderBell(){if(!$('bell'))return;const W=340,H=150,mx=v=>20+(v-55)/(145-55)*(W-40),pdf=v=>Math.exp(-Math.pow((v-100)/15,2)/2),my=v=>H-28-pdf(v)*(H-48);
  const seg=(a,b,c)=>{let d=`M${mx(a)} ${H-28}`;for(let v=a;v<=b;v+=1)d+=`L${mx(v).toFixed(1)} ${my(v).toFixed(1)}`;return `<path d="${d}L${mx(b)} ${H-28}Z" fill="${c}"/>`};
  let s=`<svg viewBox="0 0 ${W} ${H}">`+seg(55,85,'#cbd5e1')+seg(85,115,'#a5b4fc')+seg(115,130,'#818cf8')+seg(130,145,'#7c3aed');
  let d='';for(let v=55;v<=145;v++)d+=(v===55?'M':'L')+mx(v).toFixed(1)+' '+my(v).toFixed(1);
  s+=`<path d="${d}" fill="none" stroke="#312e81" stroke-width="2"/><line x1="20" y1="${H-28}" x2="${W-20}" y2="${H-28}" stroke="#94a3b8"/>`;
  [70,85,100,115,130].forEach(v=>{s+=`<line x1="${mx(v)}" y1="${H-28}" x2="${mx(v)}" y2="${H-23}" stroke="#94a3b8"/><text x="${mx(v)}" y="${H-10}" font-size="11" font-weight="700" text-anchor="middle" fill="#64748b">${v}</text>`});
  s+=`<text x="${mx(100)}" y="${my(100)-8}" font-size="11" font-weight="800" text-anchor="middle" fill="#312e81">${L2('средний','орташа')}</text>`;
  $('bell').innerHTML=s+'</svg>'}

function renderWow(){const w=$('wow');if(!w)return;$('wowRadar').innerHTML=radarSVG([.86,.7,.92,.74,.88],[T('Логика'),T('Внимание'),T('Память'),T('Числа'),T('Пространство')]);
  const num=$('wowNum');const spin=()=>{num.classList.remove('q');let k=0;const iv=setInterval(()=>{num.textContent=75+Math.floor(Math.random()*70);if(++k>=18){clearInterval(iv);num.textContent='?';num.classList.add('q')}},80)};
  const go=()=>{if(w._done)return;w._done=1;w.classList.add('on');spin();setInterval(spin,5200)};
  try{const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){go();io.disconnect()}},{threshold:.35});io.observe(w)}catch(e){go()}}
function renderChal(){const c=$('chal');if(!c)return;clearInterval(c._iv);
  c.innerHTML=`<div class="ch-top"><span>⚡ ${L2('Проверь себя за 10 секунд','10 секундтық сынақ')}</span><span class="ch-sec" id="chSec">10</span></div><div class="ch-bar"><i id="chBar"></i></div>
  <div class="ch-q">${L2('Какое число следующее?','Келесі сан қандай?')}</div><div class="ch-seq">2, 6, 12, 20, 30, <em>?</em></div>
  <div class="ch-o">${[36,40,42,44].map(n=>`<button data-n="${n}">${n}</button>`).join('')}</div><div id="chRes"></div>`;
  let left=10,done=0,started=0;const sec=$('chSec'),bar=$('chBar');
  const finish=(n)=>{if(done)return;done=1;clearInterval(c._iv);c.querySelectorAll('.ch-o button').forEach(b=>{b.disabled=true;if(+b.dataset.n===42)b.classList.add('ok');else if(+b.dataset.n===n)b.classList.add('no')});
    const ok=n===42,msg=ok?L2('🔥 Верно! Разница растёт: +4, +6, +8, +10, +12. Таких вопросов ещё 29 — проверьте свой IQ.','🔥 Дұрыс! Айырма өсіп отырады: +4, +6, +8, +10, +12. Мұндай тағы 29 сұрақ бар — IQ-іңізді тексеріңіз.')
      :n==null?L2('⏰ Время вышло! Ответ — 42 (разница +4, +6, +8, +10, +12). Попробуйте полный тест.','⏰ Уақыт бітті! Жауабы — 42 (айырма +4, +6, +8, +10, +12). Толық тестті байқап көріңіз.')
      :L2('😅 Почти! Ответ — 42: разница растёт +4, +6, +8, +10, +12. Посмотрим, как с остальными 29?','😅 Аз қалды! Жауабы — 42: айырма өседі +4, +6, +8, +10, +12. Қалған 29 сұрақта қалай болар екен?');
    $('chRes').innerHTML=`<div class="ch-r">${msg}<button class="btn big cta" id="chGo">${L2('Пройти тест →','Тестті бастау →')}</button></div>`;
    $('chGo').onclick=()=>$('startBtn').click()};
  const start=()=>{if(started)return;started=1;c._iv=setInterval(()=>{left--;sec.textContent=Math.max(0,left);bar.style.transform=`scaleX(${Math.max(0,left)/10})`;if(left<=0)finish(null)},1000)};
  c.querySelectorAll('.ch-o button').forEach(b=>b.onclick=()=>finish(+b.dataset.n));
  try{const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){start();io.disconnect()}},{threshold:.6});io.observe(c)}catch(e){start()}}
const HIST=[['lincoln','Авраам Линкольн','Авраам Линкольн',125,'АЛ'],['napoleon','Наполеон Бонапарт','Наполеон Бонапарт',135,'НБ'],['washington','Джордж Вашингтон','Джордж Вашингтон',125,'ДВ']];
const HNOTE=()=>L2('Эти цифры не измерены тестом: в 1926 году психолог Кэтрин Кокс оценила их по биографиям.','Бұл сандар тест арқылы өлшенбеген: оларды 1926 жылы психолог Кэтрин Кокс тұлғалардың өмірбаянына қарап бағалаған.');
function renderHist(){const box=$('hist');if(!box)return;clearInterval(box._iv);
  $('hiList').innerHTML=HIST.map((h,i)=>`<div class="hi-row" data-i="${i}"><span>${L2(h[1],h[2])}</span><b>${h[3]}</b></div>`).join('')+`<div class="hi-note">${HNOTE()}</div>`;
  let k=0;const show=()=>{const h=HIST[k];box.querySelectorAll('.hi-row').forEach(r=>r.classList.toggle('on',+r.dataset.i===k));
    const pic=$('hiPic');pic.innerHTML=`<img src="/assets/img/p_${h[0]}.webp" alt="">`;const im=pic.querySelector('img');im.onerror=()=>{pic.innerHTML=`<div class="hi-mono">${h[4]}</div>`};k=(k+1)%HIST.length};
  show();box._iv=setInterval(show,2600)}
function histResult(iq){const el=$('hiRes');if(!el)return;const rows=HIST.map(h=>({n:L2(h[1],h[2]),v:h[3]})).concat([{n:L2('Вы','Сіз'),v:iq,me:1}]).sort((a,b)=>b.v-a.v||(b.me?1:-1));
  el.innerHTML=rows.map(r=>`<div class="hi-row${r.me?' me':''}"><span>${r.me?'👉 ':''}${r.n}</span><b>${r.v}</b></div>`).join('')+`<div class="hi-note">${HNOTE()}</div>`}
function renderSample(){if(!$('smpRadar'))return;$('smpRadar').innerHTML=radarSVG([.8,.65,.9,.7,.85],[T('Логика'),T('Внимание'),T('Память'),T('Числа'),T('Пространство')])}
if(FREE){const f=document.getElementById('faqPay');if(f)f.remove()}
/* ===== language switch ===== */
function syncUrl(){try{if(!/^https?:/.test(location.protocol))return;const want='/'+LANG+'/';const p=location.pathname;
  if(/^\/(kz|ru)(\/|$)/i.test(p)||p==='/'||p==='/index.html'){if(p!==want)history.replaceState(null,'',want+location.search+location.hash)}}catch(e){}}
function applyLang(){document.documentElement.lang=LANG==='kz'?'kk':'ru';
  document.querySelectorAll('[data-kz]').forEach(el=>{if(el.dataset.ru==null)el.dataset.ru=el.innerHTML;el.innerHTML=LANG==='kz'?el.dataset.kz:el.dataset.ru});
  document.querySelectorAll('.totalN').forEach(e=>e.textContent=TOTAL);document.querySelectorAll('.price').forEach(e=>e.textContent=PRICE);
  $('wordTxt').textContent=T(WORD);renderWarm();renderBell();renderSample();renderWow();renderChal();renderHist();
  document.querySelectorAll('.lsw button').forEach(b=>b.classList.toggle('on',b.dataset.l===LANG));
  document.title=L2('iqtest.live — тест IQ','iqtest.live — IQ тест');
  if(!$('test').classList.contains('hidden'))render();
  if(!$('result').classList.contains('hidden'))showResult(1);
  if(!$('paywall').classList.contains('hidden'))showPaywall(1)}
document.querySelectorAll('.lsw button').forEach(b=>b.onclick=()=>{LANG=b.dataset.l;try{localStorage.setItem('iq_lang',LANG)}catch(e){};applyLang();syncUrl()});
applyLang();
