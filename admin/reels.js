// ===== iqtest.live admin · Reels studio: Claude questions → voice plan → ElevenLabs → in-browser video =====
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
<div class="card" style="margin-bottom:12px"><h3>ElevenLabs</h3><div id="elInfo2" class="muted">Проверка…</div>
 <details id="elKeyBox2" style="margin-top:10px"><summary style="cursor:pointer;font-weight:700;color:var(--pri)">Ввести / заменить API-ключ</summary>
  <p class="muted" style="font-size:12px">ElevenLabs → Developers → API Keys → Create. Ключ хранится только на сервере (Supabase). Для Voice Design ключу нужны права «Text to Voice» и «Voices: write».</p>
  <div class="form"><label class="fld"><span>API-ключ ElevenLabs</span><input type="password" id="elKey2" autocomplete="off" placeholder="sk_…"></label><button class="btn" id="elKeyBtn2">Сохранить</button></div><div class="err" id="elKeyErr2"></div></details></div>
<details class="card" style="margin-bottom:12px" id="reAiBox"><summary style="cursor:pointer;font-weight:700">🤖 Claude (необязательно) <span id="reInfoS" class="muted" style="font-weight:500"></span></summary><div style="margin-top:10px"><div id="reInfo" class="muted">Проверка…</div>
 <details id="reKeyBox" style="margin-top:10px"><summary style="cursor:pointer;font-weight:700;color:var(--pri)">Ввести / заменить API-ключ</summary>
  <p class="muted" style="font-size:12px">console.anthropic.com → API Keys → Create Key. Ключ хранится только на сервере.</p>
  <div class="form"><label class="fld"><span>API-ключ Anthropic</span><input type="password" id="reKey" autocomplete="off" placeholder="sk-ant-…"></label><button class="btn" id="reKeyBtn">Сохранить</button></div><div class="err" id="reKeyErr"></div></details></div></details>
<div class="card" id="reQk" style="margin-bottom:12px;border-color:#ddd6fe;background:linear-gradient(180deg,#faf8ff,#fff)">
 <h3 style="margin-bottom:4px">⚡ Быстрый запуск</h3><div class="muted" style="font-size:13px;margin-bottom:10px">Один клик: ИИ пишет 4 вопроса → картинки (FLUX) → озвучка → видео → сохранение. Можно сразу пачкой.</div>
 <div class="form" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
  <label class="fld"><span>Язык</span><select id="qkLang"><option value="kz">Казахский</option><option value="ru">Русский</option><option value="mix">По очереди KZ / RU</option></select></label>
  <label class="fld"><span>Голос</span><select id="qkVoice"><option value="">Загрузка…</option></select></label>
  <label class="fld"><span>Сколько видео</span><input id="qkN" type="number" min="1" max="30" value="1"></label>
 </div>

 <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="qkGoDb" style="flex:1;min-width:200px">📚 Создать из базы <span id="qkDbN" style="opacity:.8;font-weight:600"></span></button><button class="btn sec" id="qkGo" style="flex:1;min-width:200px">🤖 Создать через ИИ (Anthropic)</button><button class="btn sec hide" id="qkStop">⏹ Остановить после текущего</button></div>
 <div class="muted" id="qkNote" style="font-size:12px;margin-top:8px">Пока идёт создание, держите эту вкладку открытой. Одно видео ≈ 1–2 мин. Расход ElevenLabs ≈ 400–500 символов на видео.</div>
 <div id="qkQ" style="display:grid;gap:6px;margin-top:10px"></div>
</div>
<details class="card" id="reManual" style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:700">🛠 Ручной режим (пошагово, с правками)</summary><div style="margin-top:10px">
<div id="reS1"><h3>1. Вопросы</h3>
 <div class="form">
  <label class="fld"><span>Источник вопросов</span><select id="reSrc"><option value="ai" selected>ИИ (Claude) придумает</option></select></label>
  <label class="fld"><span>Язык</span><select id="reLang"><option value="kz">Казахский</option><option value="ru">Русский</option></select></label>
  <label class="fld"><span>Формат</span><select id="reFmt"><option value="quiz" selected>🎯 Викторина: 4 вопроса × 3 варианта (в конце — комментарий)</option><option value="comment">Без ответа — «Пишите в комментариях»</option><option value="answer">С ответом — «Подробнее»</option></select></label>
  <label class="fld" id="reHintL" style="grid-column:span 2;display:none"><span>Дополнительное пожелание (необязательно)</span><input id="reHint" placeholder="например: про возраст, про календарь, попроще…"></label>
 </div>
 <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="reGenDb" style="flex:1">📚 Вопросы из базы</button><button class="btn sec" id="reGen" style="flex:1">✨ ИИ: предложить вопросы</button></div><div class="err" id="reGenErr"></div>
 <div id="reQs" class="grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr));margin-top:12px"></div>
</div>
</div></details>
<div class="card hide" id="reS2" style="margin-top:12px"><h3>2. Озвучка: предложение</h3><div id="rePlan"></div></div>
<div class="card hide" id="reS3" style="margin-top:12px"><h3>3. Видео</h3>
 <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
  <canvas id="reCv" width="${W}" height="${H}" style="width:270px;height:480px;border-radius:14px;border:1px solid var(--line);background:#f7f8fb"></canvas>
  <div style="flex:1;min-width:240px"><div id="reStat" class="muted"></div><div class="fun"><div class="tr" style="height:12px;margin:10px 0"><i id="reProg" style="width:0"></i></div></div><div id="reOut"></div></div>
 </div></div>
<div class="card" style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><h3 style="margin:0">🎬 Созданные Reels <span class="muted" id="reHistN" style="font-weight:500"></span></h3></div>
 <div id="reHist" class="rgal" style="margin-top:12px">—</div><button class="btn sec hide" id="reMore" style="width:100%;margin-top:12px">Показать ещё</button></div>
