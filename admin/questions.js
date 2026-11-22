// ===== Admin · all test questions with correct answers and explanations (read from the live test page) =====
(function(){
const box=$('t-qs');let LNG='kz';
box.innerHTML=`<div class="bar"><div class="seg" id="qsLang"><button data-l="kz" class="on">Казахский</button><button data-l="ru">Русский</button></div>
 <input id="qsFind" placeholder="Поиск: вопрос, тип, код…" style="max-width:260px"><span class="muted" id="qsN"></span></div>
 <div class="note" style="background:#f5f3ff;border-color:#ddd6fe;color:#3b0764">Все вопросы в порядке теста. <b>Зелёным</b> — правильный ответ. Чтобы заменить вопрос, назовите его номер и код (например: «12 · V3»).</div>
 <div id="qsList" class="muted">Загрузка…</div><iframe id="qsFrame" style="position:absolute;width:430px;height:900px;left:-9999px;top:0;border:0" aria-hidden="true"></iframe>`;
const CAT={attn:'Внимание',num:'Числа',logic:'Логика',verb:'Слова',mem:'Память',spat:'Пространство'};
const L='АБВГДЕ';
function load(){$('qsList').textContent='Загрузка…';const f=$('qsFrame');f.onload=()=>{setTimeout(()=>{try{draw(f.contentWindow)}catch(e){$('qsList').textContent='Ошибка: '+e.message}},300)};f.src=`/${LNG}/?notrack=1&adm=${Date.now()}`}
function draw(w){const Q=w.eval('Q'),SEQ=w.eval('SEQ'),T=w.eval('T'),optView=w.eval('optView'),vis=q=>q.img!==undefined?(q.img?w.eval('uniq')(q.img):''):q.vq?w.eval('uniq')(q.main()):q.nmx?w.eval('nmMain')(q):q.ana?w.eval('anaMain')(q):q.pat?w.eval('patMain')(q):q.text?'':w.eval('matrixSVG')(q);
  const prompt=q=>T(q.v2||q.vq?q.q:q.nmx?'Какое число должно стоять на месте «?»':q.ana?'Первая пара фигур связана по правилу. Какая фигура продолжает вторую пару?':q.pat?'Какой фрагмент дополняет узор?':q.text?q.q:'Какая фигура должна стоять на месте «?»');
  const TY={text:'Текст',matrix:'Матрица',visual:'Визуальный',analogy:'Аналогия',number_matrix:'Числовая матрица',memory_digits:'Память (цифры)'};
  const ty=q=>q.v2?(q.mem?'Память (цифры)':q.img!==undefined?(q.osvg.some(Boolean)?'Визуальный':'Числовая матрица'):'Текст'):q.demo?'Демография':q.likert?'Анкета':q.vq?'Визуальный':q.nmx?'Числовая матрица':q.ana?'Аналогия':q.pat?'Узор':q.mem?'Память (цифры)':q.text?'Текст':'Матрица';
  const items=Q.map((q,i)=>{const code=q.code||SEQ[i]||'',n=q.osvg?q.osvg.length:q.text&&!q.vq?q.o.length:q.opts?q.opts.length:0;let opts='';
    for(let k=0;k<n;k++){const ok=!q.likert&&k===q.a;opts+=`<div class="qo${ok?' ok':''}"><span>${L[k]}</span>${q.text&&!q.vq&&!q.osvg?`<b>${esc(T(q.o[k]))}</b>`:optView(q,k,56)}</div>`}
    const mem=q.mem?`<div class="muted" style="margin:6px 0">Сначала показывается: <b style="font-size:18px;letter-spacing:4px;color:var(--ink)">${q.mem.join(' ')}</b> (${q.show} сек)</div>`:'';
    const html=`<div class="card qc" data-s="${esc((i+1)+' '+code+' '+prompt(q)+' '+ty(q)).toLowerCase()}">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="pill p">№${i+1}</span><span class="pill">${code}</span>${q.w?`<span class="pill">вес ${q.w}</span>`:''}<span class="pill">${ty(q)}</span>${q.cat?`<span class="pill">${CAT[q.cat]||q.cat}</span>`:''}${q.likert?'<span class="pill w">не влияет на балл</span>':''}</div>
      <div style="font-weight:800;font-size:16px;margin:10px 0;white-space:pre-line">${esc(prompt(q))}</div>${mem}
      <div class="qv">${vis(q)}</div><div class="qos">${opts}</div>
      ${q.ex?`<div class="qx">✅ <b>Правильный ответ: ${L[q.a]}</b><br>${esc(T(q.ex))}</div>`:''}</div>`;return html});
  $('qsList').innerHTML=items.join('');$('qsN').textContent=Q.length+' вопросов';filt()}
function filt(){const v=$('qsFind').value.toLowerCase().trim();document.querySelectorAll('#qsList .qc').forEach(c=>c.style.display=!v||c.dataset.s.includes(v)?'':'none')}
$('qsFind').oninput=filt;
document.querySelectorAll('#qsLang button').forEach(b=>b.onclick=()=>{LNG=b.dataset.l;document.querySelectorAll('#qsLang button').forEach(x=>x.classList.toggle('on',x===b));load()});
let loaded=false;window.loadQs=()=>{if(!loaded){loaded=true;load()}};
})();
