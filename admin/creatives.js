// Admin → «Креативы»: ad creatives for targeting. FLUX draws a scene picture (no text);
// this page lays the brand background, headline, logo and CTA over it in every ad format and gives PNG downloads.
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FORMATS=[
  {id:'1x1',name:'1:1 · лента',w:1080,h:1080},
  {id:'4x5',name:'4:5 · Instagram лента',w:1080,h:1350},
  {id:'9x16',name:'9:16 · Stories / Reels / TikTok',w:1080,h:1920},
  {id:'191',name:'1.91:1 · Facebook',w:1200,h:628},
];
const TEXTS=[
  {h:'Сіздің IQ деңгейіңіз қанша?',s:'20 арнайы тапсырма · қазақ тілінде',c:'Тестті бастау'},
  {h:'Логикаңызды тексеріп көріңіз',s:'Онлайн IQ тест қазақ тілінде',c:'Тексеру'},
  {h:'Ойлау қабілетіңіз қаншалықты мықты?',s:'20 тапсырма · шамамен 10–12 минут',c:'Тестті бастау'},
  {h:'Мықты тұстарыңызды біліңіз',s:'IQ тест · 20 арнайы тапсырма',c:'Өтіп көру'},
  {h:'Неше ұпай жинайсыз?',s:'Өзіңізді IQ тестте тексеріңіз',c:'Бастау'},
];
const SCENES=[['brain','Жарқыраған ми'],['thinker','Ойланып тұрған қыз'],['student','Жұмбақ шешіп отырған жігіт'],['puzzle','Пазл бөліктері'],
  ['bulb','Идея шамы'],['rocket','Кітаптан ұшқан зымыран'],['maze','Лабиринт'],['chess','Шахмат патшасы'],['custom','Өз сипаттамам (ағылшынша)']];
let MARK=null;
function loadMark(){if(MARK)return MARK;MARK=new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src='../assets/logo/iqtest-mark.svg?v=1'});return MARK}
function loadImg(src){return new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src})}
async function fonts(){try{await Promise.all([document.fonts.load('800 80px Manrope'),document.fonts.load('700 40px Manrope')])}catch(e){}}
const F=(w,s)=>`${w} ${s}px Manrope, Inter, system-ui, sans-serif`;
function wrap(ctx,text,maxW){const out=[];String(text).split('\n').forEach(par=>{let line='';par.split(/\s+/).forEach(w=>{const t=line?line+' '+w:w;if(ctx.measureText(t).width>maxW&&line){out.push(line);line=w}else line=t});out.push(line)});return out}
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function bg(ctx,W,H){
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#fbe3f1');g.addColorStop(.45,'#efe2fb');g.addColorStop(1,'#ddd0fb');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  [[.12,-.04,.65,'rgba(255,217,239,.9)'],[1,.1,.6,'rgba(232,213,255,.9)'],[.5,1.08,.7,'rgba(214,196,255,.8)']].forEach(([x,y,r,c])=>{const rg=ctx.createRadialGradient(x*W,y*H,0,x*W,y*H,r*Math.max(W,H));rg.addColorStop(0,c);rg.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=rg;ctx.fillRect(0,0,W,H)});
}
function cover(ctx,img,x,y,w,h){const s=Math.max(w/img.width,h/img.height),iw=img.width*s,ih=img.height*s;ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih)}
function logo(ctx,mark,x,y,size){ // mark + "iqtest.live"
  if(mark)ctx.drawImage(mark,x,y,size,size);
  ctx.font=F(800,size*.62);ctx.textBaseline='middle';ctx.fillStyle='#0d0c16';const tx=x+size*1.12,ty=y+size/2;ctx.fillText('iqtest',tx,ty);
  const w1=ctx.measureText('iqtest').width,w2=ctx.measureText('.live').width,g=ctx.createLinearGradient(tx+w1,0,tx+w1+w2,0);g.addColorStop(0,'#7c3aed');g.addColorStop(.55,'#c13fe0');g.addColorStop(1,'#ff4fa3');ctx.fillStyle=g;ctx.fillText('.live',tx+w1,ty);ctx.textBaseline='alphabetic'}