<style>.rgal{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px}.rgal .rv{display:flex;flex-direction:column;gap:6px;min-width:0}
.rgal .rvv{position:relative;aspect-ratio:9/16;border-radius:14px;overflow:hidden;background:#111;border:1px solid var(--line)}.rgal video{width:100%;height:100%;object-fit:cover;display:block;background:#111}
.rgal .rvn{position:absolute;inset:0;display:grid;place-items:center;color:#cbd5e1;font-size:13px;text-align:center;padding:10px;background:#1f2937}.rgal .rvq{font-size:12px;line-height:1.35;color:var(--ink);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.rgal .rvm{font-size:11px;color:var(--mut,#6b7280);display:flex;gap:6px;flex-wrap:wrap;align-items:center}@media(max-width:520px){.rgal{grid-template-columns:repeat(2,1fr);gap:10px}}</style>`;

async function status(){try{const s=await RL({action:'status'});S.ai=s.connected;$('reInfoS').textContent=s.connected?'· подключён':'· не подключён';$('reInfo').innerHTML=s.connected?`<span class="pill ok">Подключено</span> Модель: <b>${esc(s.model)}</b>`:`<span class="pill w">Не подключено</span> Работает и без Claude — выберите «Готовая база».`;$('reKeyBox').open=!s.connected}catch(e){$('reInfo').innerHTML=`<span class="pill bad">Ошибка</span> ${esc(e.message)}`}}
$('reFmt').onchange=()=>{const q=$('reFmt').value==='quiz';$('reSrc').closest('label').style.display=q?'none':''};$('reFmt').onchange();
$('reSrc').onchange=()=>{$('reHintL').style.display=$('reSrc').value==='ai'?'':'none'};
async function elStatus(){try{const st=await EL({action:'status'});S.el=st.connected;$('elInfo2').innerHTML=st.connected?`<span class="pill ok">Подключено</span> Тариф: <b>${esc(st.tier)}</b> · ${(st.used||0).toLocaleString('ru-RU')} / ${(st.limit||0).toLocaleString('ru-RU')} символов`:`<span class="pill bad">Не подключено</span> ${esc(st.error||'Введите API-ключ')}`;$('elKeyBox2').open=!st.connected}catch(e){$('elInfo2').innerHTML=`<span class="pill bad">Ошибка</span> ${esc(e.message)}`}}
$('elKeyBtn2').onclick=async()=>{$('elKeyErr2').textContent='';$('elKeyBtn2').disabled=true;try{await EL({action:'save_key',key:$('elKey2').value});$('elKey2').value='';S.voices=[];await elStatus()}catch(e){$('elKeyErr2').textContent=e.message}$('elKeyBtn2').disabled=false};
$('reKeyBtn').onclick=async()=>{$('reKeyErr').textContent='';$('reKeyBtn').disabled=true;try{await RL({action:'save_key',key:$('reKey').value});$('reKey').value='';await status()}catch(e){$('reKeyErr').textContent=e.message}$('reKeyBtn').disabled=false};

const busy=(b,on,txt)=>{b.disabled=on;if(txt)b.textContent=txt};
$('reGen').onclick=async()=>{if($('reFmt').value==='quiz')return genQuiz();S.lang=$('reLang').value;S.format=$('reFmt').value;$('reGenErr').textContent='';S.src=$('reSrc').value;busy($('reGen'),true,S.src==='ai'?'Claude думает… (30–60 сек)':'Подбираем…');
  try{if(S.src==='ai'){const r=await RL({action:'questions',lang:S.lang,hint:$('reHint').value,avoid:S.qs.map(q=>q.q_screen)});S.qs=r.questions||[]}
    else{const {data:prev}=await sb.from('reels').select('question').order('created_at',{ascending:false}).limit(200);S.qs=RBANK.pick5(S.lang,[...(prev||[]).map(p=>p.question&&p.question.q_screen),...S.qs.map(q=>q.q_screen)])}
    S.q=null;drawQs()}
  catch(e){$('reGenErr').textContent=e.message}busy($('reGen'),false,'✨ Ещё 5 вопросов')};
function drawQs(){$('reQs').innerHTML=S.qs.map((q,i)=>`<div class="card" style="display:flex;flex-direction:column;gap:6px;${S.q===q?'outline:2px solid var(--pri)':''}">
  <span class="pill p" style="align-self:flex-start">${esc(q.type||'')} · ${'★'.repeat(Math.max(1,Math.min(5,+q.difficulty||3)))}</span>
  <b style="white-space:pre-line;line-height:1.35">${esc(q.q_screen)}</b>
  <div style="font-size:13px">✅ <b>${esc(q.answer)}</b> <span class="muted">— ${esc(q.why||'')}</span></div>
  <div style="font-size:12px" class="muted">Ловушка: ${esc(q.trap||'—')}</div>
  <button class="btn sm" data-i="${i}" style="margin-top:auto">Выбрать этот</button></div>`).join('');
  $('reQs').querySelectorAll('button').forEach(b=>b.onclick=()=>pick(+b.dataset.i))}

async function voices(){if(S.voices.length)return S.voices;const v=await EL({action:'voices'});S.voices=(v&&v.voices)||[];
  if(!localStorage.getItem('el_model'))(async()=>{try{const m=await EL({action:'models'});const k=m.models.find(x=>x.langs.some(l=>/^kk|kaz/i.test(l)))||m.models.find(x=>/v3/.test(x.id))||m.models[0];if(k)localStorage.setItem('el_model',k.id)}catch(e){}})();
  return S.voices}
async function pick(i){S.q=S.qs[i];drawQs();$('reS2').classList.remove('hide');$('reS3').classList.add('hide');$('rePlan').innerHTML='<div class="muted">Готовим предложение по озвучке…</div>';$('reS2').scrollIntoView({behavior:'smooth'});
  try{const vs=await voices();const p=S.src==='ai'?await RL({action:'voice_plan',lang:S.lang,format:S.format,question:S.q,voices:vs.map(v=>({id:v.id,name:v.name,category:v.category,labels:v.labels}))}):RBANK.plan(S.q,S.lang,S.format,vs);S.plan=p;drawPlan()}
  catch(e){$('rePlan').innerHTML=`<div class="err">${esc(e.message)}</div><button class="btn sec sm" onclick="this.parentElement.innerHTML='';">OK</button>`}}
const fld=(id,l,v,ta)=>`<label class="fld"><span>${l}</span>${ta?`<textarea id="${id}" rows="${ta}" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font:inherit">${esc(v)}</textarea>`:`<input id="${id}" value="${esc(v)}">`}</label>`;
function drawPlan(){const p=S.plan,q=S.q,st=p.settings||{},ans=S.format==='answer';
  const vopt=S.voices.map(v=>`<option value="${esc(v.id)}" ${v.id===p.voice_id?'selected':''}>${esc(v.name)}${v.category&&v.category!=='premade'?' · '+esc(v.category):''}</option>`).join('');
  $('rePlan').innerHTML=`<div class="note" style="background:#f5f3ff;border-color:#ddd6fe;color:#3b0764">🎙 <b>Предложение:</b> ${esc(p.voice_name||'')} — ${esc(p.reason||'')}</div>
   <div class="grid two" style="margin-top:0">
    <div>${fld('pHookS','Hook на экране',p.hook_screen,2)}${fld('pQS','Вопрос на экране',q.q_screen,4)}${ans?fld('pAns','Ответ (экран)',q.answer)+fld('pWhy','Пояснение (экран)',q.why)+fld('pTrap','Неверный ответ (зачёркивается)',q.trap):''}
      ${fld('pOT','Финальный экран — заголовок',p.outro_screen_title,2)}${fld('pOS','Финальный экран — подпись',p.outro_screen_sub,2)}${fld('pOB','Кнопка',p.outro_button)}</div>
    <div>${fld('pVQ','🎙 Голос: hook + вопрос',(p.hook_voice||'')+' '+(p.question_voice||q.q_voice||''),4)}${ans?fld('pVA','🎙 Голос: ответ',p.answer_voice||q.answer_voice||'',2):''}${fld('pVO','🎙 Голос: финал',p.outro_voice,2)}
      ${narr(vopt,st)}</div></div>
   <button class="btn" id="reGo" style="width:100%;margin-top:6px">✅ Согласен — создать озвучку и видео</button><div class="err" id="reGoErr"></div>`;
  $('reGo').onclick=build;voiceUI()}
const VPRE={
 quiz:{n:'🎤 Харизматичный ведущий (муж.)',kz:'Charismatic Kazakh male TikTok quiz host in his early 30s, native Kazakh speaker with a natural Kazakh accent, warm mid-low voice, energetic and playful with a hint of intrigue, confident medium-fast pace, crisp studio-quality recording.',ru:'Charismatic male TikTok quiz host in his early 30s from Kazakhstan, native Russian speaker with a light Kazakhstani accent, warm mid-low voice, energetic and playful with a hint of intrigue, confident medium-fast pace, crisp studio-quality recording.'},
 female:{n:'😊 Тёплый, уверенный (жен.)',kz:'Friendly confident Kazakh woman in her late 20s, native Kazakh speaker, bright clear voice with a smile, engaging storyteller tone for short social media videos, medium pace, crisp studio-quality recording.',ru:'Friendly confident woman in her late 20s from Kazakhstan, native Russian speaker, bright clear voice with a smile, engaging storyteller tone for short social media videos, medium pace, crisp studio-quality recording.'},
 elder:{n:'🧓 Мудрый аксакал',kz:'Wise Kazakh grandfather (aksakal) in his 60s, native Kazakh speaker, deep warm slightly raspy voice, calm, kind and a little mischievous, as if telling a riddle to his grandchildren, unhurried pace, clean recording.',ru:'Wise grandfather in his 60s from Kazakhstan, native Russian speaker, deep warm slightly raspy voice, calm, kind and a little mischievous, as if telling a riddle to his grandchildren, unhurried pace, clean recording.'},
 young:{n:'⚡ Молодой блогер (энергичный)',kz:'Young energetic Kazakh male blogger around 22, native Kazakh speaker, fast lively delivery, excited and fun, modern social media vibe, clear crisp recording.',ru:'Young energetic male blogger around 22 from Kazakhstan, native Russian speaker, fast lively delivery, excited and fun, modern social media vibe, clear crisp recording.'},
 mystery:{n:'🕵️ Таинственный, драматичный',kz:'Mysterious dramatic Kazakh male narrator in his 40s, native Kazakh speaker, deep resonant cinematic voice, slow suspenseful delivery like a movie trailer, building curiosity, studio-quality recording.',ru:'Mysterious dramatic male narrator in his 40s from Kazakhstan, native Russian speaker, deep resonant cinematic voice, slow suspenseful delivery like a movie trailer, building curiosity, studio-quality recording.'}};
let VMODE='design',VPICK=null;
function voiceUI(){const setM=m=>{VMODE=m;$('vmD').classList.toggle('on',m==='design');$('vmE').classList.toggle('on',m==='exist');$('vpD').classList.toggle('hide',m!=='design');$('vpE').classList.toggle('hide',m!=='exist');selInfo()};
  $('vmD').onclick=()=>setM('design');$('vmE').onclick=()=>setM('exist');$('pVoice').onchange=selInfo;
  const fill=()=>{$('vdDesc').value=VPRE[$('vdPre').value][S.lang]};$('vdPre').onchange=fill;
  $('vdPre').value=S.format==='comment'?'quiz':'quiz';fill();VPICK=null;
  $('vdGo').onclick=()=>doDesign().catch(()=>{});
  setM('exist');const h=[...$('pVoice').options].find(o=>/^\s*Hale\b/i.test(o.textContent));if(h)$('pVoice').value=h.value;
  else $('vSel').insertAdjacentHTML('afterend','<div class="err">Голос «Hale» не найден в вашей библиотеке ElevenLabs — добавьте его из Voice Library в «My Voices».</div>');selInfo()}
let PREV=null,DESIGNING=null;
function doDesign(){if(DESIGNING)return DESIGNING;$('vdErr').textContent='';busy($('vdGo'),true,'ElevenLabs создаёт 3 голоса… (~20 сек)');$('vdPrev').innerHTML='<div class="muted">🎨 Создаём варианты голоса…</div>';PREV=null;
  DESIGNING=(async()=>{try{const text=[val('pVQ'),val('pVO')].join(' ');const r=await EL({action:'design',description:$('vdDesc').value,text});PREV=r.previews||[];
      if(!PREV.length)throw new Error('ElevenLabs не вернул вариантов');
      $('vdPrev').innerHTML=PREV.map((p,i)=>`<div class="card" style="padding:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="width:22px">${i+1}</b><audio controls src="data:${p.type};base64,${p.audio}" style="flex:1;min-width:180px;height:36px"></audio><button type="button" class="btn sm" data-i="${i}">Выбрать этот</button></div>`).join('');
      $('vdPrev').querySelectorAll('button').forEach(b=>b.onclick=()=>pickPrev(+b.dataset.i).catch(()=>{}));selInfo();return PREV}
    catch(e){$('vdErr').textContent=e.message;$('vdPrev').innerHTML='';throw e}
    finally{busy($('vdGo'),false,'🎨 Ещё 3 варианта');DESIGNING=null}})();return DESIGNING}
async function pickPrev(i){const p=PREV[i],b=$('vdPrev').querySelector(`button[data-i="${i}"]`);if(b)busy(b,true,'Сохраняем…');
  try{const nm='iqtest.live · '+$('vdPre').selectedOptions[0].textContent.replace(/^[^\s]+\s/,'')+' · '+new Date().toLocaleDateString('ru-RU');
    const s=await EL({action:'save_voice',generated_voice_id:p.id,name:nm.slice(0,60),description:$('vdDesc').value});
    S.voices.unshift({id:s.voice_id,name:s.name,category:'generated'});const o=document.createElement('option');o.value=s.voice_id;o.textContent=s.name+' · generated';$('pVoice').prepend(o);$('pVoice').value=s.voice_id;
    VPICK=s.voice_id;localStorage.setItem('el_voice',s.voice_id);$('vdPrev').querySelectorAll('.card').forEach((c,k)=>c.style.outline=k===i?'2px solid var(--pri)':'');$('vdPrev').querySelectorAll('button').forEach((x,k)=>{x.disabled=false;x.textContent=k===i?'✓ Выбран':'Выбрать этот'});selInfo();return VPICK}
  catch(e){$('vdErr').textContent=e.message;if(b)busy(b,false,'Выбрать этот');throw e}}

function selInfo(){const id=VMODE==='design'?VPICK:$('pVoice').value;const v=S.voices.find(x=>x.id===id);$('vSel').innerHTML=id&&v?`Выбранный диктор: <b>${esc(v.name)}</b>`:VMODE==='design'?'Прослушайте варианты и выберите понравившийся. Если не выбрать — возьмём 1-й.':''}


function narr(vopt,st){return `<div class="card" style="background:#faf8ff;border-color:#e9e3ff;margin-bottom:12px"><b>🎨 Диктор</b>
       <div class="seg" style="margin:10px 0;display:flex"><button type="button" id="vmE" class="on" style="flex:1">📚 Мои голоса</button><button type="button" id="vmD" style="flex:1">✨ Voice Design</button></div>
       <div id="vpD"><label class="fld"><span>Образ</span><select id="vdPre">${Object.keys(VPRE).map(k=>`<option value="${k}">${VPRE[k].n}</option>`).join('')}</select></label>
        <label class="fld"><span>Описание голоса (лучше на английском — можно менять)</span><textarea id="vdDesc" rows="4" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font:inherit"></textarea></label>
        <button type="button" class="btn sec" id="vdGo" style="width:100%">🎨 Создать 3 варианта голоса</button><div class="err" id="vdErr"></div><div id="vdPrev" class="grid" style="gap:8px;margin-top:8px"></div></div>
       <div id="vpE" class="hide"><label class="fld"><span>Голос (по умолчанию: Hale)</span><select id="pVoice">${vopt}</select></label></div>
       <div class="muted" style="font-size:12px" id="vSel"></div></div>
      <div class="form" style="grid-template-columns:repeat(2,1fr)">
       ${[['pStab','Стабильность',st.stability??.5,0,1],['pSim','Сходство',st.similarity??.75,0,1],['pSty','Стиль',st.style??.2,0,1],['pSpd','Скорость',st.speed??1,.7,1.2]].map(([id,l,v,a,b])=>`<label class="fld"><span>${l} <b id="${id}v">${v}</b></span><input type="range" id="${id}" min="${a}" max="${b}" step="0.05" value="${v}" oninput="document.getElementById('${id}v').textContent=this.value"></label>`).join('')}</div>`}
// ---------- quiz (викторина) ----------
// Questions come only from AI (Claude via /api/reels/quiz). Previously used questions are sent so they are not repeated.
async function usedQs(){const {data:prev}=await sb.from('reels').select('question').eq('format','quiz').order('created_at',{ascending:false}).limit(60);
  const used=[];(prev||[]).forEach(p=>(p.question&&p.question.quiz||[]).forEach(x=>used.push(String(x).replace(/\n/g,' '))));return used}
async function aiQuiz(n,extra,lang){const r=await fetch('/api/reels/quiz',{method:'POST',headers:{Authorization:'Bearer '+await tok(),'Content-Type':'application/json'},body:JSON.stringify({lang:lang||S.lang,n,avoid:[...(extra||[]),...await usedQs()]})});
  const j=await r.json().catch(()=>({}));
  if(!j.ok)throw new Error(/ANTHROPIC_API_KEY/.test(j.error||'')?'В Render не задан ANTHROPIC_API_KEY — используйте «📚 из базы»':'ИИ не смог написать вопросы ('+(j.error||'HTTP '+r.status)+'). Используйте «📚 из базы».');
  S.qSrc='ai';return QUIZ.fromAI(j.items)}
// ---------- 📚 offline question bank (admin/quiz-bank.json, scripts/build-quiz-bank.py) ----------
let BANK=null,BANKP=null;const BANK_USED=new Set();
const FACTY=new Set(['fact','capital','continent','element']);
function bankLoad(){if(!BANKP)BANKP=fetch('quiz-bank.json?v=1').then(r=>r.json()).then(b=>{BANK=b;return b}).catch(e=>{BANKP=null;throw new Error('База не загрузилась')});return BANKP}
async function bankUsedLoad(){const {data}=await sb.from('reels').select('question').eq('format','quiz').limit(5000);
  (data||[]).forEach(r=>(r.question&&r.question.bank||[]).forEach(id=>BANK_USED.add(id)));
  const norm=t=>String(t).replace(/\n/g,' ').replace(/\s+/g,' ').trim().toLowerCase();const usedQ=new Set();(data||[]).forEach(r=>(r.question&&r.question.quiz||[]).forEach(q=>usedQ.add(norm(q))));
  (BANK||[]).forEach(x=>{if(usedQ.has(norm(x.q)))BANK_USED.add(x.id)})}
function bankFree(){return BANK?BANK.filter(x=>!BANK_USED.has(x.id)).length:0}
// 2 easy + 1 medium + 1 comment question, 4 different topics, at most 2 math questions, facts preferred where available
function bankPick(){const free=BANK.filter(x=>!BANK_USED.has(x.id));const pick=[],topics=new Set();let math=0;
  const take=(lvl,preferFact)=>{let pool=free.filter(x=>x.l===lvl&&!topics.has(x.t)&&!pick.includes(x));const facts=pool.filter(x=>FACTY.has(x.t));
    if((preferFact||math>=2)&&facts.length)pool=facts;else if(!preferFact&&math<2){const m=pool.filter(x=>!FACTY.has(x.t));if(m.length&&Math.random()<.85)pool=m}
    if(!pool.length)pool=free.filter(x=>x.l===lvl&&!pick.includes(x));if(!pool.length)return false;
    const tps=[...new Set(pool.map(x=>x.t))],tp=tps[Math.floor(Math.random()*tps.length)],tpool=pool.filter(x=>x.t===tp);const x=tpool[Math.floor(Math.random()*tpool.length)];pick.push(x);topics.add(x.t);if(!FACTY.has(x.t))math++;return true};
  if(!(take(1,true)&&take(1,false)&&take(2,true)&&take(3,Math.random()<.5)))return null;
  pick.forEach(x=>BANK_USED.add(x.id));return pick}
async function bankQuiz(lang){if(lang&&lang!=='kz')throw new Error('База пока только на казахском — выберите язык «Казахский».');
  if(!BANK){await bankLoad();await bankUsedLoad()}const p=bankPick();if(!p)throw new Error('В базе закончились неиспользованные вопросы.');
  S.qSrc='bank';const set=QUIZ.fromAI(p);set.forEach((q,i)=>q.bid=p[i].id);$('qkDbN')&&($('qkDbN').textContent=`· ${bankFree()}`);return set}
async function bankInfo(){try{await bankLoad();await bankUsedLoad();$('qkDbN').textContent=`· ${bankFree().toLocaleString('ru-RU')}`}catch(e){}}
async function genQuizDb(){S.lang=$('reLang').value;S.format='quiz';$('reGenErr').textContent='';busy($('reGenDb'),true,'Берём из базы…');
  try{S.set=await bankQuiz(S.lang);drawSet()}catch(e){$('reGenErr').textContent=e.message}busy($('reGenDb'),false,'📚 Другие 4 из базы')}
$('reGenDb').onclick=genQuizDb;
async function genQuiz(){S.qSrc='ai';S.lang=$('reLang').value;S.format='quiz';$('reGenErr').textContent='';busy($('reGen'),true,'ИИ пишет вопросы… (≈20–40 сек)');
  try{S.set=await aiQuiz(4);drawSet()}
  catch(e){$('reGenErr').textContent=e.message}busy($('reGen'),false,'✨ Другие 4 вопроса (ИИ)')}
async function swapQ(i,btn){btn.disabled=true;btn.textContent='⏳';try{const [x]=S.qSrc==='bank'?(await bankQuiz(S.lang)).slice(i,i+1):await aiQuiz(1,S.set.map(q=>q.q.replace(/\n/g,' ')));S.set[i]=x;drawSet()}catch(e){$('reGenErr').textContent=e.message;btn.disabled=false;btn.textContent='🔄'}}
function drawSet(){$('reQs').innerHTML=`<div class="card" style="grid-column:1/-1">${S.set.map((q,i)=>`<div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)">
   <div style="font-size:40px;width:52px;text-align:center">${q.emo}</div><div style="flex:1"><b>${i+1}. ${esc(q.q.replace(/\n/g,' '))}</b><div style="font-size:13px;margin-top:4px">${q.o.map((o,k)=>k===q.a&&i<3?`<span class="pill ok">${esc(o)}</span>`:`<span class="pill">${esc(o)}</span>`).join(' ')}${i===3?' <span class="muted">— ответ не озвучивается, в комментарии</span>':''}</div></div>
   <button class="btn sec sm" data-s="${i}">🔄</button></div>`).join('')}
   <button class="btn" id="qzNext" style="width:100%;margin-top:12px">Продолжить с этими 4 вопросами →</button></div>`;
  $('reQs').querySelectorAll('button[data-s]').forEach(b=>b.onclick=()=>swapQ(+b.dataset.s,b));$('qzNext').onclick=pickQuiz}
async function pickQuiz(){$('reS2').classList.remove('hide');$('reS3').classList.add('hide');$('rePlan').innerHTML='<div class="muted">Готовим…</div>';$('reS2').scrollIntoView({behavior:'smooth'});
  try{const vs=await voices();const pv=localStorage.getItem('el_voice');const vo=QUIZ.voices(S.set,S.lang);const st={stability:.45,similarity:.8,style:.25,speed:1.05};
    const vopt=vs.map(v=>`<option value="${esc(v.id)}" ${v.id===pv?'selected':''}>${esc(v.name)}${v.category&&v.category!=='premade'?' · '+esc(v.category):''}</option>`).join('');
    $('rePlan').innerHTML=`<div class="grid two" style="margin-top:0"><div>${S.set.map((q,i)=>`<div class="card" style="margin-bottom:10px"><b>${i+1}-й вопрос</b>${i===3?' <span class="muted">(ответ не озвучивается)</span>':''}
       <div style="display:flex;gap:10px;align-items:center;margin:8px 0"><div id="qi${i}" style="width:150px;height:100px;border-radius:12px;background:${q.col};display:grid;place-items:center;overflow:hidden;font-size:12px;color:#555;flex:none">…</div>
         <div style="flex:1;font-size:13px"><b>🎨 Картинка (FLUX)</b><div class="muted" id="qis${i}">Рисуем по теме вопроса (без ответа)…</div><button class="btn sec sm" data-ill="${i}" style="margin-top:6px">🔄 Перерисовать</button></div></div>
       <div class="form" style="grid-template-columns:70px 1fr"><label class="fld"><span>Эмодзи</span><input id="qe${i}" value="${esc(q.emo)}" style="font-size:22px;text-align:center"></label>${fld('qq'+i,'Вопрос (экран)',q.q,2)}</div>
       <div class="form" style="grid-template-columns:repeat(3,1fr)">${q.o.map((o,k)=>`<label class="fld"><span>${k===q.a?'✅ ':''}${k+1}-й вариант</span><input id="qo${i}_${k}" value="${esc(o)}"></label>`).join('')}</div>
       <label class="fld"><span>Правильный ответ</span><select id="qa${i}">${[0,1,2].map(k=>`<option value="${k}" ${k===q.a?'selected':''}>${k+1}-й вариант</option>`).join('')}</select></label>
       ${fld('qvq'+i,'🎙 Голос: вопрос',vo[i].q,2)}${fld('qva'+i,i===3?'🎙 Голос: финал':'🎙 Голос: ответ',vo[i].a,2)}</div>`).join('')}</div>
     <div><textarea id="pVQ" class="hide">${esc(vo[0].q)}</textarea><textarea id="pVO" class="hide">${esc(vo[1].a)}</textarea>${narr(vopt,st)}</div></div>
     <button class="btn" id="reGo" style="width:100%;margin-top:6px">✅ Согласен — создать озвучку и видео</button><div class="err" id="reGoErr"></div>`;
    $('reGo').onclick=buildQuiz;voiceUI();S.ill=[];
    $('rePlan').querySelectorAll('button[data-ill]').forEach(b=>b.onclick=()=>genIll(+b.dataset.ill));S.set.forEach((_,i)=>genIll(i))}
  catch(e){$('rePlan').innerHTML=`<div class="err">${esc(e.message)}</div>`}}
// ---------- Claude illustrations (server /api/reels/illus → Anthropic API, key in Render env) ----------
const ILLC={};
async function genIll(i){const box=$('qi'+i),st=$('qis'+i);if(!box)return;const q=val('qq'+i)||S.set[i].q,o=[0,1,2].map(k=>val(`qo${i}_${k}`)),a=+($('qa'+i)?.value||0);
  const seq=(S.illSeq=(S.illSeq||0)+1);S.ill[i]=null;box.textContent='⏳';st.textContent='Рисуем… (≈10–30 сек)';
  try{const r=await fetch('/api/reels/illus',{method:'POST',headers:{Authorization:'Bearer '+await tok(),'Content-Type':'application/json'},body:JSON.stringify({q,o,a,lang:S.lang})});
    const j=await r.json().catch(()=>({}));if(!j.ok)throw new Error(j.error||('HTTP '+r.status));
    if(val('qq'+i)!==q&&val('qq'+i))return;const src=j.src||svgUrl(j.svg);S.ill[i]=src;box.innerHTML='';const im=new Image();im.style.cssText='width:100%;height:100%;object-fit:cover';im.src=src;box.appendChild(im);st.textContent='Готово ✓ ('+(j.src?'FLUX':'Claude')+') — будет в видео вместо эмодзи';if(j.prompt)st.title=j.prompt}
  catch(e){S.ill[i]=null;box.textContent=val('qe'+i)||S.set[i].emo;box.style.fontSize='48px';
    st.textContent=/not set/.test(e.message)?'Ключи картинок (Cloudflare) не заданы в Render — будет эмодзи':'Не получилось ('+e.message+') — будет эмодзи'}}
function svgUrl(s){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s)}
let MASC=null;function mascotImg(){if(!MASC)MASC=loadImg('/assets/hero-scientist-sm.webp?v=2');return MASC}
function loadImg(src){return new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=src})}
// Rasterise once at tile size ×2 so drawing each frame is a cheap bitmap copy.
async function illBitmap(src){if(!src)return null;if(ILLC[src])return ILLC[src];const im=await loadImg(src);if(!im)return null;
  const c=document.createElement('canvas');c.width=1200;c.height=800;const iw=im.naturalWidth||1200,ih=im.naturalHeight||800,sc=Math.max(1200/iw,800/ih),dw=iw*sc,dh=ih*sc;
  c.getContext('2d').drawImage(im,(1200-dw)/2,(800-dh)/2,dw,dh);return ILLC[src]=c}
