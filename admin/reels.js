// ===== IQly admin · Reels studio: Claude questions → voice plan → ElevenLabs → in-browser video =====
(function(){
const W=1080,H=1920,FPS=30,SR=44100;
const RL=async(body)=>{const {data,error}=await sb.functions.invoke('reels',{body});if(error){let m=error.message;try{const j=await error.context.json();m=j.error||m}catch(e){}throw new Error(m)}if(data&&data.error)throw new Error(data.error);return data};
const S={lang:'kz',format:'comment',qs:[],q:null,plan:null,voices:[],clips:{},reelId:null};
const box=$('t-re');

// ---------- fonts ----------
const FF=[['latin',700],['latin',800],['cyrillic',700],['cyrillic',800],['cyrillic-ext',700],['cyrillic-ext',800]];
let fontsP=null;window.__mime=()=>pickMime();function loadFonts(){if(fontsP)return fontsP;fontsP=Promise.all([...['latin','cyrillic','cyrillic-ext'].map(s=>new FontFace('Balsamiq Sans',`url(fonts/balsamiq-sans-${s}-700-normal.woff2)`,{weight:'700'}).load().then(x=>document.fonts.add(x)).catch(()=>{})),...FF.map(([s,w])=>{const f=new FontFace('Manrope',`url(fonts/manrope-${s}-${w}-normal.woff2)`,{weight:String(w)});return f.load().then(x=>document.fonts.add(x)).catch(()=>{})})]);return fontsP}

// ---------- UI ----------
box.innerHTML=`
<div class="card" style="margin-bottom:12px"><h3>ElevenLabs</h3><div id="elInfo2" class="muted">Тексерілуде…</div>
 <details id="elKeyBox2" style="margin-top:10px"><summary style="cursor:pointer;font-weight:700;color:var(--pri)">API кілтті енгізу / ауыстыру</summary>
  <p class="muted" style="font-size:12px">ElevenLabs → Developers → API Keys → Create. Кілт тек серверде (Supabase) сақталады. Voice Design үшін кілтке «Text to Voice» және «Voices: write» рұқсаттары керек.</p>
  <div class="form"><label class="fld"><span>ElevenLabs API кілт</span><input type="password" id="elKey2" autocomplete="off" placeholder="sk_…"></label><button class="btn" id="elKeyBtn2">Сақтау</button></div><div class="err" id="elKeyErr2"></div></details></div>
<details class="card" style="margin-bottom:12px" id="reAiBox"><summary style="cursor:pointer;font-weight:700">🤖 Claude (міндетті емес) <span id="reInfoS" class="muted" style="font-weight:500"></span></summary><div style="margin-top:10px"><div id="reInfo" class="muted">Тексерілуде…</div>
 <details id="reKeyBox" style="margin-top:10px"><summary style="cursor:pointer;font-weight:700;color:var(--pri)">API кілтті енгізу / ауыстыру</summary>
  <p class="muted" style="font-size:12px">console.anthropic.com → API Keys → Create Key. Кілт тек серверде сақталады.</p>
  <div class="form"><label class="fld"><span>Anthropic API кілт</span><input type="password" id="reKey" autocomplete="off" placeholder="sk-ant-…"></label><button class="btn" id="reKeyBtn">Сақтау</button></div><div class="err" id="reKeyErr"></div></details></div></details>
<div class="card" id="reS1"><h3>1. Сұрақтар</h3>
 <div class="form">
  <label class="fld"><span>Сұрақ көзі</span><select id="reSrc"><option value="bank">Дайын база (тегін, тексерілген)</option><option value="ai">Claude ойлап табады</option></select></label>
  <label class="fld"><span>Тіл</span><select id="reLang"><option value="kz">Қазақша</option><option value="ru">Орысша</option></select></label>
  <label class="fld"><span>Формат</span><select id="reFmt"><option value="quiz" selected>🎯 Викторина: 4 сұрақ × 3 нұсқа (соңы — коммент)</option><option value="comment">Жауапсыз — «Комментке жазыңыз»</option><option value="answer">Жауабымен — «Подробнее»</option></select></label>
  <label class="fld" id="reHintL" style="grid-column:span 2;display:none"><span>Қосымша тілек (міндетті емес)</span><input id="reHint" placeholder="мысалы: жас туралы, күнтізбе туралы, оңайырақ…"></label>
 </div>
 <button class="btn" id="reGen" style="width:100%">✨ 5 сұрақ ұсыну</button><div class="err" id="reGenErr"></div>
 <div id="reQs" class="grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr));margin-top:12px"></div>
</div>
<div class="card hide" id="reS2" style="margin-top:12px"><h3>2. Дауыс бойынша ұсыныс</h3><div id="rePlan"></div></div>
<div class="card hide" id="reS3" style="margin-top:12px"><h3>3. Видео</h3>
 <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
  <canvas id="reCv" width="${W}" height="${H}" style="width:270px;height:480px;border-radius:14px;border:1px solid var(--line);background:#f7f8fb"></canvas>
  <div style="flex:1;min-width:240px"><div id="reStat" class="muted"></div><div class="fun"><div class="tr" style="height:12px;margin:10px 0"><i id="reProg" style="width:0"></i></div></div><div id="reOut"></div></div>
 </div></div>
<div class="card" style="margin-top:12px"><h3>Жасалған Reels</h3><div id="reHist" class="muted">—</div></div>`;

async function status(){try{const s=await RL({action:'status'});S.ai=s.connected;$('reInfoS').textContent=s.connected?'· қосулы':'· қосылмаған';$('reInfo').innerHTML=s.connected?`<span class="pill ok">Қосулы</span> Модель: <b>${esc(s.model)}</b>`:`<span class="pill w">Қосылмаған</span> Claude-сыз да жұмыс істейді — «Дайын база» таңдаңыз.`;$('reKeyBox').open=!s.connected}catch(e){$('reInfo').innerHTML=`<span class="pill bad">Қате</span> ${esc(e.message)}`}}
$('reFmt').onchange=()=>{const q=$('reFmt').value==='quiz';$('reSrc').closest('label').style.display=q?'none':''};$('reFmt').onchange();
$('reSrc').onchange=()=>{$('reHintL').style.display=$('reSrc').value==='ai'?'':'none'};
async function elStatus(){try{const st=await EL({action:'status'});S.el=st.connected;$('elInfo2').innerHTML=st.connected?`<span class="pill ok">Қосулы</span> Тариф: <b>${esc(st.tier)}</b> · ${(st.used||0).toLocaleString('ru-RU')} / ${(st.limit||0).toLocaleString('ru-RU')} таңба`:`<span class="pill bad">Қосылмаған</span> ${esc(st.error||'API кілтті енгізіңіз')}`;$('elKeyBox2').open=!st.connected}catch(e){$('elInfo2').innerHTML=`<span class="pill bad">Қате</span> ${esc(e.message)}`}}
$('elKeyBtn2').onclick=async()=>{$('elKeyErr2').textContent='';$('elKeyBtn2').disabled=true;try{await EL({action:'save_key',key:$('elKey2').value});$('elKey2').value='';S.voices=[];await elStatus()}catch(e){$('elKeyErr2').textContent=e.message}$('elKeyBtn2').disabled=false};
$('reKeyBtn').onclick=async()=>{$('reKeyErr').textContent='';$('reKeyBtn').disabled=true;try{await RL({action:'save_key',key:$('reKey').value});$('reKey').value='';await status()}catch(e){$('reKeyErr').textContent=e.message}$('reKeyBtn').disabled=false};

const busy=(b,on,txt)=>{b.disabled=on;if(txt)b.textContent=txt};
$('reGen').onclick=async()=>{if($('reFmt').value==='quiz')return genQuiz();S.lang=$('reLang').value;S.format=$('reFmt').value;$('reGenErr').textContent='';S.src=$('reSrc').value;busy($('reGen'),true,S.src==='ai'?'Claude ойлап жатыр… (30–60 сек)':'Таңдалуда…');
  try{if(S.src==='ai'){const r=await RL({action:'questions',lang:S.lang,hint:$('reHint').value,avoid:S.qs.map(q=>q.q_screen)});S.qs=r.questions||[]}
    else{const {data:prev}=await sb.from('reels').select('question').order('created_at',{ascending:false}).limit(200);S.qs=RBANK.pick5(S.lang,[...(prev||[]).map(p=>p.question&&p.question.q_screen),...S.qs.map(q=>q.q_screen)])}
    S.q=null;drawQs()}
  catch(e){$('reGenErr').textContent=e.message}busy($('reGen'),false,'✨ Тағы 5 сұрақ')};
function drawQs(){$('reQs').innerHTML=S.qs.map((q,i)=>`<div class="card" style="display:flex;flex-direction:column;gap:6px;${S.q===q?'outline:2px solid var(--pri)':''}">
  <span class="pill p" style="align-self:flex-start">${esc(q.type||'')} · ${'★'.repeat(Math.max(1,Math.min(5,+q.difficulty||3)))}</span>
  <b style="white-space:pre-line;line-height:1.35">${esc(q.q_screen)}</b>
  <div style="font-size:13px">✅ <b>${esc(q.answer)}</b> <span class="muted">— ${esc(q.why||'')}</span></div>
  <div style="font-size:12px" class="muted">Тұзақ: ${esc(q.trap||'—')}</div>
  <button class="btn sm" data-i="${i}" style="margin-top:auto">Осыны таңдаймын</button></div>`).join('');
  $('reQs').querySelectorAll('button').forEach(b=>b.onclick=()=>pick(+b.dataset.i))}

async function voices(){if(S.voices.length)return S.voices;const v=await EL({action:'voices'});S.voices=v.voices;
  if(!localStorage.getItem('el_model')){try{const m=await EL({action:'models'});const k=m.models.find(x=>x.langs.some(l=>/^kk|kaz/i.test(l)))||m.models.find(x=>/v3/.test(x.id))||m.models[0];if(k)localStorage.setItem('el_model',k.id)}catch(e){}}
  return S.voices}
async function pick(i){S.q=S.qs[i];drawQs();$('reS2').classList.remove('hide');$('reS3').classList.add('hide');$('rePlan').innerHTML='<div class="muted">Дауыс бойынша ұсыныс дайындалуда…</div>';$('reS2').scrollIntoView({behavior:'smooth'});
  try{const vs=await voices();const p=S.src==='ai'?await RL({action:'voice_plan',lang:S.lang,format:S.format,question:S.q,voices:vs.map(v=>({id:v.id,name:v.name,category:v.category,labels:v.labels}))}):RBANK.plan(S.q,S.lang,S.format,vs);S.plan=p;drawPlan()}
  catch(e){$('rePlan').innerHTML=`<div class="err">${esc(e.message)}</div><button class="btn sec sm" onclick="this.parentElement.innerHTML='';">OK</button>`}}
const fld=(id,l,v,ta)=>`<label class="fld"><span>${l}</span>${ta?`<textarea id="${id}" rows="${ta}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font:inherit">${esc(v)}</textarea>`:`<input id="${id}" value="${esc(v)}">`}</label>`;
function drawPlan(){const p=S.plan,q=S.q,st=p.settings||{},ans=S.format==='answer';
  const vopt=S.voices.map(v=>`<option value="${esc(v.id)}" ${v.id===p.voice_id?'selected':''}>${esc(v.name)}${v.category&&v.category!=='premade'?' · '+esc(v.category):''}</option>`).join('');
  $('rePlan').innerHTML=`<div class="note" style="background:#f5f3ff;border-color:#ddd6fe;color:#3b0764">🎙 <b>Ұсыныс:</b> ${esc(p.voice_name||'')} — ${esc(p.reason||'')}</div>
   <div class="grid two" style="margin-top:0">
    <div>${fld('pHookS','Экрандағы hook',p.hook_screen,2)}${fld('pQS','Экрандағы сұрақ',q.q_screen,4)}${ans?fld('pAns','Жауап (экран)',q.answer)+fld('pWhy','Түсіндірме (экран)',q.why)+fld('pTrap','Қате жауап (сызылады)',q.trap):''}
      ${fld('pOT','Соңғы экран — тақырып',p.outro_screen_title,2)}${fld('pOS','Соңғы экран — астыңғы мәтін',p.outro_screen_sub,2)}${fld('pOB','Батырма',p.outro_button)}</div>
    <div>${fld('pVQ','🎙 Дауыс: hook + сұрақ',(p.hook_voice||'')+' '+(p.question_voice||q.q_voice||''),4)}${ans?fld('pVA','🎙 Дауыс: жауап',p.answer_voice||q.answer_voice||'',2):''}${fld('pVO','🎙 Дауыс: соңы',p.outro_voice,2)}
      ${narr(vopt,st)}</div></div>
   <button class="btn" id="reGo" style="width:100%;margin-top:6px">✅ Келісемін — дауыс пен видео жасау</button><div class="err" id="reGoErr"></div>`;
  $('reGo').onclick=build;voiceUI()}
const VPRE={
 quiz:{n:'🎤 Харизматичный жүргізуші (ер)',kz:'Charismatic Kazakh male TikTok quiz host in his early 30s, native Kazakh speaker with a natural Kazakh accent, warm mid-low voice, energetic and playful with a hint of intrigue, confident medium-fast pace, crisp studio-quality recording.',ru:'Charismatic male TikTok quiz host in his early 30s from Kazakhstan, native Russian speaker with a light Kazakhstani accent, warm mid-low voice, energetic and playful with a hint of intrigue, confident medium-fast pace, crisp studio-quality recording.'},
 female:{n:'😊 Жылы, сенімді (әйел)',kz:'Friendly confident Kazakh woman in her late 20s, native Kazakh speaker, bright clear voice with a smile, engaging storyteller tone for short social media videos, medium pace, crisp studio-quality recording.',ru:'Friendly confident woman in her late 20s from Kazakhstan, native Russian speaker, bright clear voice with a smile, engaging storyteller tone for short social media videos, medium pace, crisp studio-quality recording.'},
 elder:{n:'🧓 Дана ақсақал',kz:'Wise Kazakh grandfather (aksakal) in his 60s, native Kazakh speaker, deep warm slightly raspy voice, calm, kind and a little mischievous, as if telling a riddle to his grandchildren, unhurried pace, clean recording.',ru:'Wise grandfather in his 60s from Kazakhstan, native Russian speaker, deep warm slightly raspy voice, calm, kind and a little mischievous, as if telling a riddle to his grandchildren, unhurried pace, clean recording.'},
 young:{n:'⚡ Жас блогер (энергиялы)',kz:'Young energetic Kazakh male blogger around 22, native Kazakh speaker, fast lively delivery, excited and fun, modern social media vibe, clear crisp recording.',ru:'Young energetic male blogger around 22 from Kazakhstan, native Russian speaker, fast lively delivery, excited and fun, modern social media vibe, clear crisp recording.'},
 mystery:{n:'🕵️ Құпиялы, драмалы',kz:'Mysterious dramatic Kazakh male narrator in his 40s, native Kazakh speaker, deep resonant cinematic voice, slow suspenseful delivery like a movie trailer, building curiosity, studio-quality recording.',ru:'Mysterious dramatic male narrator in his 40s from Kazakhstan, native Russian speaker, deep resonant cinematic voice, slow suspenseful delivery like a movie trailer, building curiosity, studio-quality recording.'}};
let VMODE='design',VPICK=null;
function voiceUI(){const setM=m=>{VMODE=m;$('vmD').classList.toggle('on',m==='design');$('vmE').classList.toggle('on',m==='exist');$('vpD').classList.toggle('hide',m!=='design');$('vpE').classList.toggle('hide',m!=='exist');selInfo()};
  $('vmD').onclick=()=>setM('design');$('vmE').onclick=()=>setM('exist');$('pVoice').onchange=selInfo;
  const fill=()=>{$('vdDesc').value=VPRE[$('vdPre').value][S.lang]};$('vdPre').onchange=fill;
  $('vdPre').value=S.format==='comment'?'quiz':'quiz';fill();VPICK=null;
  $('vdGo').onclick=()=>doDesign().catch(()=>{});
  setM('exist');const h=[...$('pVoice').options].find(o=>/^\s*Hale\b/i.test(o.textContent));if(h)$('pVoice').value=h.value;
  else $('vSel').insertAdjacentHTML('afterend','<div class="err">«Hale» дауысы ElevenLabs кітапханаңызда табылмады — Voice Library-ден «My Voices»-қа қосыңыз.</div>');selInfo()}
let PREV=null,DESIGNING=null;
function doDesign(){if(DESIGNING)return DESIGNING;$('vdErr').textContent='';busy($('vdGo'),true,'ElevenLabs 3 дауыс жасап жатыр… (~20 сек)');$('vdPrev').innerHTML='<div class="muted">🎨 Дауыс нұсқалары жасалуда…</div>';PREV=null;
  DESIGNING=(async()=>{try{const text=[val('pVQ'),val('pVO')].join(' ');const r=await EL({action:'design',description:$('vdDesc').value,text});PREV=r.previews||[];
      if(!PREV.length)throw new Error('ElevenLabs нұсқа қайтармады');
      $('vdPrev').innerHTML=PREV.map((p,i)=>`<div class="card" style="padding:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="width:22px">${i+1}</b><audio controls src="data:${p.type};base64,${p.audio}" style="flex:1;min-width:180px;height:36px"></audio><button type="button" class="btn sm" data-i="${i}">Осыны таңдаймын</button></div>`).join('');
      $('vdPrev').querySelectorAll('button').forEach(b=>b.onclick=()=>pickPrev(+b.dataset.i).catch(()=>{}));selInfo();return PREV}
    catch(e){$('vdErr').textContent=e.message;$('vdPrev').innerHTML='';throw e}
    finally{busy($('vdGo'),false,'🎨 Тағы 3 нұсқа жасау');DESIGNING=null}})();return DESIGNING}
async function pickPrev(i){const p=PREV[i],b=$('vdPrev').querySelector(`button[data-i="${i}"]`);if(b)busy(b,true,'Сақталуда…');
  try{const nm='IQly · '+$('vdPre').selectedOptions[0].textContent.replace(/^[^\s]+\s/,'')+' · '+new Date().toLocaleDateString('ru-RU');
    const s=await EL({action:'save_voice',generated_voice_id:p.id,name:nm.slice(0,60),description:$('vdDesc').value});
    S.voices.unshift({id:s.voice_id,name:s.name,category:'generated'});const o=document.createElement('option');o.value=s.voice_id;o.textContent=s.name+' · generated';$('pVoice').prepend(o);$('pVoice').value=s.voice_id;
    VPICK=s.voice_id;localStorage.setItem('el_voice',s.voice_id);$('vdPrev').querySelectorAll('.card').forEach((c,k)=>c.style.outline=k===i?'2px solid var(--pri)':'');$('vdPrev').querySelectorAll('button').forEach((x,k)=>{x.disabled=false;x.textContent=k===i?'✓ Таңдалды':'Осыны таңдаймын'});selInfo();return VPICK}
  catch(e){$('vdErr').textContent=e.message;if(b)busy(b,false,'Осыны таңдаймын');throw e}}

function selInfo(){const id=VMODE==='design'?VPICK:$('pVoice').value;const v=S.voices.find(x=>x.id===id);$('vSel').innerHTML=id&&v?`Таңдалған диктор: <b>${esc(v.name)}</b>`:VMODE==='design'?'Нұсқаларды тыңдап, ұнағанын таңдаңыз. Таңдамасаңыз, 1-нұсқа алынады.':''}


function narr(vopt,st){return `<div class="card" style="background:#faf8ff;border-color:#e9e3ff;margin-bottom:12px"><b>🎨 Диктор</b>
       <div class="seg" style="margin:10px 0;display:flex"><button type="button" id="vmE" class="on" style="flex:1">📚 Менің дауыстарым</button><button type="button" id="vmD" style="flex:1">✨ Voice Design</button></div>
       <div id="vpD"><label class="fld"><span>Образ</span><select id="vdPre">${Object.keys(VPRE).map(k=>`<option value="${k}">${VPRE[k].n}</option>`).join('')}</select></label>
        <label class="fld"><span>Дауыс сипаттамасы (ағылшынша жақсы түсінеді — өзгертуге болады)</span><textarea id="vdDesc" rows="4" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font:inherit"></textarea></label>
        <button type="button" class="btn sec" id="vdGo" style="width:100%">🎨 3 дауыс нұсқасын жасау</button><div class="err" id="vdErr"></div><div id="vdPrev" class="grid" style="gap:8px;margin-top:8px"></div></div>
       <div id="vpE" class="hide"><label class="fld"><span>Дауыс (әдепкі: Hale)</span><select id="pVoice">${vopt}</select></label></div>
       <div class="muted" style="font-size:12px" id="vSel"></div></div>
      <div class="form" style="grid-template-columns:repeat(2,1fr)">
       ${[['pStab','Тұрақтылық',st.stability??.5,0,1],['pSim','Ұқсастық',st.similarity??.75,0,1],['pSty','Стиль',st.style??.2,0,1],['pSpd','Жылдамдық',st.speed??1,.7,1.2]].map(([id,l,v,a,b])=>`<label class="fld"><span>${l} <b id="${id}v">${v}</b></span><input type="range" id="${id}" min="${a}" max="${b}" step="0.05" value="${v}" oninput="document.getElementById('${id}v').textContent=this.value"></label>`).join('')}</div>`}
// ---------- quiz (викторина) ----------
async function genQuiz(){S.lang=$('reLang').value;S.format='quiz';busy($('reGen'),true,'Таңдалуда…');
  try{const {data:prev}=await sb.from('reels').select('question').eq('format','quiz').order('created_at',{ascending:false}).limit(100);
    const used=[];(prev||[]).forEach(p=>(p.question&&p.question.quiz||[]).forEach(x=>used.push(x)));S.set=QUIZ.pick4(S.lang,used);drawSet()}
  catch(e){$('reGenErr').textContent=e.message}busy($('reGen'),false,'✨ Басқа 4 сұрақ')}
function drawSet(){$('reQs').innerHTML=`<div class="card" style="grid-column:1/-1">${S.set.map((q,i)=>`<div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)">
   <div style="font-size:40px;width:52px;text-align:center">${q.emo}</div><div style="flex:1"><b>${i+1}. ${esc(q.q.replace(/\n/g,' '))}</b><div style="font-size:13px;margin-top:4px">${q.o.map((o,k)=>k===q.a&&i<3?`<span class="pill ok">${esc(o)}</span>`:`<span class="pill">${esc(o)}</span>`).join(' ')}${i===3?' <span class="muted">— жауабы айтылмайды, комментке</span>':''}</div></div>
   <button class="btn sec sm" data-s="${i}">🔄</button></div>`).join('')}
   <button class="btn" id="qzNext" style="width:100%;margin-top:12px">Осы 4 сұрақпен жалғастыру →</button></div>`;
  $('reQs').querySelectorAll('button[data-s]').forEach(b=>b.onclick=()=>{QUIZ.swap(S.lang,S.set,+b.dataset.s);drawSet()});$('qzNext').onclick=pickQuiz}
async function pickQuiz(){$('reS2').classList.remove('hide');$('reS3').classList.add('hide');$('rePlan').innerHTML='<div class="muted">Дайындалуда…</div>';$('reS2').scrollIntoView({behavior:'smooth'});
  try{const vs=await voices();const pv=localStorage.getItem('el_voice');const vo=QUIZ.voices(S.set,S.lang);const st={stability:.45,similarity:.8,style:.25,speed:1.05};
    const vopt=vs.map(v=>`<option value="${esc(v.id)}" ${v.id===pv?'selected':''}>${esc(v.name)}${v.category&&v.category!=='premade'?' · '+esc(v.category):''}</option>`).join('');
    $('rePlan').innerHTML=`<div class="grid two" style="margin-top:0"><div>${S.set.map((q,i)=>`<div class="card" style="margin-bottom:10px"><b>${i+1}-сұрақ</b>${i===3?' <span class="muted">(жауабы айтылмайды)</span>':''}
       <div class="form" style="grid-template-columns:70px 1fr"><label class="fld"><span>Сурет</span><input id="qe${i}" value="${esc(q.emo)}" style="font-size:22px;text-align:center"></label>${fld('qq'+i,'Сұрақ (экран)',q.q,2)}</div>
       <div class="form" style="grid-template-columns:repeat(3,1fr)">${q.o.map((o,k)=>`<label class="fld"><span>${k===q.a?'✅ ':''}${k+1}-нұсқа</span><input id="qo${i}_${k}" value="${esc(o)}"></label>`).join('')}</div>
       <label class="fld"><span>Дұрыс жауап</span><select id="qa${i}">${[0,1,2].map(k=>`<option value="${k}" ${k===q.a?'selected':''}>${k+1}-нұсқа</option>`).join('')}</select></label>
       ${fld('qvq'+i,'🎙 Дауыс: сұрақ',vo[i].q,2)}${fld('qva'+i,i===3?'🎙 Дауыс: соңы':'🎙 Дауыс: жауап',vo[i].a,2)}</div>`).join('')}</div>
     <div><textarea id="pVQ" class="hide">${esc(vo[0].q)}</textarea><textarea id="pVO" class="hide">${esc(vo[1].a)}</textarea>${narr(vopt,st)}</div></div>
     <button class="btn" id="reGo" style="width:100%;margin-top:6px">✅ Келісемін — дауыс пен видео жасау</button><div class="err" id="reGoErr"></div>`;
    $('reGo').onclick=buildQuiz;voiceUI()}
  catch(e){$('rePlan').innerHTML=`<div class="err">${esc(e.message)}</div>`}}
async function buildQuiz(){$('reGoErr').textContent='';busy($('reGo'),true,'Дауыс жасалуда…');
  if(VMODE==='design'&&!VPICK){try{busy($('reGo'),true,'Диктор дайындалуда…');if(!PREV||!PREV.length)await doDesign();await pickPrev(0)}catch(e){$('reGoErr').textContent='Voice Design: '+e.message+' — «📚 Бар дауыс» арқылы жасап көріңіз.';busy($('reGo'),false,'✅ Келісемін — дауыс пен видео жасау');return}}
  const set=S.set.map((q,i)=>({emo:val('qe'+i)||q.emo,col:q.col,q:val('qq'+i),o:[0,1,2].map(k=>val(`qo${i}_${k}`)),a:+$('qa'+i).value}));
  const D={set,draw:QUIZ.draw};const vid=$('pVoice').value,vname=$('pVoice').selectedOptions[0]?.textContent,sets={stability:+$('pStab').value,similarity:+$('pSim').value,style:+$('pSty').value,speed:+$('pSpd').value};
  $('reS3').classList.remove('hide');$('reS3').scrollIntoView({behavior:'smooth'});
  try{await loadFonts();const parts=[];set.forEach((q,i)=>{parts.push(['q'+i,val('qvq'+i)]);parts.push(['a'+i,val('qva'+i)])});const clips={},paths={};
    for(const [k,t] of parts){if(!t)continue;$('reStat').textContent=`ElevenLabs: дауыс жасалуда (${Object.keys(clips).length+1}/${parts.length})…`;const r=await tts(t,vid,vname,sets);clips[k]=await decode(r.url);paths[k]=r.job&&r.job.path}
    D.tl=QUIZ.timeline(D,clips);
    const {data:row}=await sb.from('reels').insert({lang:S.lang,format:'quiz',question:{quiz:set.map(q=>q.q),set,q_screen:set.map(q=>q.q.replace(/\n/g,' ')).join(' | ')},script:{voices:parts},voice:{id:vid,name:vname,settings:sets},audio_paths:paths,status:'audio'}).select().single();S.reelId=row&&row.id;
    $('reStat').textContent='Дыбыс жолы жиналуда…';const audio=QUIZ.mix(D.tl,clips);QUIZ.draw($('reCv').getContext('2d'),D,1);
    $('reStat').innerHTML='Видео жазылуда — бұл бетті жаппаңыз және басқа қойындыға ауыспаңыз (≈'+Math.ceil(D.tl.dur)+' сек)…';
    const blob=await record(D,audio,D.tl.dur);await finishVideo(blob)}
  catch(e){$('reGoErr').textContent=e.message;$('reStat').textContent='Қате: '+e.message}
  busy($('reGo'),false,'✅ Келісемін — дауыс пен видео жасау')}
async function finishVideo(blob){const ext=blob.type.includes('mp4')?'mp4':'webm',url=URL.createObjectURL(blob),fn=`iqly_reels_${S.reelId||Date.now()}.${ext}`;
  $('reOut').innerHTML=`<video src="${url}" controls playsinline style="width:270px;border-radius:14px;display:block;margin-bottom:8px"></video><a class="btn" href="${url}" download="${fn}" style="display:inline-block;text-decoration:none">⬇ Видеоны жүктеу (${ext.toUpperCase()})</a> <button class="btn sec" id="reNew">＋ Жаңа Reels</button>`;
  $('reNew').onclick=()=>{$('reS2').classList.add('hide');$('reS3').classList.add('hide');window.scrollTo({top:0,behavior:'smooth'});if(S.format==='quiz')genQuiz()};
  $('reStat').textContent='Дайын ✓ Сақталуда…';
  if(S.reelId){const path=`${new Date().toISOString().slice(0,10)}/${S.reelId}.${ext}`;const up=await sb.storage.from('reels').upload(path,blob,{contentType:blob.type.split(';')[0]});if(!up.error)await sb.from('reels').update({video_path:path,status:'done'}).eq('id',S.reelId)}
  $('reStat').textContent='Дайын ✓';loadHist()}

// ---------- build ----------
const val=id=>($(id)?$(id).value:'').trim();
async function tts(text,voice_id,voice_name,settings){const r=await EL({action:'tts',text,voice_id,voice_name,model_id:localStorage.getItem('el_model')||undefined,settings});return r}
async function decode(url){const ab=await (await fetch(url)).arrayBuffer();const oc=new OfflineAudioContext(1,SR,SR);const b=await oc.decodeAudioData(ab);return b.getChannelData(0)}
async function build(){const ans=S.format==='answer';$('reGoErr').textContent='';busy($('reGo'),true,'Дауыс жасалуда…');
  if(VMODE==='design'&&!VPICK){try{$('reGoErr').textContent='';busy($('reGo'),true,'Диктор дайындалуда…');if(!PREV||!PREV.length)await doDesign();await pickPrev(0)}catch(e){$('reGoErr').textContent='Voice Design: '+e.message+' — «📚 Бар дауыс» арқылы жасап көріңіз.';busy($('reGo'),false,'✅ Келісемін — дауыс пен видео жасау');return}}
  const D={hook:val('pHookS'),q:val('pQS'),a:val('pAns'),why:val('pWhy'),trap:val('pTrap'),ot:val('pOT'),os:val('pOS'),ob:val('pOB'),ans};
  const vid=$('pVoice').value,vname=$('pVoice').selectedOptions[0]?.textContent,set={stability:+$('pStab').value,similarity:+$('pSim').value,style:+$('pSty').value,speed:+$('pSpd').value};
  $('reS3').classList.remove('hide');$('reS3').scrollIntoView({behavior:'smooth'});
  try{await loadFonts();
    const parts=[['q',val('pVQ')],...(ans?[['a',val('pVA')]]:[]),['o',val('pVO')]];const clips={},paths={};
    for(const [k,t] of parts){$('reStat').textContent=`ElevenLabs: дауыс жасалуда (${Object.keys(clips).length+1}/${parts.length})…`;const r=await tts(t,vid,vname,set);clips[k]=await decode(r.url);paths[k]=r.job&&r.job.path}
    const tl=timeline(D,clips);D.tl=tl;
    const {data:row}=await sb.from('reels').insert({lang:S.lang,format:S.format,question:{...S.q,q_screen:D.q,answer:D.a,why:D.why,trap:D.trap},script:{hook:D.hook,vq:val('pVQ'),va:val('pVA'),vo:val('pVO'),ot:D.ot,os:D.os,ob:D.ob},voice:{id:vid,name:vname,settings:set},audio_paths:paths,status:'audio'}).select().single();S.reelId=row&&row.id;
    $('reStat').textContent='Дыбыс жолы жиналуда…';const audio=mixAudio(tl,clips);
    drawFrame($('reCv').getContext('2d'),D,1.5);
    $('reStat').innerHTML='Видео жазылуда — бұл бетті жаппаңыз және басқа қойындыға ауыспаңыз (≈'+Math.ceil(tl.dur)+' сек)…';
    const blob=await record(D,audio,tl.dur);
    const ext=blob.type.includes('mp4')?'mp4':'webm',url=URL.createObjectURL(blob),fn=`iqly_reels_${S.reelId||Date.now()}.${ext}`;
    $('reOut').innerHTML=`<video src="${url}" controls playsinline style="width:270px;border-radius:14px;display:block;margin-bottom:8px"></video><a class="btn" href="${url}" download="${fn}" style="display:inline-block;text-decoration:none">⬇ Видеоны жүктеу (${ext.toUpperCase()})</a> <button class="btn sec" id="reNew">＋ Жаңа Reels</button>${ext==='webm'?'<p class="muted" style="font-size:12px">Бұл браузер MP4 жазбайды — Instagram үшін Chrome-ның соңғы нұсқасын немесе Safari қолданыңыз.</p>':''}`;
    $('reNew').onclick=()=>{S.q=null;S.plan=null;$('reS2').classList.add('hide');$('reS3').classList.add('hide');drawQs();window.scrollTo({top:0,behavior:'smooth'})};
    $('reStat').textContent='Дайын ✓ Сақталуда…';
    if(S.reelId){const path=`${new Date().toISOString().slice(0,10)}/${S.reelId}.${ext}`;const up=await sb.storage.from('reels').upload(path,blob,{contentType:blob.type.split(';')[0]});
      if(!up.error)await sb.from('reels').update({video_path:path,status:'done'}).eq('id',S.reelId)}
    $('reStat').textContent='Дайын ✓';loadHist()}
  catch(e){$('reGoErr').textContent=e.message;$('reStat').textContent='Қате: '+e.message}
  busy($('reGo'),false,'✅ Келісемін — дауыс пен видео жасау')}

function timeline(D,c){const L=k=>c[k]?c[k].length/SR:0;const T={};T.vq=0.2;T.ts=+(T.vq+L('q')+0.3).toFixed(2);T.at=T.ts+5;
  if(D.ans){T.rt=T.at+1.5;T.va=T.rt+0.15;T.out=+(T.rt+Math.max(3,L('a')+0.8)).toFixed(2)}else T.out=T.at;
  T.vo=T.out+0.25;T.dur=+(T.vo+L('o')+1.4).toFixed(2);return T}

// ---------- audio ----------
function mixAudio(T,c){const N=Math.ceil(T.dur*SR)+SR,voice=new Float32Array(N),mus=new Float32Array(N),fx=new Float32Array(N);
  const add=(buf,t,s,g=1)=>{const i=Math.floor(t*SR);for(let k=0;k<s.length&&i+k<buf.length;k++)buf[i+k]+=s[k]*g};
  const fade=s=>{const o=Float32Array.from(s),f=Math.min(882,o.length>>2);for(let k=0;k<f;k++){o[k]*=k/f;o[o.length-1-k]*=k/f}return o};
  add(voice,T.vq,fade(c.q));if(c.a)add(voice,T.va,fade(c.a));add(voice,T.vo,fade(c.o));
  const tone=(f,l,v,dec)=>{const n=l*SR|0,o=new Float32Array(n);for(let k=0;k<n;k++){const t=k/SR;o[k]=v*Math.sin(2*Math.PI*f*t)*Math.exp(-t*dec)}return o};
  const mix=(...a)=>{const o=new Float32Array(Math.max(...a.map(x=>x.length)));a.forEach(x=>x.forEach((v,k)=>o[k]+=v));return o};
  // music: soft pad + kick + hat
  const chords=[[220,261.6,329.6],[174.6,220,261.6],[130.8,164.8,196],[196,246.9,293.7]],beat=60/100,bar=4*beat;
  const kick=(()=>{const n=.35*SR|0,o=new Float32Array(n);let ph=0;for(let k=0;k<n;k++){const t=k/SR;ph+=2*Math.PI*(55+90*Math.exp(-t*30))/SR;o[k]=.5*Math.sin(ph)*Math.exp(-t*9)}return o})();
  const hat=(()=>{const n=.06*SR|0,o=new Float32Array(n);for(let k=0;k<n;k++)o[k]=(Math.random()*2-1)*Math.exp(-k/SR*60)*.06;return o})();
  for(let b=0;b*bar<T.dur+bar;b++){const n=bar*SR|0,pad=new Float32Array(n);for(let k=0;k<n;k++){const t=k/SR,env=Math.min(1,t/.3)*Math.min(1,(bar-t)/.3);let v=0;for(const f of chords[b%4])v+=Math.sin(2*Math.PI*f*t)+.3*Math.sin(4*Math.PI*f*t);pad[k]=v*.035*env}
    add(mus,b*bar,pad);for(let q=0;q<4;q++){add(mus,b*bar+q*beat,kick,q%2?0.6:1);add(mus,b*bar+q*beat+beat/2,hat)}}
  // duck music under voice, fade in/out
  const win=.25*SR|0;let acc=0;const env=new Float32Array(N);for(let k=0;k<N;k++){acc+=Math.abs(voice[k]);if(k>=win)acc-=Math.abs(voice[k-win]);env[k]=acc/win}
  const end=T.dur*SR|0;for(let k=0;k<N;k++){const d=1-.65*Math.min(1,env[Math.min(N-1,k+(win>>1))]/.03);const fi=Math.min(1,k/(.8*SR)),fo=k>end?0:Math.min(1,(end-k)/(2*SR));mus[k]*=d*fi*fo*.7}
  // sfx
  const tick=mix(tone(1800,.05,.18,90),tone(900,.05,.1,90)),ding=mix(tone(880,.7,.3,5),tone(1320,.7,.2,6),tone(1760,.6,.1,7));
  const wn=.3*SR|0,whoosh=new Float32Array(wn);for(let k=0;k<wn;k++)whoosh[k]=(Math.random()*2-1)*.06*Math.sin(Math.PI*k/wn);
  add(fx,0,whoosh);for(let k=0;k<5;k++)add(fx,T.ts+k+.02,tick);
  if(T.rt){const bz=new Float32Array(.35*SR|0);for(let k=0;k<bz.length;k++){const t=k/SR;bz[k]=.18*Math.sign(Math.sin(2*Math.PI*140*t))*Math.exp(-t*6)}add(fx,T.at,bz);add(fx,T.rt,ding,.8)}
  add(fx,T.out,mix(tone(523,.4,.2,4),tone(659,.5,.15,4)));
  const out=new Float32Array(N);let mx=0;for(let k=0;k<N;k++){out[k]=voice[k]+mus[k]+fx[k];mx=Math.max(mx,Math.abs(out[k]))}const g=mx>.97?.97/mx:1;for(let k=0;k<N;k++)out[k]*=g;return out}

// ---------- drawing ----------
const ease=x=>1-Math.pow(1-x,3),cl=x=>Math.max(0,Math.min(1,x));
const FONT=(w,s)=>`${w} ${s}px Manrope, "Noto Color Emoji", "Apple Color Emoji", sans-serif`;
function wrap(ctx,text,maxW){const out=[];String(text).split('\n').forEach(par=>{const ws=par.split(' ');let line='';ws.forEach(w=>{const t=line?line+' '+w:w;if(ctx.measureText(t).width>maxW&&line){out.push(line);line=w}else line=t});out.push(line)});return out}
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
let BG=null;function bg(ctx){if(!BG){BG=document.createElement('canvas');BG.width=W;BG.height=H;const b=BG.getContext('2d');b.fillStyle='#f7f8fb';b.fillRect(0,0,W,H);b.fillStyle='#c9cdd8';for(let y=24;y<H;y+=48)for(let x=24;x<W;x+=48){b.beginPath();b.arc(x,y,2.6,0,7);b.fill()}}ctx.drawImage(BG,0,0)}
function txtC(ctx,lines,y,lh){lines.forEach((l,i)=>ctx.fillText(l,W/2,y+i*lh))}
function drawFrame(ctx,D,t){const T=D.tl;ctx.textAlign='center';ctx.textBaseline='alphabetic';bg(ctx);
  // progress bar
  const g=ctx.createLinearGradient(0,0,W,0);g.addColorStop(0,'#4f46e5');g.addColorStop(1,'#a855f7');ctx.fillStyle=g;ctx.fillRect(0,0,W*cl(t/T.dur),14);
  if(t>=T.out){const ot=t-T.out,p=cl(ot/.35),s=.92+.08*ease(p);ctx.save();ctx.globalAlpha=p;ctx.translate(W/2,H/2);ctx.scale(s,s);ctx.translate(-W/2,-H/2);
    ctx.font=FONT(800,108);const tl=wrap(ctx,D.ot,900);const sub=(()=>{ctx.font=FONT(700,52);return wrap(ctx,D.os,880)})();
    const hT=tl.length*116,hS=sub.length*68,total=hT+34+hS+40+150+40+120;let y=H/2-total/2+100;
    ctx.font=FONT(800,108);tl.forEach((l,i)=>{ctx.fillStyle=i===tl.length-1&&tl.length>1?'#6d28d9':'#111';ctx.fillText(l,W/2,y+i*116)});y+=hT+10;
    ctx.font=FONT(700,52);ctx.fillStyle='#4b5068';sub.forEach((l,i)=>ctx.fillText(l,W/2,y+i*68));y+=hS+40;
    ctx.font=FONT(800,62);const bw=Math.min(980,ctx.measureText(D.ob).width+130),bs=1+.06*Math.max(0,Math.sin(ot*6));
    ctx.save();ctx.translate(W/2,y+60);ctx.scale(bs,bs);ctx.shadowColor='rgba(91,33,182,.4)';ctx.shadowBlur=40;ctx.shadowOffsetY=18;ctx.fillStyle='#5b21b6';rr(ctx,-bw/2,-70,bw,140,70);ctx.fill();ctx.shadowColor='transparent';ctx.fillStyle='#fff';ctx.fillText(D.ob,0,22);ctx.restore();
    ctx.font='110px "Noto Color Emoji","Apple Color Emoji",sans-serif';ctx.fillText('👇',W/2,y+270+Math.abs(Math.sin(ot*5))*30);ctx.restore();return}
  // hook
  const hp=cl(t/.3);ctx.save();ctx.globalAlpha=hp;ctx.font=FONT(800,50);const hl=wrap(ctx,D.hook,860);const hw=Math.max(...hl.map(l=>ctx.measureText(l).width))+88,hh=hl.length*60+44;
  ctx.translate(W/2,250+hh/2);ctx.rotate(-2*Math.PI/180);ctx.scale(.6+.4*ease(hp),.6+.4*ease(hp));ctx.fillStyle='#111';rr(ctx,-hw/2,-hh/2,hw,hh,Math.min(60,hh/2));ctx.fill();ctx.fillStyle='#fff';hl.forEach((l,i)=>ctx.fillText(l,0,-hh/2+22+48+i*60-8));ctx.restore();
  // question
  const qp=cl((t-.15)/.3);ctx.save();ctx.globalAlpha=qp;ctx.translate(0,(1-ease(qp))*30);ctx.font=FONT(800,78);try{ctx.letterSpacing='-2px'}catch(e){}ctx.fillStyle='#111';const ql=wrap(ctx,D.q,960);const qy=250+hh+110;txtC(ctx,ql,qy+60,88);ctx.restore();
  const cy=Math.max(1290,qy+ql.length*88+260);
  if(t<T.at){const w=Math.max(0,t-T.ts),p=w/5,n=t<T.ts?5:Math.max(1,Math.ceil(5-w)),f=t<T.ts?0:w%1;ctx.save();ctx.globalAlpha=cl((t-.4)/.3);
    ctx.lineWidth=22;ctx.fillStyle='#fff';ctx.strokeStyle='#e5e7eb';ctx.beginPath();ctx.arc(W/2,cy,150,0,7);ctx.fill();ctx.stroke();
    if(p<1){const gr=ctx.createLinearGradient(W/2-150,0,W/2+150,0);gr.addColorStop(0,'#4f46e5');gr.addColorStop(1,'#a855f7');ctx.strokeStyle=gr;ctx.lineCap='round';ctx.beginPath();ctx.arc(W/2,cy,150,-Math.PI/2+p*2*Math.PI,1.5*Math.PI);ctx.stroke()}
    const s=1+.18*Math.max(0,1-f*4);ctx.translate(W/2,cy);ctx.scale(s,s);ctx.font=FONT(800,150);ctx.fillStyle='#5b21b6';ctx.textBaseline='middle';ctx.fillText(String(n),0,8);ctx.restore();return}
  if(D.ans){const pill=(label,lc,txt,bgc,fc,y,mark,alpha,sc)=>{ctx.save();ctx.globalAlpha=alpha;ctx.translate(W/2,y);ctx.scale(sc,sc);ctx.font=FONT(700,44);ctx.fillStyle=lc;ctx.fillText(label,0,-90);
      ctx.font=FONT(800,90);const tw=ctx.measureText(txt).width+120;ctx.fillStyle=bgc;rr(ctx,-tw/2-50,-60,tw,150,40);ctx.fill();ctx.fillStyle=fc;ctx.fillText(txt,-50,46);
      ctx.font='90px "Noto Color Emoji","Apple Color Emoji",sans-serif';ctx.fillText(mark,tw/2+10,46);ctx.restore();return tw};
    if(t<T.rt){const lt=t-T.at,p=cl(lt/.25);const tw=pill(S.lang==='ru'?'Первое, что приходит в голову:':'Бірінші ойға келетін жауап:','#b91c1c',D.trap,'#fee2e2','#b91c1c',cy-60,'❌',p,.7+.3*ease(p));
      const s=cl((lt-.45)/.3);if(s>0){ctx.save();ctx.strokeStyle='#dc2626';ctx.lineWidth=10;ctx.lineCap='round';const x0=W/2-50-tw/2+30;ctx.beginPath();ctx.moveTo(x0,cy-60+15);ctx.lineTo(x0+(tw-60)*s,cy-60+15);ctx.stroke();ctx.restore()}}
    else{const lt=t-T.rt,p=cl(lt/.25);pill(S.lang==='ru'?'Правильный ответ:':'Дұрыс жауап:','#15803d',D.a,'#16a34a','#fff',cy-100,'✅',p,.7+.3*ease(p));
      ctx.save();ctx.globalAlpha=cl((lt-.3)/.3);ctx.font=FONT(700,50);ctx.fillStyle='#374151';txtC(ctx,wrap(ctx,D.why,900),cy+120,62);ctx.restore()}}}

// ---------- recording ----------
function pickMime(){const c=['video/mp4;codecs=avc1.640028,mp4a.40.2','video/mp4;codecs=avc1.4D0028,mp4a.40.2','video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1,mp4a.40.2','video/mp4;codecs=avc1,mp4a','video/mp4;codecs=avc1,opus','video/mp4','video/webm;codecs=vp9,opus','video/webm'];return c.find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m))||''}
async function record(D,samples,dur){const cv=$('reCv'),ctx=cv.getContext('2d');const ac=new AudioContext({sampleRate:SR});await ac.resume();
  const buf=ac.createBuffer(1,samples.length,SR);buf.copyToChannel(samples,0);const src=ac.createBufferSource();src.buffer=buf;const dest=ac.createMediaStreamDestination();src.connect(dest);
  (D.draw||drawFrame)(ctx,D,0);const vs=cv.captureStream(FPS);const stream=new MediaStream([...vs.getVideoTracks(),...dest.stream.getAudioTracks()]);
  const mime=pickMime();const rec=new MediaRecorder(stream,{mimeType:mime||undefined,videoBitsPerSecond:8e6,audioBitsPerSecond:192e3});const chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  const done=new Promise(r=>rec.onstop=r);rec.start(250);const t0=ac.currentTime+.1;src.start(t0);
  await new Promise(res=>{const loop=()=>{const t=ac.currentTime-t0;(D.draw||drawFrame)(ctx,D,Math.max(0,t));$('reProg').style.width=(cl(t/dur)*100)+'%';if(t>=dur){res();return}requestAnimationFrame(loop)};requestAnimationFrame(loop)});
  rec.stop();await done;src.stop();ac.close();return new Blob(chunks,{type:rec.mimeType||mime||'video/webm'})}