function cta(ctx,text,x,y,h,maxW,center){ctx.font=F(800,h*.38);const tw=Math.min(maxW,ctx.measureText(text).width+h*1.6),bx=center?x-tw/2:x;
  ctx.save();ctx.shadowColor='rgba(13,12,22,.35)';ctx.shadowBlur=h*.5;ctx.shadowOffsetY=h*.18;rr(ctx,bx,y,tw,h,h/2);ctx.fillStyle='#0d0c16';ctx.fill();ctx.restore();
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text+'  →',bx+tw/2,y+h/2+2);ctx.textAlign='left';ctx.textBaseline='alphabetic'}
function fitText(ctx,text,weight,start,min,maxW,maxLines){for(let s=start;s>=min;s-=2){ctx.font=F(weight,s);const l=wrap(ctx,text,maxW);if(l.length<=maxLines)return {s,l}}ctx.font=F(weight,min);return {s:min,l:wrap(ctx,text,maxW).slice(0,maxLines)}}
function card(ctx,img,x,y,w,h,r){ctx.save();ctx.shadowColor='rgba(80,40,140,.28)';ctx.shadowBlur=60;ctx.shadowOffsetY=24;rr(ctx,x,y,w,h,r);ctx.fillStyle='#fff';ctx.fill();ctx.restore();
  ctx.save();rr(ctx,x,y,w,h,r);ctx.clip();if(img)cover(ctx,img,x,y,w,h);else{const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#ede9fe');g.addColorStop(1,'#fbcfe8');ctx.fillStyle=g;ctx.fillRect(x,y,w,h)}ctx.restore();
  ctx.save();rr(ctx,x+1,y+1,w-2,h-2,r);ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=3;ctx.stroke();ctx.restore()}
function draw(fmt,img,mark,t){
  const W=fmt.w,H=fmt.h,c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');bg(ctx,W,H);
  if(fmt.id==='191'){ // horizontal: text left, picture right
    const P=56;logo(ctx,mark,P,P,64);const tw=W*.5-P;
    const hd=fitText(ctx,t.h,800,64,40,tw,3);let y=P+64+40;ctx.fillStyle='#0d0c16';hd.l.forEach(l=>{ctx.font=F(800,hd.s);y+=hd.s*1.1;ctx.fillText(l,P,y)});
    if(t.s){ctx.font=F(700,28);ctx.fillStyle='#5d5a72';wrap(ctx,t.s,tw).slice(0,2).forEach(l=>{y+=40;ctx.fillText(l,P,y)})}
    cta(ctx,t.c,P,H-P-84,84,tw,false);
    card(ctx,img,W*.53,P,W*.47-P,H-2*P,40);return c}
  const P=Math.round(W*.065),tall=H/W,story=tall>1.6;
  // Stories/Reels: keep text out of the top ~220 px and bottom ~260 px that the app UI covers
  const top=story?220:P,bottom=story?H-260:H-P,ls=Math.round(W*(story?.075:.065));
  logo(ctx,mark,P,top,ls);
  const hs=story?112:tall>1.2?92:84;const hd=fitText(ctx,t.h,800,hs,56,W-2*P,3);
  let y=top+ls+(story?60:44);ctx.fillStyle='#0d0c16';ctx.font=F(800,hd.s);hd.l.forEach(l=>{y+=hd.s*1.08;ctx.fillText(l,P,y)});
  if(t.s){const ss=Math.max(32,Math.round(hd.s*.42));ctx.font=F(700,ss);ctx.fillStyle='#5d5a72';y+=ss*.5;wrap(ctx,t.s,W-2*P).slice(0,2).forEach(l=>{y+=ss*1.35;ctx.fillText(l,P,y)})}
  const ch=Math.round(W*(story?.12:.105)),cy=bottom-ch,iy=y+(story?56:40),ih=cy-iy-(story?56:40);
  card(ctx,img,P,iy,W-2*P,Math.max(200,ih),48);
  cta(ctx,t.c,W/2,cy,ch,W-2*P,true);
  return c}
async function sceneImg(scene,custom){
  const r=await fetch('/api/creative/bg',{method:'POST',headers:{Authorization:'Bearer '+await tok(),'Content-Type':'application/json'},body:JSON.stringify({scene,custom})});
  const j=await r.json().catch(()=>({}));if(!j.ok)throw new Error(j.error||('HTTP '+r.status));return loadImg(j.src)}
function ui(){
  const box=$('t-cr');if(box.dataset.ready)return;box.dataset.ready=1;
  box.innerHTML=`<div class="card" style="display:grid;gap:16px">
  <div class="note info">FLUX тек суретті салады. Мәтін, логотип және батырма сайттың дизайнымен үстінен қойылады, сондықтан қазақша әріптер бұзылмайды. Бір сурет ≈ $0,001.</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">
   <label>Дайын мәтін<select id="crPreset">${TEXTS.map((t,i)=>`<option value="${i}">${esc(t.h)}</option>`).join('')}</select></label>
   <label>Сурет сахнасы<select id="crScene">${SCENES.map(([k,n])=>`<option value="${k}">${esc(n)}</option>`).join('')}</select></label>
  </div>
  <label id="crCustomL" class="hide">Сурет сипаттамасы (ағылшынша, мәтінсіз)<input id="crCustom" maxlength="300" placeholder="e.g. a happy girl holding a glowing puzzle piece"></label>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">
   <label>Тақырып<input id="crH" maxlength="70"></label>
   <label>Қосымша жол<input id="crS" maxlength="70"></label>
   <label>Батырма мәтіні<input id="crC" maxlength="22"></label>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center">
   ${FORMATS.map(f=>`<label style="display:flex;gap:6px;align-items:center;font-weight:700"><input type="checkbox" class="crF" value="${f.id}" checked style="width:auto">${esc(f.name)}</label>`).join('')}
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
   <label style="display:flex;gap:8px;align-items:center;font-weight:700">Нұсқа саны<select id="crN" style="width:auto"><option>1</option><option selected>2</option><option>3</option><option>4</option></select></label>
   <button class="btn" id="crGo">🎨 Креатив жасау</button><span id="crSt" style="color:var(--mut);font-weight:700"></span>
  </div></div>
  <div id="crOut" style="display:grid;gap:18px;margin-top:18px"></div>`;
  const setT=i=>{const t=TEXTS[i];$('crH').value=t.h;$('crS').value=t.s;$('crC').value=t.c};setT(0);
  $('crPreset').onchange=e=>setT(+e.target.value);
  $('crScene').onchange=e=>$('crCustomL').classList.toggle('hide',e.target.value!=='custom');
  $('crGo').onclick=run;
}
async function run(){
  const btn=$('crGo');if(btn.disabled)return;btn.disabled=true;
  const t={h:$('crH').value.trim()||TEXTS[0].h,s:$('crS').value.trim(),c:$('crC').value.trim()||'Бастау'};
  const fm=[...document.querySelectorAll('.crF:checked')].map(x=>FORMATS.find(f=>f.id===x.value));if(!fm.length){$('crSt').textContent='Кемі бір формат таңдаңыз';btn.disabled=false;return}
  const scene=$('crScene').value,custom=scene==='custom'?$('crCustom').value.trim():'',n=+$('crN').value;
  await fonts();const mark=await loadMark();
  for(let k=0;k<n;k++){
    $('crSt').textContent=`FLUX сурет салып жатыр (${k+1}/${n})…`;
    let img=null,err='';try{img=await sceneImg(scene,custom)}catch(e){err=e.message}
    const row=document.createElement('div');row.className='card';row.style.cssText='display:grid;gap:12px';
    const stamp=new Date().toISOString().slice(0,16).replace(/[-:T]/g,'');
    row.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><b>Нұсқа · ${esc(t.h)}</b>${err?`<span class="pill" style="background:#ffe1ee;color:#9d174d">Сурет салынбады: ${esc(err).slice(0,90)} — фон ғана</span>`:''}</div><div class="crGrid" style="display:flex;gap:14px;overflow-x:auto;align-items:flex-start;padding-bottom:6px"></div>`;
    $('crOut').prepend(row);const grid=row.querySelector('.crGrid');
    for(const f of fm){const c=draw(f,img,mark,t);const url=await new Promise(r=>c.toBlob(b=>r(URL.createObjectURL(b)),'image/png'));
      const name=`iqtest-${f.id}-${stamp}-${k+1}.png`,hh=Math.round(260*f.h/f.w);
      grid.insertAdjacentHTML('beforeend',`<figure style="margin:0;display:grid;gap:6px;flex:none"><img src="${url}" alt="${esc(f.name)}" style="width:${f.id==='191'?380:260}px;height:auto;border-radius:14px;box-shadow:0 14px 30px -18px rgba(80,40,140,.5)"><figcaption style="display:flex;justify-content:space-between;gap:8px;font-size:13px;font-weight:700;color:var(--mut)">${esc(f.name)}<a href="${url}" download="${name}">⬇ PNG</a></figcaption></figure>`)}
  }
  $('crSt').textContent='Дайын. Әр суреттің астындағы «⬇ PNG» арқылы жүктеп алыңыз.';btn.disabled=false;
}
window.loadCr=async()=>{ui()};
})();