// Kazakh style guard: fixes common colloquial forms in every editable field before voicing
function kzFix(){if(S.lang!=='kz')return;$('rePlan').querySelectorAll('input,textarea').forEach(el=>{let v=el.value,o=v;
  v=v.replace(/(^|[\s«(])қайсы\?/g,'$1қандай?').replace(/(^|[\s«(])Қайсы\?/g,'$1Қандай?').replace(/(жылы|қашан|қай жерде|қай қалада|қай елде)(\s+)туған(\b|\?|\s|$)/g,'$1$2туылған$3');
  if(v!==o)el.value=v})}
async function buildQuiz(){unlockAudio();kzFix();$('reGoErr').textContent='';busy($('reGo'),true,'Создаём озвучку…');
  if(VMODE==='design'&&!VPICK){try{busy($('reGo'),true,'Готовим диктора…');if(!PREV||!PREV.length)await doDesign();await pickPrev(0)}catch(e){$('reGoErr').textContent='Voice Design: '+e.message+' — попробуйте через «📚 Мои голоса».';busy($('reGo'),false,'✅ Согласен — создать озвучку и видео');return}}
  const set=S.set.map((q,i)=>({emo:val('qe'+i)||q.emo,col:q.col,q:val('qq'+i),o:[0,1,2].map(k=>val(`qo${i}_${k}`)),a:+$('qa'+i).value}));
  const D={set,draw:QUIZ.draw,mascot:await mascotImg(),lang:typeof lang!=='undefined'?lang:S.lang};const vid=$('pVoice').value,vname=$('pVoice').selectedOptions[0]?.textContent,sets={stability:+$('pStab').value,similarity:+$('pSim').value,style:+$('pSty').value,speed:+$('pSpd').value};
  $('reS3').classList.remove('hide');$('reS3').scrollIntoView({behavior:'smooth'});
  try{await loadFonts();for(let i=0;i<set.length;i++){const b=await illBitmap(S.ill&&S.ill[i]);if(b)set[i].img=b}
    const parts=[];set.forEach((q,i)=>{parts.push(['q'+i,val('qvq'+i)]);parts.push(['a'+i,val('qva'+i)])});const clips={},paths={};
    for(const [k,t] of parts){if(!t)continue;$('reStat').textContent=`ElevenLabs: озвучка (${Object.keys(clips).length+1}/${parts.length})…`;const r=await tts(t,vid,vname,sets);clips[k]=await decode(r.url);paths[k]=r.job&&r.job.path}
    D.tl=QUIZ.timeline(D,clips);
    const {data:row}=await sb.from('reels').insert({lang:S.lang,format:'quiz',question:{quiz:set.map(q=>q.q),set,q_screen:set.map(q=>q.q.replace(/\n/g,' ')).join(' | ')},script:{voices:parts},voice:{id:vid,name:vname,settings:sets},audio_paths:paths,status:'audio'}).select().single();S.reelId=row&&row.id;
    $('reStat').textContent='Собираем аудиодорожку…';const audio=QUIZ.mix(D.tl,clips,await bgm());QUIZ.draw($('reCv').getContext('2d'),D,1);
    $('reStat').innerHTML='Записываем видео — не закрывайте страницу и не переключайте вкладку (≈'+Math.ceil(D.tl.dur)+' сек)…';
    const blob=await record(D,audio,D.tl.dur);await finishVideo(blob)}
  catch(e){$('reGoErr').textContent=e.message;$('reStat').textContent='Ошибка: '+e.message}
  busy($('reGo'),false,'✅ Согласен — создать озвучку и видео')}
async function finishVideo(blob){const ext=blob.type.includes('mp4')?'mp4':'webm',url=URL.createObjectURL(blob),fn=`iqly_reels_${S.reelId||Date.now()}.${ext}`;
  $('reOut').innerHTML=`<video src="${url}" controls playsinline style="width:270px;border-radius:14px;display:block;margin-bottom:8px"></video><a class="btn" href="${url}" download="${fn}" style="display:inline-block;text-decoration:none">⬇ Скачать видео (${ext.toUpperCase()})</a> <button class="btn sec" id="reNew">＋ Новый Reels</button><div class="muted" style="font-size:12px;margin-top:6px">Запись: ${esc(S.recMode||'—')}</div>`;
  $('reNew').onclick=()=>{$('reS2').classList.add('hide');$('reS3').classList.add('hide');window.scrollTo({top:0,behavior:'smooth'});if(S.format==='quiz')genQuiz()};
  $('reStat').textContent='Готово ✓ Сохраняем…';
  if(S.reelId){const path=`${new Date().toISOString().slice(0,10)}/${S.reelId}.${ext}`;const up=await sb.storage.from('reels').upload(path,blob,{contentType:blob.type.split(';')[0]});if(!up.error)await sb.from('reels').update({video_path:path,status:'done'}).eq('id',S.reelId)}
  $('reStat').textContent='Готово ✓';loadHist()}

// ---------- build ----------
const val=id=>($(id)?$(id).value:'').trim();
async function tts(text,voice_id,voice_name,settings){const r=await EL({action:'tts',text,voice_id,voice_name,model_id:localStorage.getItem('el_model')||undefined,settings});return r}
// ---------- background music: one fixed track for all reels (IQ Light 7, scripts/make-reels-music.py) ----------
let BGM=null;const BGM_LOOP=19.2;// seconds: exact length of the track's 16 bars (the decoder adds a few ms of padding)
function bgm(){if(!BGM)BGM=decode('audio/iq-light7.m4a?v=1').then(b=>b&&b.length>Math.round(SR*BGM_LOOP)?b.subarray(0,Math.round(SR*BGM_LOOP)):b).catch(e=>{console.warn('bg music',e);BGM=null;return null});return BGM}
async function decode(url){const ab=await (await fetch(url)).arrayBuffer();const oc=new OfflineAudioContext(1,SR,SR);const b=await oc.decodeAudioData(ab);return b.getChannelData(0)}
async function build(){kzFix();const ans=S.format==='answer';$('reGoErr').textContent='';busy($('reGo'),true,'Создаём озвучку…');
  if(VMODE==='design'&&!VPICK){try{$('reGoErr').textContent='';busy($('reGo'),true,'Готовим диктора…');if(!PREV||!PREV.length)await doDesign();await pickPrev(0)}catch(e){$('reGoErr').textContent='Voice Design: '+e.message+' — попробуйте через «📚 Мои голоса».';busy($('reGo'),false,'✅ Согласен — создать озвучку и видео');return}}
  const D={hook:val('pHookS'),q:val('pQS'),a:val('pAns'),why:val('pWhy'),trap:val('pTrap'),ot:val('pOT'),os:val('pOS'),ob:val('pOB'),ans};
  const vid=$('pVoice').value,vname=$('pVoice').selectedOptions[0]?.textContent,set={stability:+$('pStab').value,similarity:+$('pSim').value,style:+$('pSty').value,speed:+$('pSpd').value};
  $('reS3').classList.remove('hide');$('reS3').scrollIntoView({behavior:'smooth'});
  try{await loadFonts();
    const parts=[['q',val('pVQ')],...(ans?[['a',val('pVA')]]:[]),['o',val('pVO')]];const clips={},paths={};
    for(const [k,t] of parts){$('reStat').textContent=`ElevenLabs: озвучка (${Object.keys(clips).length+1}/${parts.length})…`;const r=await tts(t,vid,vname,set);clips[k]=await decode(r.url);paths[k]=r.job&&r.job.path}
    const tl=timeline(D,clips);D.tl=tl;
    const {data:row}=await sb.from('reels').insert({lang:S.lang,format:S.format,question:{...S.q,q_screen:D.q,answer:D.a,why:D.why,trap:D.trap},script:{hook:D.hook,vq:val('pVQ'),va:val('pVA'),vo:val('pVO'),ot:D.ot,os:D.os,ob:D.ob},voice:{id:vid,name:vname,settings:set},audio_paths:paths,status:'audio'}).select().single();S.reelId=row&&row.id;
    $('reStat').textContent='Собираем аудиодорожку…';const audio=mixAudio(tl,clips);
    drawFrame($('reCv').getContext('2d'),D,1.5);
    $('reStat').innerHTML='Записываем видео — не закрывайте страницу и не переключайте вкладку (≈'+Math.ceil(tl.dur)+' сек)…';
    const blob=await record(D,audio,tl.dur);
    const ext=blob.type.includes('mp4')?'mp4':'webm',url=URL.createObjectURL(blob),fn=`iqly_reels_${S.reelId||Date.now()}.${ext}`;
    $('reOut').innerHTML=`<video src="${url}" controls playsinline style="width:270px;border-radius:14px;display:block;margin-bottom:8px"></video><a class="btn" href="${url}" download="${fn}" style="display:inline-block;text-decoration:none">⬇ Скачать видео (${ext.toUpperCase()})</a> <button class="btn sec" id="reNew">＋ Новый Reels</button>${ext==='webm'?'<p class="muted" style="font-size:12px">Этот браузер не записывает MP4 — для Instagram используйте свежий Chrome или Safari.</p>':''}`;
    $('reNew').onclick=()=>{S.q=null;S.plan=null;$('reS2').classList.add('hide');$('reS3').classList.add('hide');drawQs();window.scrollTo({top:0,behavior:'smooth'})};
    $('reStat').textContent='Готово ✓ Сохраняем…';
    if(S.reelId){const path=`${new Date().toISOString().slice(0,10)}/${S.reelId}.${ext}`;const up=await sb.storage.from('reels').upload(path,blob,{contentType:blob.type.split(';')[0]});
      if(!up.error)await sb.from('reels').update({video_path:path,status:'done'}).eq('id',S.reelId)}
    $('reStat').textContent='Готово ✓';loadHist()}
  catch(e){$('reGoErr').textContent=e.message;$('reStat').textContent='Ошибка: '+e.message}
  busy($('reGo'),false,'✅ Согласен — создать озвучку и видео')}

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
// MessageChannel yield is not throttled like setTimeout in background tabs
const yieldMC=()=>new Promise(r=>{const c=new MessageChannel();c.port1.onmessage=()=>r();c.port2.postMessage(0)});
// Frame-by-frame offline encoding (WebCodecs + mp4-muxer): no dropped frames even on a slow computer or a background tab → smooth 30 fps.
async function wcCodecs(){if(!window.VideoEncoder||!window.AudioEncoder||!window.Mp4Muxer||!window.VideoFrame||!window.AudioData)return null;
  let vc=null;for(const c of ['avc1.640028','avc1.4d0028','avc1.42e028']){try{const r=await VideoEncoder.isConfigSupported({codec:c,width:W,height:H,bitrate:8e6,framerate:FPS});if(r.supported){vc=c;break}}catch(e){}}
  let ac=null;for(const a of [['mp4a.40.2','aac'],['opus','opus']]){try{const r=await AudioEncoder.isConfigSupported({codec:a[0],sampleRate:SR,numberOfChannels:1,bitrate:192000});if(r.supported){ac=a;break}}catch(e){}}
  return vc&&ac?{vc,ac}:null}
async function recordWC(D,samples,dur,cc){const cv=$('reCv'),ctx=cv.getContext('2d');const {Muxer,ArrayBufferTarget}=window.Mp4Muxer;
  const target=new ArrayBufferTarget();const muxer=new Muxer({target,fastStart:'in-memory',firstTimestampBehavior:'offset',video:{codec:'avc',width:W,height:H,frameRate:FPS},audio:{codec:cc.ac[1],numberOfChannels:1,sampleRate:SR}});
  let err=null;const ve=new VideoEncoder({output:(c,m)=>muxer.addVideoChunk(c,m),error:e=>err=e});ve.configure({codec:cc.vc,width:W,height:H,bitrate:8e6,framerate:FPS,latencyMode:'quality',avc:{format:'avc'}});
  let nA=0;const ae=new AudioEncoder({output:(c,m)=>{nA++;muxer.addAudioChunk(c,m)},error:e=>err=e});ae.configure({codec:cc.ac[0],sampleRate:SR,numberOfChannels:1,bitrate:192000});
  const N=Math.ceil(dur*FPS),step=8192;for(let i=0;i<samples.length;i+=step){const part=samples.slice(i,Math.min(samples.length,i+step));
    const ad=new AudioData({format:'f32-planar',sampleRate:SR,numberOfFrames:part.length,numberOfChannels:1,timestamp:Math.round(i/SR*1e6),data:part});ae.encode(ad);ad.close()}
  for(let i=0;i<N;i++){if(err)throw err;const t=i/FPS;(D.draw||drawFrame)(ctx,D,t);const vf=new VideoFrame(cv,{timestamp:Math.round(t*1e6),duration:Math.round(1e6/FPS)});ve.encode(vf,{keyFrame:i%(FPS*2)===0});vf.close();
    if(ve.encodeQueueSize>6)while(ve.encodeQueueSize>2)await yieldMC();
    if(i%6===0){$('reProg').style.width=(cl(i/N)*100)+'%';if(D.onProg)D.onProg(i/N);await yieldMC()}}
  await ve.flush();await ae.flush();if(err)throw err;if(!nA)throw new Error('audio encoder produced no data');ve.close();ae.close();muxer.finalize();$('reProg').style.width='100%';
  return new Blob([target.buffer],{type:'video/mp4'})}
async function record(D,samples,dur){
  try{const cc=await wcCodecs();if(cc){const b=await recordWC(D,samples,dur,cc);S.recMode='кадр-за-кадром ('+cc.ac[1]+')';return b}S.recMode='realtime: браузер не поддерживает WebCodecs'}catch(e){console.warn('WebCodecs failed, using realtime recorder',e);S.recMode='realtime: '+String(e&&e.message||e).slice(0,80)}
  return recordRT(D,samples,dur)}
// iOS/Safari: an AudioContext only plays if it was created/resumed inside a tap → we create it in the button handler
let UAC=null;function unlockAudio(){try{if(!UAC||UAC.state==='closed')UAC=new (window.AudioContext||window.webkitAudioContext)({sampleRate:SR});UAC.resume();
  const b=UAC.createBuffer(1,1,SR),s=UAC.createBufferSource();s.buffer=b;s.connect(UAC.destination);s.start(0)}catch(e){}}
async function recordRT(D,samples,dur){const cv=$('reCv'),ctx=cv.getContext('2d');const own=!UAC||UAC.state==='closed';const ac=own?new AudioContext({sampleRate:SR}):UAC;
  await Promise.race([ac.resume(),new Promise(r=>setTimeout(r,1500))]);if(ac.state!=='running')throw new Error('Звук заблокирован браузером. Нажмите кнопку ещё раз (лучше создавать видео на компьютере в Chrome).');
  const buf=ac.createBuffer(1,samples.length,SR);buf.copyToChannel(samples,0);const src=ac.createBufferSource();src.buffer=buf;const dest=ac.createMediaStreamDestination();src.connect(dest);
  (D.draw||drawFrame)(ctx,D,0);const vs=cv.captureStream(FPS);const stream=new MediaStream([...vs.getVideoTracks(),...dest.stream.getAudioTracks()]);
  const mime=pickMime();const rec=new MediaRecorder(stream,{mimeType:mime||undefined,videoBitsPerSecond:8e6,audioBitsPerSecond:192e3});const chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  const done=new Promise(r=>rec.onstop=r);rec.start(250);const t0=ac.currentTime+.1;src.start(t0);
  await new Promise(res=>{const loop=()=>{const t=ac.currentTime-t0;(D.draw||drawFrame)(ctx,D,Math.max(0,t));$('reProg').style.width=(cl(t/dur)*100)+'%';if(t>=dur){res();return}requestAnimationFrame(loop)};requestAnimationFrame(loop)});
  rec.stop();await done;src.stop();if(own)ac.close();return new Blob(chunks,{type:rec.mimeType||mime||'video/webm'})}

// ---------- history (video gallery, same size cards) ----------
let HOFF=0,HCOUNT=0;const HPAGE=24,HSEEN=new Map();
// Gallery is never cleared: new reels are added on top, changed ones are updated in place, old ones stay visible.
async function loadHist(more){const box=$('reHist');if(!HSEEN.size&&!more)box.innerHTML='<div class="muted">Загрузка…</div>';
  const from=more?HOFF:0;const {data,error,count}=await sb.from('reels').select('id,created_at,lang,format,status,video_path,question',{count:'exact'}).order('created_at',{ascending:false}).range(from,from+HPAGE-1);
  if(error){if(!HSEEN.size)box.textContent=error.message;return}
  const todo=data.filter(r=>{const h=HSEEN.get(r.id);return !h||h!==(r.status+'|'+(r.video_path||''))});
  const paths=todo.filter(r=>r.video_path).map(r=>r.video_path);let urls={};
  if(paths.length){const {data:su}=await sb.storage.from('reels').createSignedUrls(paths,3600*12);(su||[]).forEach(x=>{if(x.signedUrl)urls[x.path]=x.signedUrl})}
  const card=r=>{const u=r.video_path&&urls[r.video_path],q=(r.question&&r.question.q_screen||'').replace(/\n/g,' ');
    return `<div class="rv" data-id="${r.id}"><div class="rvv">${u?`<video data-src="${esc(u)}#t=1" preload="none" controls playsinline></video>`:`<div class="rvn">${r.status==='done'?'Видео нет':r.status==='upload_failed'?'⚠️ Видео не загрузилось в облако':'⏳ '+esc(r.status||'')}</div>`}</div>
      <div class="rvm"><span>#${r.id}</span><span>${fmtT(r.created_at)}</span><span class="pill">${esc((r.lang||'').toUpperCase())}</span></div>
      <div class="rvq" title="${esc(q)}">${esc(q)}</div>
      ${u?`<button class="btn sec sm" data-p="${esc(r.video_path)}">⬇ Скачать</button>`:''}</div>`};
  if(!HSEEN.size)box.innerHTML='';
  const tmp=document.createElement('div');
  data.forEach(r=>{if(!todo.includes(r))return;tmp.innerHTML=card(r);const el=tmp.firstElementChild;const old=box.querySelector(`.rv[data-id="${r.id}"]`);
    if(old)old.replaceWith(el);else if(more)box.appendChild(el);else{const after=[...box.children].find(c=>+c.dataset.id<r.id);box.insertBefore(el,after||null)}
    HSEEN.set(r.id,r.status+'|'+(r.video_path||''))});
  if(more)HOFF+=data.length;else HOFF=Math.max(HOFF,data.length);HCOUNT=count||HCOUNT;
  if(!box.children.length)box.innerHTML='<div class="empty">Пока пусто</div>';
  $('reHistN').textContent=HCOUNT?`· ${HCOUNT}`:'';$('reMore').classList.toggle('hide',!(HCOUNT>box.querySelectorAll('.rv').length));
  lazyVids();
  box.querySelectorAll('button[data-p]:not([data-b])').forEach(b=>{b.dataset.b=1;b.onclick=async()=>{const {data:s}=await sb.storage.from('reels').createSignedUrl(b.dataset.p,3600,{download:b.dataset.p.split('/').pop()});if(s)location.href=s.signedUrl}})}
let IO=null;function lazyVids(){const vs=$('reHist').querySelectorAll('video[data-src]');if(!('IntersectionObserver' in window)){vs.forEach(v=>{v.src=v.dataset.src;v.preload='metadata';v.removeAttribute('data-src')});return}
  IO=IO||new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const v=e.target;v.preload='metadata';v.src=v.dataset.src;v.removeAttribute('data-src');IO.unobserve(v)}}),{rootMargin:'300px'});vs.forEach(v=>IO.observe(v))}
