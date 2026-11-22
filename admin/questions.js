// ===== Admin · all test questions with correct answers and explanations (read from the live test page) =====
(function(){
const box=$('t-qs');let LNG='kz';
box.innerHTML=`<div class="bar"><div class="seg" id="qsLang"><button data-l="kz" class="on">Қазақша</button><button data-l="ru">Орысша</button></div>
 <input id="qsFind" placeholder="Іздеу: сұрақ, түрі, код…" style="max-width:260px"><span class="muted" id="qsN"></span></div>
 <div class="note" style="background:#f5f3ff;border-color:#ddd6fe;color:#3b0764">Тесттегі ретімен барлық сұрақтар. <b>Жасыл</b> — дұрыс жауап. Ауыстыру керек болса, сұрақтың нөмірі мен кодын айтыңыз (мысалы: «12 · V3»).</div>
 <div id="qsList" class="muted">Жүктелуде…</div><iframe id="qsFrame" style="position:absolute;width:430px;height:900px;left:-9999px;top:0;border:0" aria-hidden="true"></iframe>`;
const CAT={attn:'Зейін',num:'Сан',logic:'Логика',verb:'Сөз',mem:'Жады',spat:'Кеңістік'};
const L='АБВГДЕ';
function load(){$('qsList').textContent='Жүктелуде…';const f=$('qsFrame');f.onload=()=>{setTimeout(()=>{try{draw(f.contentWindow)}catch(e){$('qsList').textContent='Қате: '+e.message}},300)};f.src=`/${LNG}/?notrack=1&adm=${Date.now()}`}
function draw(w){const Q=w.eval('Q'),SEQ=w.eval('SEQ'),T=w.eval('T'),optView=w.eval('optView'),vis=q=>q.vq?w.eval('uniq')(q.main()):q.nmx?w.eval('nmMain')(q):q.ana?w.eval('anaMain')(q):q.pat?w.eval('patMain')(q):q.text?'':w.eval('matrixSVG')(q);
  const prompt=q=>T(q.vq?q.q:q.nmx?'Какое число должно стоять на месте «?»':q.ana?'Первая пара фигур связана по правилу. Какая фигура продолжает вторую пару?':q.pat?'Какой фрагмент дополняет узор?':q.text?q.q:'Какая фигура должна стоять на месте «?»');
  const ty=q=>q.demo?'Демография':q.likert?'Сауалнама':q.vq?'Визуалды':q.nmx?'Сан матрицасы':q.ana?'Аналогия':q.pat?'Өрнек':q.mem?'Жады (цифрлар)':q.text?'Мәтін':'Матрица';
  const items=Q.map((q,i)=>{const n=q.text&&!q.vq?q.o.length:q.opts?q.opts.length:0;let opts='';
    for(let k=0;k<n;k++){const ok=!q.likert&&k===q.a;opts+=`<div class="qo${ok?' ok':''}"><span>${L[k]}</span>${q.text&&!q.vq?`<b>${esc(T(q.o[k]))}</b>`:optView(q,k,56)}</div>`}
    const mem=q.mem?`<div class="muted" style="margin:6px 0">Алдымен көрсетіледі: <b style="font-size:18px;letter-spacing:4px;color:var(--ink)">${q.mem.join(' ')}</b> (${q.show} сек)</div>`:'';
    const html=`<div class="card qc" data-s="${esc((i+1)+' '+SEQ[i]+' '+prompt(q)+' '+ty(q)).toLowerCase()}">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="pill p">№${i+1}</span><span class="pill">${SEQ[i]}</span><span class="pill">${ty(q)}</span>${q.cat?`<span class="pill">${CAT[q.cat]||q.cat}</span>`:''}${q.likert?'<span class="pill w">ұпайға кірмейді</span>':''}</div>
      <div style="font-weight:800;font-size:16px;margin:10px 0;white-space:pre-line">${esc(prompt(q))}</div>${mem}
      <div class="qv">${vis(q)}</div><div class="qos">${opts}</div>
      ${q.ex?`<div class="qx">✅ <b>Дұрыс жауап: ${L[q.a]}</b><br>${esc(T(q.ex))}</div>`:''}</div>`;return html});
  $('qsList').innerHTML=items.join('');$('qsN').textContent=Q.length+' сұрақ';filt()}
function filt(){const v=$('qsFind').value.toLowerCase().trim();document.querySelectorAll('#qsList .qc').forEach(c=>c.style.display=!v||c.dataset.s.includes(v)?'':'none')}
$('qsFind').oninput=filt;
document.querySelectorAll('#qsLang button').forEach(b=>b.onclick=()=>{LNG=b.dataset.l;document.querySelectorAll('#qsLang button').forEach(x=>x.classList.toggle('on',x===b));load()});
let loaded=false;window.loadQs=()=>{if(!loaded){loaded=true;load()}};
})();
