// ===== iqtest.live · "Викторина" Reels format: 4 questions × 3 options, timer bar, reveal, last one → comments =====
window.QUIZ=(function(){
const W=1080,H=1920,SR=44100;
// Сұрақтарды енді тек ЖИ (Claude, /api/reels/quiz) жазады — ескі сұрақтар базасы өшірілді.
// ЕРЕЖЕ: эмодзи сұрақтың тақырыбын ғана көрсетеді, ЕШҚАШАН жауапты (дұрыс нұсқаны) көрсетпейді.
const CTA={kz:['','Жауабыңыз дұрыс болса, лайк басыңыз!','','Жауабыңызды комментарийге жазыңыз!'],
 ru:['','Если ваш ответ верный — ставьте лайк!','','Напишите свой ответ в комментариях!']};
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
function mix(T,c){const N=Math.ceil(T.dur*SR)+SR,voice=new Float32Array(N),mus=new Float32Array(N),fx=new Float32Array(N);
  const add=(buf,t,s,g=1)=>{const i=Math.floor(t*SR);for(let k=0;k<s.length&&i+k<buf.length;k++)buf[i+k]+=s[k]*g};
  const fade=s=>{const o=Float32Array.from(s),f=Math.min(882,o.length>>2);for(let k=0;k<f;k++){o[k]*=k/f;o[o.length-1-k]*=k/f}return o};
  const tone=(f,l,v,dec)=>{const n=l*SR|0,o=new Float32Array(n);for(let k=0;k<n;k++){const t=k/SR;o[k]=v*Math.sin(2*Math.PI*f*t)*Math.exp(-t*dec)}return o};
  const mx=(...a)=>{const o=new Float32Array(Math.max(...a.map(x=>x.length)));a.forEach(x=>x.forEach((v,k)=>o[k]+=v));return o};
  T.qs.forEach((o,i)=>{if(c['q'+i])add(voice,o.vq,fade(c['q'+i]));if(c['a'+i])add(voice,o.va,fade(c['a'+i]))});
  // light music: plucky arpeggio + soft kick
  const notes=[523.3,659.3,784,659.3,587.3,698.5,880,698.5],beat=60/110/2;const pl=f=>{const n=.25*SR|0,o=new Float32Array(n);for(let k=0;k<n;k++){const t=k/SR;o[k]=(.06*Math.sin(2*Math.PI*f*t)+.02*Math.sin(4*Math.PI*f*t))*Math.exp(-t*12)}return o};
  const kick=(()=>{const n=.3*SR|0,o=new Float32Array(n);let ph=0;for(let k=0;k<n;k++){const t=k/SR;ph+=2*Math.PI*(50+80*Math.exp(-t*30))/SR;o[k]=.35*Math.sin(ph)*Math.exp(-t*10)}return o})();
  const P=notes.map(pl);for(let b=0;b*beat<T.dur+1;b++){add(mus,b*beat,P[b%8]);if(b%4===0)add(mus,b*beat,kick)}
  const win=.25*SR|0;let acc=0;const env=new Float32Array(N);for(let k=0;k<N;k++){acc+=Math.abs(voice[k]);if(k>=win)acc-=Math.abs(voice[k-win]);env[k]=acc/win}
  const end=T.dur*SR|0;for(let k=0;k<N;k++){const d=1-.6*Math.min(1,env[Math.min(N-1,k+(win>>1))]/.03);const fi=Math.min(1,k/(.6*SR)),fo=k>end?0:Math.min(1,(end-k)/(1.5*SR));mus[k]*=d*fi*fo*.8}
  const tick=mx(tone(1500,.04,.12,100),tone(750,.04,.06,100)),ding=mx(tone(880,.6,.28,5),tone(1320,.6,.18,6),tone(1760,.5,.1,7)),pop=mx(tone(660,.2,.25,12),tone(990,.2,.15,12));
  const wn=.28*SR|0,wh=new Float32Array(wn);for(let k=0;k<wn;k++)wh[k]=(Math.random()*2-1)*.05*Math.sin(Math.PI*k/wn);
  T.qs.forEach((o,i)=>{add(fx,o.s,wh);for(let k=0;k<10;k++)add(fx,o.ts+k*.5,tick,k>=7?1.3:.8);add(fx,o.ra,i<3?ding:pop,.8)});
  const out=new Float32Array(N);let m=0;for(let k=0;k<N;k++){out[k]=voice[k]+mus[k]+fx[k];m=Math.max(m,Math.abs(out[k]))}const g=m>.97?.97/m:1;for(let k=0;k<N;k++)out[k]*=g;return out}

// ---------- drawing (iqtest.live riddle style) ----------
const F=(w,s)=>`${w} ${s}px Manrope, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
const EF=s=>`${s}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`;
const cl=x=>Math.max(0,Math.min(1,x)),ease=x=>1-Math.pow(1-x,3);
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function wrap(ctx,text,maxW){const out=[];String(text).split('\n').forEach(par=>{let line='';par.split(' ').forEach(w=>{const t=line?line+' '+w:w;if(ctx.measureText(t).width>maxW&&line){out.push(line);line=w}else line=t});out.push(line)});return out}
let BG=null;function bg(ctx){if(!BG){BG=document.createElement('canvas');BG.width=W;BG.height=H;const b=BG.getContext('2d');b.fillStyle='#f7f8fb';b.fillRect(0,0,W,H);b.fillStyle='#c9cdd8';for(let y=24;y<H;y+=48)for(let x=24;x<W;x+=48){b.beginPath();b.arc(x,y,2.6,0,7);b.fill()}}ctx.drawImage(BG,0,0)}
function draw(ctx,D,t){const T=D.tl;bg(ctx);ctx.textAlign='center';ctx.textBaseline='alphabetic';
  let i=T.qs.findIndex(o=>t<o.e);if(i<0)i=T.qs.length-1;const o=T.qs[i],q=D.set[i],lt=t-o.s,n=T.qs.length;
  const ap=cl(lt/.3);const revealed=t>=o.ra,last=i===n-1;
  // progress bar on top
  const g=ctx.createLinearGradient(0,0,W,0);g.addColorStop(0,'#4f46e5');g.addColorStop(1,'#a855f7');ctx.fillStyle=g;ctx.fillRect(0,0,W*cl(t/T.dur),14);
  // step dots
  const dw=76,gap=22,x0=W/2-(n*dw+(n-1)*gap)/2;ctx.font=F(800,46);ctx.textBaseline='middle';
  for(let k=0;k<n;k++){const cx=x0+k*(dw+gap)+dw/2,cy=190;if(k===i){ctx.save();ctx.shadowColor='rgba(91,33,182,.35)';ctx.shadowBlur=20;ctx.shadowOffsetY=8;ctx.fillStyle='#5b21b6';ctx.beginPath();ctx.arc(cx,cy,dw/2,0,7);ctx.fill();ctx.restore();ctx.fillStyle='#fff'}else ctx.fillStyle=k<i?'#16a34a':'#111';ctx.fillText(String(k+1),cx,cy+3)}
  // question
  ctx.textBaseline='alphabetic';ctx.save();ctx.globalAlpha=ap;ctx.translate(0,(1-ease(ap))*30);ctx.font=F(800,70);try{ctx.letterSpacing='-2px'}catch(e){}ctx.fillStyle='#111';
  ctx.shadowColor='rgba(0,0,0,.10)';ctx.shadowBlur=10;ctx.shadowOffsetY=4;const ql=wrap(ctx,q.q,940);ql.forEach((l,k)=>ctx.fillText(l,W/2,350+k*82));ctx.restore();
  // picture tile (stays as is)
  const tw=600,th=400,tx=(W-tw)/2,ty=350+ql.length*82+10;ctx.save();ctx.globalAlpha=ap;ctx.shadowColor='rgba(20,20,60,.10)';ctx.shadowBlur=34;ctx.shadowOffsetY=14;ctx.fillStyle=q.col;rr(ctx,tx,ty,tw,th,40);ctx.fill();ctx.restore();
  ctx.save();ctx.globalAlpha=ap;rr(ctx,tx,ty,tw,th,40);ctx.clip();const rg=ctx.createRadialGradient(W/2,ty+th/2,10,W/2,ty+th/2,tw*.6);rg.addColorStop(0,'rgba(255,255,255,.7)');rg.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=rg;ctx.fillRect(tx,ty,tw,th);
  if(q.img){const z=1.03+.015*Math.sin(t*1.6);ctx.drawImage(q.img,W/2-tw*z/2,ty+th/2-th*z/2,tw*z,th*z)}
  else{ctx.textBaseline='middle';ctx.font=EF(250);ctx.fillText(q.emo,W/2,ty+th/2+12+Math.sin(t*2.2)*6)}ctx.restore();
  // timer bar (old style: black outline, purple fill) + seconds
  const by=ty+th+44,bx=110,bw=W-220,bh=84;
  if(!revealed){ctx.save();ctx.globalAlpha=ap;ctx.fillStyle='#fff';rr(ctx,bx,by,bw,bh,42);ctx.fill();ctx.lineWidth=6;ctx.strokeStyle='#111';ctx.stroke();
    const w8=Math.max(0,t-o.ts),p=cl(w8/5);if(p>0){const fg=ctx.createLinearGradient(bx,0,bx+bw,0);fg.addColorStop(0,'#4f46e5');fg.addColorStop(1,'#7c3aed');ctx.fillStyle=fg;rr(ctx,bx+8,by+8,Math.max(68,(bw-16)*p),bh-16,34);ctx.fill()}
    ctx.font=F(800,44);ctx.fillStyle='#5b21b6';ctx.textBaseline='alphabetic';ctx.fillText(String(t<o.ts?5:Math.max(1,Math.ceil(5-w8))),W/2,by+bh+56);ctx.restore()}
  // options
  const oy=by+bh+100,ow=780,oh=118,og=24;ctx.font=F(800,q.o.some(s=>s.length>14)?50:q.o.some(s=>s.length>10)?58:64);
  q.o.forEach((s,k)=>{const p=cl((lt-.15-k*.08)/.3);const ok=revealed&&!last&&k===q.a;const y=oy+k*(oh+og);
    ctx.save();ctx.globalAlpha=p*(revealed&&!last&&!ok?.55:1);ctx.translate(0,(1-ease(p))*36);
    const sc=ok?1+.05*Math.max(0,Math.sin((t-o.ra)*10))*Math.exp(-(t-o.ra)*2):1;ctx.translate(W/2,y+oh/2);ctx.scale(sc,sc);ctx.translate(-W/2,-(y+oh/2));
    ctx.shadowColor=ok?'rgba(22,163,74,.35)':'rgba(20,20,60,.08)';ctx.shadowBlur=ok?34:18;ctx.shadowOffsetY=ok?14:6;ctx.fillStyle=ok?'#16a34a':'#fff';rr(ctx,(W-ow)/2,y,ow,oh,36);ctx.fill();ctx.shadowColor='transparent';
    if(!ok){ctx.lineWidth=4;ctx.strokeStyle='#e3e5ee';rr(ctx,(W-ow)/2,y,ow,oh,36);ctx.stroke()}
    ctx.fillStyle=ok?'#fff':'#111';ctx.textBaseline='middle';ctx.fillText(ok?s+'  ✓':s,W/2,y+oh/2+3);ctx.restore()});
}
return{fromAI,voices,timeline,mix,draw,CTA};
})();