$('reMore').onclick=()=>{HOFF=$('reHist').querySelectorAll('.rv').length;loadHist(true)};
// auto-refresh while the Reels tab is open (no button needed)
setInterval(()=>{if(!$('t-re').classList.contains('hide')&&!document.hidden)loadHist().catch(()=>{})},20000);
// only one video plays at a time
document.addEventListener('play',e=>{if(e.target.closest&&e.target.closest('.rgal'))document.querySelectorAll('.rgal video').forEach(v=>{if(v!==e.target)v.pause()})},true);

// ---------- ⚡ quick launch / batch ----------
const DEF_SET={stability:.45,similarity:.8,style:.25,speed:1.05};
function kzText(t){return String(t).replace(/(^|[\s«(])қайсы\?/g,'$1қандай?').replace(/(^|[\s«(])Қайсы\?/g,'$1Қандай?').replace(/(жылы|қашан|қай жерде|қай қалада|қай елде)(\s+)туған(\b|\?|\s|$)/g,'$1$2туылған$3')}
let QKV=null;
function qkVoices(force){if(QKV&&!force)return QKV;$('qkVoice').innerHTML='<option value="">Загрузка голосов…</option>';$('qkVErr')&&$('qkVErr').remove();
  const to=new Promise((_,rej)=>setTimeout(()=>rej(new Error('ElevenLabs долго не отвечает')),25000));
  QKV=Promise.race([qkVoicesLoad(),to]).catch(e=>{QKV=null;$('qkVoice').innerHTML='<option value="">Голоса не загрузились</option>';
    $('qkVoice').insertAdjacentHTML('afterend',`<div id="qkVErr" style="font-size:12px;color:#b91c1c;margin-top:4px">${esc(e.message)} · <a href="#" id="qkVRe">Повторить</a></div>`);$('qkVRe').onclick=ev=>{ev.preventDefault();S.voices=[];qkVoices(true)}});return QKV}
async function qkVoicesLoad(){{const vs=await voices();if(!vs||!vs.length)throw new Error('В ElevenLabs нет голосов');const pv=localStorage.getItem('el_voice');const h=vs.find(v=>/^\s*Hale\b/i.test(v.name));const def=(vs.find(v=>v.id===pv)||h||vs[0]||{}).id;
  $('qkVoice').innerHTML=vs.map(v=>`<option value="${esc(v.id)}" ${v.id===def?'selected':''}>${esc(v.name)}</option>`).join('')}}
$('qkVoice').onchange=()=>{if($('qkVoice').value)localStorage.setItem('el_voice',$('qkVoice').value)};
async function illFor(q){try{const r=await fetch('/api/reels/illus',{method:'POST',headers:{Authorization:'Bearer '+await tok(),'Content-Type':'application/json'},body:JSON.stringify({q:q.q,o:q.o,a:q.a})});
  const j=await r.json().catch(()=>({}));if(!j.ok)return null;return await illBitmap(j.src||svgUrl(j.svg))}catch(e){return null}}
async function autoReel(lang,vid,vname,extraAvoid,st,src){
  st(src==='bank'?'📚 Берём вопросы из базы…':'🤖 ИИ пишет вопросы…');const set=src==='bank'?await bankQuiz(lang):await aiQuiz(4,extraAvoid,lang);
  st('🎨 Картинки + 🎙 озвучка…');const imgsP=Promise.all(set.map(illFor));
  const vo=QUIZ.voices(set,lang);const parts=[];set.forEach((q,i)=>{parts.push(['q'+i,lang==='kz'?kzText(vo[i].q):vo[i].q]);parts.push(['a'+i,lang==='kz'?kzText(vo[i].a):vo[i].a])});
  if(lang==='kz')set.forEach(q=>q.q=kzText(q.q));
  const clips={},paths={};let n=0;
  for(const [k,t] of parts){if(!t)continue;st(`🎙 Озвучка ${++n}/${parts.length}…`);const r=await tts(t,vid,vname,DEF_SET);clips[k]=await decode(r.url);paths[k]=r.job&&r.job.path}
  const imgs=await imgsP;imgs.forEach((b,i)=>{if(b)set[i].img=b});
  const D={set,draw:QUIZ.draw,mascot:await mascotImg(),lang:typeof lang!=='undefined'?lang:S.lang};D.tl=QUIZ.timeline(D,clips);
  const clean=set.map(({img,...q})=>q);
  const {data:row,error}=await sb.from('reels').insert({lang,format:'quiz',question:{quiz:set.map(q=>q.q),set:clean,bank:set.map(q=>q.bid).filter(Boolean),q_screen:set.map(q=>q.q.replace(/\n/g,' ')).join(' | ')},script:{voices:parts,auto:true},voice:{id:vid,name:vname,settings:DEF_SET},audio_paths:paths,status:'audio'}).select().single();
  if(error)throw new Error(error.message);
  const audio=QUIZ.mix(D.tl,clips,await bgm());D.onProg=p=>st(`🎬 Видео ${Math.round(p*100)}%`);
  const blob=await record(D,audio,D.tl.dur);
  st('☁️ Сохраняем…');const ext=blob.type.includes('mp4')?'mp4':'webm',path=`${new Date().toISOString().slice(0,10)}/${row.id}.${ext}`;
  const meta={voices:parts,auto:true,rec:S.recMode||'',ua:navigator.userAgent.slice(0,140)};
  const res={id:row.id,qs:set.map(q=>q.q.replace(/\n/g,' ')),url:URL.createObjectURL(blob),ext,imgs:imgs.filter(Boolean).length,blob,path,meta};
  const err=await uploadReel(res,st);if(err)res.uploadErr=err;return res}
// upload with retries (mobile networks drop big uploads: "Load failed"); the finished video is never lost — it stays downloadable
async function uploadReel(r,st){let last='';
  for(let k=0;k<4;k++){if(k)st&&st(`☁️ Повтор загрузки ${k+1}/4…`);
    try{const up=await sb.storage.from('reels').upload(r.path,r.blob,{contentType:r.blob.type.split(';')[0],upsert:true});
      if(!up.error){await sb.from('reels').update({video_path:r.path,status:'done',script:r.meta}).eq('id',r.id);return ''}last=up.error.message}
    catch(e){last=String(e&&e.message||e)}
    await new Promise(z=>setTimeout(z,2000*(k+1)))}
  try{await sb.from('reels').update({status:'upload_failed',script:{...r.meta,upload_error:last.slice(0,120)}}).eq('id',r.id)}catch(e){}
  return last||'network'}
let QK_STOP=false,QK_RUN=false;
$('qkStop').onclick=()=>{QK_STOP=true;$('qkStop').textContent='Остановится после текущего…';$('qkStop').disabled=true};
$('qkGo').onclick=()=>qkRun('ai');$('qkGoDb').onclick=()=>qkRun('bank');
async function qkRun(src){if(QK_RUN)return;unlockAudio();const goBtn=src==='bank'?$('qkGoDb'):$('qkGo'),goTxt=goBtn.innerHTML;const vid=$('qkVoice').value,vname=$('qkVoice').selectedOptions[0]?.textContent;
  if(!vid){alert('Выберите голос (ElevenLabs должен быть подключён)');return}
  const N=Math.max(1,Math.min(30,+$('qkN').value||1)),mode=$('qkLang').value;QK_RUN=true;QK_STOP=false;
  busy(goBtn,true,`⏳ Создаём 0/${N}…`);$('qkGo').disabled=$('qkGoDb').disabled=true;$('qkStop').classList.toggle('hide',N<2);$('qkStop').disabled=false;$('qkStop').textContent='⏹ Остановить после текущего';
  await loadFonts();const made=[];let ok=0,fail=0;
  $('qkQ').innerHTML=Array.from({length:N},(_,i)=>`<div id="qkr${i}" style="display:flex;gap:8px;align-items:center;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#fff;font-size:13px"><b style="width:28px">${i+1}</b><span class="pill" id="qkl${i}">${mode==='mix'?(i%2?'RU':'KZ'):mode.toUpperCase()}</span><span id="qks${i}" class="muted" style="flex:1">В очереди</span></div>`).join('');
  for(let i=0;i<N;i++){if(QK_STOP){for(let k=i;k<N;k++)$('qks'+k).textContent='Отменено';break}
    const lang=mode==='mix'?(i%2?'ru':'kz'):mode;const stt=$('qks'+i);stt.classList.remove('muted');$('qkr'+i).style.borderColor='#a78bfa';
    try{const r=await autoReel(src==='bank'?'kz':lang,vid,vname,made,t=>{stt.textContent=t},src);made.push(...r.qs);
      if(r.uploadErr){fail++;$('qkr'+i).style.borderColor='#fcd34d';stt.innerHTML=`⚠️ #${r.id} видео готово, но не загрузилось в облако (${esc(r.uploadErr)}). Скачайте или повторите:`;
        const bt=document.createElement('button');bt.className='btn sec sm';bt.textContent='☁️ Загрузить снова';bt.onclick=async()=>{bt.disabled=true;const e=await uploadReel(r,t=>bt.textContent=t);if(e){bt.disabled=false;bt.textContent='☁️ Загрузить снова'}else{bt.remove();stt.innerHTML=`✅ #${r.id} загружено`;loadHist()}};
        $('qkr'+i).insertAdjacentHTML('beforeend',`<a class="btn sec sm" href="${r.url}" download="iqtest_reels_${r.id}.${r.ext}" style="text-decoration:none">⬇</a>`);$('qkr'+i).appendChild(bt)}
      else{ok++;
      $('qkr'+i).style.borderColor='#86efac';stt.innerHTML=`✅ #${r.id} · ${esc(r.qs[0])}… <span class="muted" style="font-size:11px">[${esc(S.recMode||'')}]</span> ${r.imgs<4?`<span class="muted">(картинок ${r.imgs}/4, остальные — эмодзи)</span>`:''}`;
      $('qkr'+i).insertAdjacentHTML('beforeend',`<a class="btn sec sm" href="${r.url}" download="iqtest_reels_${r.id}.${r.ext}" style="text-decoration:none">⬇</a>`)}}
    catch(e){fail++;$('qkr'+i).style.borderColor='#fca5a5';stt.innerHTML=`<span style="color:#b91c1c">❌ ${esc(e.message)}</span>`;
      if(/ElevenLabs|quota|credits|ANTHROPIC_API_KEY|базе|базы|Анthropic|Anthropic|ИИ не смог/i.test(e.message)){for(let k=i+1;k<N;k++)$('qks'+k).textContent='Пропущено (см. ошибку выше)';break}}
    busy(goBtn,true,`⏳ Создаём ${Math.min(i+2,N)}/${N}…`);loadHist()}
  goBtn.innerHTML=goTxt;$('qkGo').disabled=$('qkGoDb').disabled=false;$('qkStop').classList.add('hide');QK_RUN=false;if(src==='bank')bankInfo();
  $('qkNote').innerHTML=`Готово: <b>${ok}</b> видео${fail?`, ошибок: <b style="color:#b91c1c">${fail}</b>`:''}. Все видео ниже в «Созданные Reels».`}
window.addEventListener('beforeunload',e=>{if(QK_RUN){e.preventDefault();e.returnValue=''}});

window.loadRe=async()=>{elStatus();status();loadHist();loadFonts();qkVoices();bankInfo()};
window.__reelsTest={drawFrame,timeline,mixAudio,S,loadFonts};
})();
