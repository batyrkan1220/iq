// ===== iqtest.live · "Викторина" Reels format: 4 questions × 3 options, timer bar, reveal, last one → comments =====
window.QUIZ=(function(){
const W=1080,H=1920,SR=44100;
// Сұрақтарды енді тек ЖИ (Claude, /api/reels/quiz) жазады — ескі сұрақтар базасы өшірілді.
// ЕРЕЖЕ: эмодзи сұрақтың тақырыбын ғана көрсетеді, ЕШҚАШАН жауапты (дұрыс нұсқаны) көрсетпейді.
const CTA={kz:['','Жауабыңыз дұрыс болса, лайк басыңыз!','','Жауабыңызды комментарийге жазыңыз! Ал IQ деңгейіңізді білу үшін биодағы сілтемеге кіріңіз!'],
 ru:['','Если ваш ответ верный — ставьте лайк!','','Напишите свой ответ в комментариях! А чтобы узнать свой уровень IQ — переходите по ссылке в описании профиля!']};
const OUTRO={kz:['IQ деңгейіңізді білу үшін','биодағы сілтемеге кіріңіз 👆'],ru:['Узнайте свой уровень IQ —','ссылка в описании профиля 👆']};
const shuffle=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
let LASTPOS=-1;
// AI item {emo,col,q,v,o,a,av} → screen item with shuffled options (correct answer not in the same place twice in a row)
function mk(x){const right=x.o[x.a];let ord,pos;do{ord=shuffle(x.o.slice());pos=ord.indexOf(right)}while(pos===LASTPOS&&Math.random()<.85);LASTPOS=pos;
  return{emo:x.emo,col:x.col,q:x.q,v:x.v||x.q.replace(/\n/g,' '),o:ord,a:pos,av:x.av}}
function fromAI(items){return items.map(mk)}
function voices(set,l){const pre=l==='ru'?'Ответ — ':'Жауабы — ';return set.map((q,i)=>({q:q.v,a:i<3?`${pre}${q.av}.${CTA[l][i]?' '+CTA[l][i]:''}`:CTA[l][3]}))}

// ---------- timeline / audio ----------
function timeline(D,c){const L=k=>c[k]?c[k].length/SR:2.5;const T={qs:[]};let s=0;
  D.set.forEach((q,i)=>{const o={s,vq:s+.3};o.ts=+(o.vq+L('q'+i)+.25).toFixed(2);o.ra=o.ts+5;o.va=o.ra+.15;o.e=i<3?+(o.ra+Math.max(2.4,L('a'+i)+.7)).toFixed(2):+(o.va+L('a'+i)+1.6).toFixed(2);T.qs.push(o);s=o.e});
  T.dur=s;return T}
function mix(T,c,bg){const N=Math.ceil(T.dur*SR)+SR,voice=new Float32Array(N),mus=new Float32Array(N),fx=new Float32Array(N);
  const add=(buf,t,s,g=1)=>{const i=Math.floor(t*SR);for(let k=0;k<s.length&&i+k<buf.length;k++)buf[i+k]+=s[k]*g};
  const fade=s=>{const o=Float32Array.from(s),f=Math.min(882,o.length>>2);for(let k=0;k<f;k++){o[k]*=k/f;o[o.length-1-k]*=k/f}return o};
  const tone=(f,l,v,dec)=>{const n=l*SR|0,o=new Float32Array(n);for(let k=0;k<n;k++){const t=k/SR;o[k]=v*Math.sin(2*Math.PI*f*t)*Math.exp(-t*dec)}return o};
  const mx=(...a)=>{const o=new Float32Array(Math.max(...a.map(x=>x.length)));a.forEach(x=>x.forEach((v,k)=>o[k]+=v));return o};
  T.qs.forEach((o,i)=>{if(c['q'+i])add(voice,o.vq,fade(c['q'+i]));if(c['a'+i])add(voice,o.va,fade(c['a'+i]))});
  // light music: plucky arpeggio + soft kick
  const notes=[523.3,659.3,784,659.3,587.3,698.5,880,698.5],beat=60/110/2;const pl=f=>{const n=.25*SR|0,o=new Float32Array(n);for(let k=0;k<n;k++){const t=k/SR;o[k]=(.06*Math.sin(2*Math.PI*f*t)+.02*Math.sin(4*Math.PI*f*t))*Math.exp(-t*12)}return o};
  const kick=(()=>{const n=.3*SR|0,o=new Float32Array(n);let ph=0;for(let k=0;k<n;k++){const t=k/SR;ph+=2*Math.PI*(50+80*Math.exp(-t*30))/SR;o[k]=.35*Math.sin(ph)*Math.exp(-t*10)}return o})();
  if(bg===false){/* no music */}
  else if(bg&&bg.length>SR*4){
    // background track is an exact number of bars → loop it end-to-end (no overlap, so it never sounds doubled)
    const o=Float32Array.from(bg,v=>v*.42);for(let st=0;st<N;st+=bg.length)add(mus,st/SR,o)}
  else{const P=notes.map(pl);for(let b=0;b*beat<T.dur+1;b++){add(mus,b*beat,P[b%8]);if(b%4===0)add(mus,b*beat,kick)}}
  const win=.25*SR|0;let acc=0;const env=new Float32Array(N);for(let k=0;k<N;k++){acc+=Math.abs(voice[k]);if(k>=win)acc-=Math.abs(voice[k-win]);env[k]=acc/win}
  const end=T.dur*SR|0;for(let k=0;k<N;k++){const d=1-(bg?.72:.6)*Math.min(1,env[Math.min(N-1,k+(win>>1))]/.03);const fi=Math.min(1,k/(.6*SR)),fo=k>end?0:Math.min(1,(end-k)/(1.5*SR));mus[k]*=d*fi*fo*.8}
  // ---------- sound effects v4: classic TV / app IQ-quiz style ----------
  // question reveal "whoosh-pling", option pops, wooden clock tick-tock, countdown beeps,
  // bright two-note "correct!" ding, dramatic "dun-dun" before the comment-bait question
  const hz=m=>440*Math.pow(2,(m-69)/12);
  // band-limited additive voice: kind 'tri' | 'sq' | 'sin'; env: attack a (s), exp decay d
  const vox=(f0,len,vol,kind,a,d,f1)=>{const n=len*SR|0,o=new Float32Array(n),H=kind==='sin'?[1]:[1,3,5,7,9,11];let ph=0;
    for(let k=0;k<n;k++){const t=k/SR,p=k/n,f=f1?f0*Math.pow(f1/f0,p):f0;ph+=2*Math.PI*f/SR;let v=0;
      for(const h of H){if(f*h>SR/2.2)break;v+=kind==='tri'?((h-1)/2%2?-1:1)*Math.sin(h*ph)/(h*h):kind==='sq'?Math.sin(h*ph)/h:Math.sin(ph)}
      const e=(t<a?t/a:Math.exp(-(t-a)*d))*(k>n-200?(n-k)/200:1);o[k]=vol*e*v}return o};
  const bellv=(m,len,vol)=>{const f=hz(m);return mx(vox(f,len,vol,'sin',.002,5),vox(f*2,len*.7,vol*.35,'sin',.002,8),vox(f*3.01,len*.5,vol*.15,'sin',.001,12),vox(f*4.2,len*.25,vol*.08,'sin',.001,20))};
  const wood=(f,vol)=>mx(vox(f,.06,vol,'sin',.0006,70),vox(f*2.4,.04,vol*.45,'sin',.0004,110),vox(f*.5,.05,vol*.3,'sin',.0008,60));
  // question reveal: fast rising sweep → bright "pling"
  const reveal=new Float32Array(.9*SR|0);add(reveal,0,vox(260,.16,.11,'tri',.01,6,1050));add(reveal,.13,bellv(88,.75,.16));add(reveal,.13,bellv(95,.5,.06));
  const opPop=[0,1,2].map(k=>vox(700+k*120,.07,.17,'sin',.002,35,350+k*60));      // "pop" per option
  const tick=wood(1900,.22),tock=wood(1350,.22);                                     // clock tick-tock
  const beep=vox(hz(81),.14,.07,'sq',.004,9);                                       // countdown beep (A5)
  const correct=new Float32Array(1.1*SR|0);add(correct,0,mx(bellv(84,.5,.15),vox(hz(84),.18,.05,'tri',.003,10)));add(correct,.11,mx(bellv(88,.9,.17),vox(hz(88),.3,.05,'tri',.003,7)));add(correct,.11,bellv(91,.8,.07)); // C7→E7(+G) ding-ding!
  const dun=new Float32Array(1.4*SR|0);add(dun,0,mx(vox(hz(45),.35,.22,'sq',.005,6),vox(hz(57),.35,.08,'tri',.005,6)));add(dun,.38,mx(vox(hz(44),1.0,.24,'sq',.005,2.6),vox(hz(56),1.0,.09,'tri',.005,2.6))); // A2 → G#2 "dun-duuun"
  T.qs.forEach((o,i)=>{/* no reveal sound at the start of a question (removed on request) */
    opPop.forEach((x,k)=>add(fx,o.s+.27+k*.08,x));
    for(let k=0;k<5;k++){add(fx,o.ts+k,k%2?tock:tick);add(fx,o.ts+k+.5,k%2?tick:tock,.55);if(k>=3)add(fx,o.ts+k,beep)}
    add(fx,o.ra,i<T.qs.length-1?correct:dun)});
  const out=new Float32Array(N);let m=0;for(let k=0;k<N;k++){out[k]=voice[k]+mus[k]+fx[k];m=Math.max(m,Math.abs(out[k]))}const g=m>.97?.97/m:1;for(let k=0;k<N;k++)out[k]*=g;return out}

// ---------- drawing (iqtest.live riddle style) ----------
const F=(w,s)=>`${w} ${s}px Manrope, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
const EF=s=>`${s}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`;
const cl=x=>Math.max(0,Math.min(1,x)),ease=x=>1-Math.pow(1-x,3);
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function wrap(ctx,text,maxW){const out=[];String(text).split('\n').forEach(par=>{let line='';par.split(' ').forEach(w=>{const t=line?line+' '+w:w;if(ctx.measureText(t).width>maxW&&line){out.push(line);line=w}else line=t});out.push(line)});return out}
let BG=null;function bg(ctx){if(!BG){BG=document.createElement('canvas');BG.width=W;BG.height=H;const b=BG.getContext('2d');
  const lg=b.createLinearGradient(0,0,W*.4,H);lg.addColorStop(0,'#fbe3f1');lg.addColorStop(.45,'#efe2fb');lg.addColorStop(1,'#ddd0fb');b.fillStyle=lg;b.fillRect(0,0,W,H);
  [[W*.1,H*.06,620,'rgba(255,207,236,.9)'],[W*.95,H*.2,560,'rgba(226,207,255,.9)'],[W*.5,H*1.02,760,'rgba(208,190,255,.85)'],[W*.05,H*.7,420,'rgba(255,214,240,.55)']].forEach(([x,y,r,c])=>{const g=b.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,c);g.addColorStop(1,'rgba(255,255,255,0)');b.fillStyle=g;b.fillRect(0,0,W,H)});
  b.fillStyle='rgba(13,12,22,.55)';b.font=F(800,34);b.textAlign='center';b.textBaseline='middle';b.fillText('iqtest.live',W/2,H-86)}ctx.drawImage(BG,0,0)}
const INK='#0d0c16';function grad(ctx,x0,x1){const g=ctx.createLinearGradient(x0,0,x1,0);g.addColorStop(0,'#7c3aed');g.addColorStop(.55,'#c13fe0');g.addColorStop(1,'#ff4fa3');return g}
function draw(ctx,D,t){const T=D.tl;bg(ctx);ctx.textAlign='center';ctx.textBaseline='alphabetic';
  let i=T.qs.findIndex(o=>t<o.e);if(i<0)i=T.qs.length-1;const o=T.qs[i],q=D.set[i],lt=t-o.s,n=T.qs.length;
  const ap=i===0?1:cl(lt/.3);const revealed=t>=o.ra,last=i===n-1;
  // progress bar on top
  ctx.fillStyle='rgba(255,255,255,.65)';rr(ctx,60,44,W-120,14,7);ctx.fill();const pw=(W-120)*cl(t/T.dur);if(pw>14){ctx.fillStyle=grad(ctx,60,W-60);rr(ctx,60,44,pw,14,7);ctx.fill()}
  // step dots
  const dw=76,gap=22,x0=W/2-(n*dw+(n-1)*gap)/2;ctx.font=F(800,46);ctx.textBaseline='middle';
  for(let k=0;k<n;k++){const cx=x0+k*(dw+gap)+dw/2,cy=190;ctx.save();if(k===i){ctx.shadowColor='rgba(13,12,22,.35)';ctx.shadowBlur=24;ctx.shadowOffsetY=10;ctx.fillStyle=INK}else{ctx.fillStyle=k<i?'#22c55e':'rgba(255,255,255,.75)'}ctx.beginPath();ctx.arc(cx,cy,dw/2,0,7);ctx.fill();ctx.restore();ctx.fillStyle=k===i||k<i?'#fff':INK;ctx.fillText(k<i?'✓':String(k+1),cx,cy+3)}
  // frosted card behind question + picture (site style)
  {ctx.textBaseline='alphabetic';ctx.font=F(800,70);const qn=wrap(ctx,q.q,940).length,cy0=268,ch=(350+qn*82+10+400+34)-cy0;ctx.save();ctx.globalAlpha=ap;ctx.shadowColor='rgba(80,40,140,.18)';ctx.shadowBlur=60;ctx.shadowOffsetY=26;ctx.fillStyle='rgba(255,255,255,.5)';rr(ctx,50,cy0,W-100,ch,60);ctx.fill();ctx.shadowColor='transparent';ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.85)';ctx.stroke();ctx.restore()}
  // mascot (bottom-right), gentle bob
  const outro=last&&t>=o.ra;
  if(D.mascot&&!outro){const mh=330,mw=mh*D.mascot.width/D.mascot.height;ctx.save();ctx.translate(W-mw-40,H-mh-40+Math.sin(t*2)*6);ctx.drawImage(D.mascot,0,0,mw,mh);ctx.restore()}
  // question
  ctx.textBaseline='alphabetic';ctx.save();ctx.globalAlpha=ap;ctx.translate(0,(1-ease(ap))*30);ctx.font=F(800,70);try{ctx.letterSpacing='-2px'}catch(e){}ctx.fillStyle=INK;
  ctx.shadowColor='rgba(255,255,255,.6)';ctx.shadowBlur=0;ctx.shadowOffsetY=0;const ql=wrap(ctx,q.q,940);ql.forEach((l,k)=>ctx.fillText(l,W/2,350+k*82));ctx.restore();
  // picture tile (stays as is)
  const tw=600,th=400,tx=(W-tw)/2,ty=350+ql.length*82+10;ctx.save();ctx.globalAlpha=ap;ctx.shadowColor='rgba(80,40,140,.22)';ctx.shadowBlur=50;ctx.shadowOffsetY=24;ctx.fillStyle='rgba(255,255,255,.72)';rr(ctx,tx,ty,tw,th,48);ctx.fill();ctx.shadowColor='transparent';ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.9)';ctx.stroke();ctx.restore();
  ctx.save();ctx.globalAlpha=ap;rr(ctx,tx,ty,tw,th,48);ctx.clip();const rg=ctx.createRadialGradient(W/2,ty+th/2,10,W/2,ty+th/2,tw*.6);rg.addColorStop(0,'rgba(255,255,255,.7)');rg.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=rg;ctx.fillRect(tx,ty,tw,th);
  if(q.img){const z=1.03+.015*Math.sin(t*1.6);ctx.drawImage(q.img,W/2-tw*z/2,ty+th/2-th*z/2,tw*z,th*z)}
  else{ctx.textBaseline='middle';ctx.font=EF(250);ctx.fillText(q.emo,W/2,ty+th/2+12+Math.sin(t*2.2)*6)}ctx.restore();
  // timer bar (old style: black outline, purple fill) + seconds
  const by=ty+th+44,bx=110,bw=W-220,bh=84;
  if(!revealed){ctx.save();ctx.globalAlpha=ap;ctx.fillStyle='rgba(255,255,255,.72)';ctx.shadowColor='rgba(80,40,140,.15)';ctx.shadowBlur=30;ctx.shadowOffsetY=12;rr(ctx,bx,by,bw,bh,42);ctx.fill();ctx.shadowColor='transparent';ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.95)';ctx.stroke();
    // bar grows smoothly from zero (no minimum width → no stall at the start of the countdown)
    const w8=Math.max(0,t-o.ts),p=cl(w8/5),fw=(bw-16)*p;if(t>=o.ts&&fw>1){ctx.fillStyle=grad(ctx,bx,bx+bw);rr(ctx,bx+8,by+8,fw,bh-16,Math.min(34,fw/2));ctx.fill()}
    // seconds appear only when the countdown really starts; each new number pops in, in sync with the tick sound
    if(t>=o.ts){const sec=Math.max(1,Math.ceil(5-w8)),fr=w8-Math.floor(w8),pz=1+.45*Math.exp(-fr*9);ctx.translate(W/2,by+bh+40);ctx.scale(pz,pz);
      ctx.font=F(800,48);ctx.fillStyle=sec<=2?'#e0409a':INK;ctx.textBaseline='middle';ctx.fillText(String(sec),0,0)}ctx.restore()}
  // options
  const oy=by+bh+100,ow=780,oh=118,og=24;ctx.font=F(800,q.o.some(s=>s.length>14)?50:q.o.some(s=>s.length>10)?58:64);
  q.o.forEach((s,k)=>{const p=i===0?1:cl((lt-.15-k*.08)/.3);const ok=revealed&&!last&&k===q.a;const y=oy+k*(oh+og);
    ctx.save();ctx.globalAlpha=p*(revealed&&!last&&!ok?.55:1);ctx.translate(0,(1-ease(p))*36);
    const sc=ok?1+.05*Math.max(0,Math.sin((t-o.ra)*10))*Math.exp(-(t-o.ra)*2):1;ctx.translate(W/2,y+oh/2);ctx.scale(sc,sc);ctx.translate(-W/2,-(y+oh/2));
    ctx.shadowColor=ok?'rgba(34,197,94,.4)':'rgba(80,40,140,.14)';ctx.shadowBlur=ok?40:26;ctx.shadowOffsetY=ok?16:10;ctx.fillStyle=ok?'#22c55e':'rgba(255,255,255,.8)';rr(ctx,(W-ow)/2,y,ow,oh,oh/2);ctx.fill();ctx.shadowColor='transparent';
    if(!ok){ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.95)';rr(ctx,(W-ow)/2,y,ow,oh,oh/2);ctx.stroke()}
    ctx.fillStyle=ok?'#fff':INK;ctx.textBaseline='middle';ctx.fillText(ok?s+'  ✓':s,W/2,y+oh/2+3);ctx.restore()});
  // outro: link-in-bio call to action (last question, after the timer)
  if(outro){const p=ease(cl((t-o.ra)/.45)),L=OUTRO[D.lang==='ru'?'ru':'kz'],cy=H-340,chh=280;ctx.save();ctx.globalAlpha=p;ctx.translate(0,(1-p)*60);
    ctx.shadowColor='rgba(80,40,140,.3)';ctx.shadowBlur=60;ctx.shadowOffsetY=24;ctx.fillStyle='rgba(255,255,255,.9)';rr(ctx,70,cy,W-140,chh,56);ctx.fill();ctx.shadowColor='transparent';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=INK;ctx.font=F(800,50);ctx.fillText(L[0],W/2,cy+62);ctx.fillStyle=grad(ctx,200,W-200);ctx.fillText(L[1],W/2,cy+122);
    const pw=420,ph=64,px=(W-pw)/2,py=cy+chh-ph-24,pz=1+.04*Math.sin((t-o.ra)*5);ctx.translate(W/2,py+ph/2);ctx.scale(pz,pz);ctx.translate(-W/2,-(py+ph/2));
    ctx.fillStyle=INK;rr(ctx,px,py,pw,ph,ph/2);ctx.fill();ctx.fillStyle='#fff';ctx.font=F(800,34);ctx.fillText('iqtest.live',W/2,py+ph/2+2);ctx.restore()}
}
return{fromAI,voices,timeline,mix,draw,CTA};
})();