// ---------- history ----------
async function loadHist(){const {data,error}=await sb.from('reels').select('*').order('created_at',{ascending:false}).limit(30);if(error){$('reHist').textContent=error.message;return}
  $('reHist').innerHTML=data.length?data.map(r=>`<div style="display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)"><div style="flex:1"><div class="muted" style="font-size:12px">${fmtT(r.created_at)} · ${esc(r.lang)} · ${r.format==='answer'?'жауабымен':'коммент'} · <span class="pill ${r.status==='done'?'ok':'w'}">${esc(r.status)}</span></div><div style="font-size:13px;color:var(--ink)">${esc((r.question&&r.question.q_screen||'').replace(/\n/g,' '))}</div></div>
    ${r.video_path?`<button class="btn sec sm" data-p="${esc(r.video_path)}">⬇ Видео</button>`:''}</div>`).join(''):'<div class="empty">Әзірге жоқ</div>';
  $('reHist').querySelectorAll('button[data-p]').forEach(b=>b.onclick=async()=>{const {data:s}=await sb.storage.from('reels').createSignedUrl(b.dataset.p,3600,{download:b.dataset.p.split('/').pop()});if(s)location.href=s.signedUrl})}

window.loadRe=async()=>{elStatus();status();loadHist();loadFonts()};
window.__reelsTest={drawFrame,timeline,mixAudio,S,loadFonts};
})();
