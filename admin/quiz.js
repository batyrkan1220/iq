// ===== iqtest.live · "Викторина" Reels format: 4 questions × 3 options, timer bar, reveal, last one → comments =====
window.QUIZ=(function(){
const W=1080,H=1920,SR=44100;
// [emoji, tileColor, kz{q,v?,o,a,av}, ru{q,v?,o,a,av}]
// ЕРЕЖЕ: эмодзи сұрақтың тақырыбын ғана көрсетеді, ЕШҚАШАН жауапты (дұрыс нұсқаны) көрсетпейді.
const QB=[
['🧊','#bfe3ff',{q:'Су неше градуста\nқата бастайды?',o:['0°C','-1°C','-5°C'],a:0,av:'нөл градус'},{q:'При какой температуре\nначинает замерзать вода?',o:['0°C','-1°C','-5°C'],a:0,av:'ноль градусов'}],
['🪖','#e7dcc8',{q:'Бірінші дүниежүзілік соғыс\nқай жылы басталды?',v:'Бірінші дүниежүзілік соғыс қай жылы басталды?',o:['1913','1905','1914'],a:2,av:'мың тоғыз жүз он төртінші жыл'},{q:'В каком году началась\nПервая мировая война?',o:['1913','1905','1914'],a:2,av:'тысяча девятьсот четырнадцатый год'}],
['🍕','#ffe1c2',{q:'Пиццаның отаны\nқай ел?',o:['Греция','Италия','Франция'],a:1,av:'Италия'},{q:'Какая страна является\nродиной пиццы?',o:['Греция','Италия','Франция'],a:1,av:'Италия'}],
['🌊','#bfe8ff',{q:'Әлемдегі ең үлкен\nмұхит қандай?',o:['Атлант','Тынық','Үнді'],a:1,av:'Тынық мұхиты'},{q:'Какой океан\nсамый большой?',o:['Атлантический','Тихий','Индийский'],a:1,av:'Тихий океан'}],
['🏔️','#dbe7f5',{q:'Әлемдегі ең биік\nтау қандай?',o:['Эверест','Эльбрус','Хан Тәңірі'],a:0,av:'Эверест'},{q:'Какая гора самая\nвысокая в мире?',o:['Эверест','Эльбрус','Хан-Тенгри'],a:0,av:'Эверест'}],
['🔭','#e3dcff',{q:'Күн жүйесіндегі ең\nүлкен планета қандай?',o:['Сатурн','Юпитер','Нептун'],a:1,av:'Юпитер'},{q:'Какая планета самая\nбольшая в Солнечной системе?',o:['Сатурн','Юпитер','Нептун'],a:1,av:'Юпитер'}],
['🦷','#f3f3f3',{q:'Ересек адамның\nнеше тісі болады?',v:'Ересек адамның неше тісі болады?',o:['28','32','36'],a:1,av:'отыз екі'},{q:'Сколько зубов\nу взрослого человека?',o:['28','32','36'],a:1,av:'тридцать два'}],
['🕷️','#e5e5e5',{q:'Өрмекшінің неше\nаяғы бар?',o:['6','8','10'],a:1,av:'сегіз'},{q:'Сколько ног\nу паука?',o:['6','8','10'],a:1,av:'восемь'}],
['📅','#d9f2e4',{q:'Бір жылда неше\nапта бар?',o:['48','52','56'],a:1,av:'елу екі'},{q:'Сколько недель\nв году?',o:['48','52','56'],a:1,av:'пятьдесят две'}],
['📖','#f5e7c8',{q:'Абай Құнанбайұлы\nқай жылы туылған?',v:'Абай Құнанбайұлы қай жылы туылған?',o:['1845','1856','1835'],a:0,av:'мың сегіз жүз қырық бесінші жыл'},{q:'В каком году родился\nАбай Кунанбаев?',o:['1845','1856','1835'],a:0,av:'тысяча восемьсот сорок пятый год'}],
['🕊️','#cfe9ff',{q:'Қазақстан қай жылы\nтәуелсіздік алды?',o:['1990','1991','1993'],a:1,av:'мың тоғыз жүз тоқсан бірінші жыл'},{q:'В каком году Казахстан\nстал независимым?',o:['1990','1991','1993'],a:1,av:'тысяча девятьсот девяносто первый год'}],
['⚡','#fbe3b5',{q:'Құрлықтағы ең жылдам\nжануар қандай?',o:['Арыстан','Гепард','Бөкен'],a:1,av:'гепард'},{q:'Какое животное самое\nбыстрое на суше?',o:['Лев','Гепард','Сайгак'],a:1,av:'гепард'}],
['🦘','#f6dcc2',{q:'Кенгуру табиғатта\nқай жерде мекендейді?',o:['Африка','Австралия','Бразилия'],a:1,av:'Австралия'},{q:'Где в природе\nживут кенгуру?',o:['Африка','Австралия','Бразилия'],a:1,av:'Австралия'}],
['🔴','#ffd6d6',{q:'Қай планетаны «Қызыл\nпланета» деп атайды?',o:['Венера','Марс','Меркурий'],a:1,av:'Марс'},{q:'Какую планету называют\n«Красной планетой»?',o:['Венера','Марс','Меркурий'],a:1,av:'Марс'}],
['🐦','#d8f5e5',{q:'Әлемдегі ең кішкентай\nқұс қандай?',o:['Колибри','Торғай','Шымшық'],a:0,av:'колибри'},{q:'Какая птица самая\nмаленькая в мире?',o:['Колибри','Воробей','Синица'],a:0,av:'колибри'}],
['🏅','#fff1b8',{q:'Олимпиада туында неше\nсақина бейнеленген?',o:['4','5','6'],a:1,av:'бес'},{q:'Сколько колец\nна олимпийском флаге?',o:['4','5','6'],a:1,av:'пять'}],
['♟️','#ececec',{q:'Шахмат тақтасында\nнеше шаршы бар?',o:['36','64','81'],a:1,av:'алпыс төрт'},{q:'Сколько клеток\nна шахматной доске?',o:['36','64','81'],a:1,av:'шестьдесят четыре'}],
['🖼️','#f3e2c7',{q:'«Мона Лизаны»\nкім салған?',o:['Микеланджело','Леонардо да Винчи','Рафаэль'],a:1,av:'Леонардо да Винчи'},{q:'Кто написал\n«Мону Лизу»?',o:['Микеланджело','Леонардо да Винчи','Рафаэль'],a:1,av:'Леонардо да Винчи'}],
['🗼','#dfe7ff',{q:'Эйфель мұнарасы\nқай қалада?',o:['Рим','Париж','Лондон'],a:1,av:'Париж'},{q:'В каком городе\nЭйфелева башня?',o:['Рим','Париж','Лондон'],a:1,av:'Париж'}],
['💧','#cdeeff',{q:'Судың химиялық\nформуласы қандай?',o:['H₂O','CO₂','O₂'],a:0,av:'аш екі о'},{q:'Какая химическая\nформула воды?',o:['H₂O','CO₂','O₂'],a:0,av:'аш два о'}],
['⏰','#ffe8cc',{q:'Бір сағатта неше\nсекунд бар?',o:['360','3600','6000'],a:1,av:'үш мың алты жүз'},{q:'Сколько секунд\nв одном часе?',o:['360','3600','6000'],a:1,av:'три тысячи шестьсот'}],
['❄️','#e2f3ff',{q:'Ең суық материк\nқандай?',o:['Арктика','Антарктида','Гренландия'],a:1,av:'Антарктида'},{q:'Какой материк\nсамый холодный?',o:['Арктика','Антарктида','Гренландия'],a:1,av:'Антарктида'}],
['🧍','#ffe0d0',{q:'Адам денесіндегі ең\nүлкен мүше қандай?',o:['Бауыр','Тері','Өкпе'],a:1,av:'тері'},{q:'Какой орган у человека\nсамый большой?',o:['Печень','Кожа','Лёгкие'],a:1,av:'кожа'}],
['🚀','#dcd8ff',{q:'Байқоңыр ғарыш айлағы\nқай елде орналасқан?',o:['Ресей','Қазақстан','Өзбекстан'],a:1,av:'Қазақстан'},{q:'В какой стране находится\nкосмодром Байконур?',o:['Россия','Казахстан','Узбекистан'],a:1,av:'Казахстан'}],
['👨‍🚀','#d6e4ff',{q:'Ғарышқа ұшқан алғашқы\nадам кім?',o:['Юрий Гагарин','Нил Армстронг','Тоқтар Әубәкіров'],a:0,av:'Юрий Гагарин'},{q:'Кто первым полетел\nв космос?',o:['Юрий Гагарин','Нил Армстронг','Токтар Аубакиров'],a:0,av:'Юрий Гагарин'}],
['🛰️','#e0e8ff',{q:'Тұңғыш қазақ\nғарышкері кім?',o:['Тоқтар Әубәкіров','Талғат Мұсабаев','Айдын Айымбетов'],a:0,av:'Тоқтар Әубәкіров'},{q:'Кто первый\nказахский космонавт?',o:['Токтар Аубакиров','Талгат Мусабаев','Айдын Аимбетов'],a:0,av:'Токтар Аубакиров'}],
['🍓','#ffd9df',{q:'Құлпынайдың тұқымы\nқай жерінде орналасқан?',o:['Ішінде','Сыртында','Тұқымы жоқ'],a:1,av:'сыртында'},{q:'Где у клубники\nнаходятся семена?',o:['Внутри','Снаружи','Их нет'],a:1,av:'снаружи'}],
['🎨','#fff0d6',{q:'Кемпірқосақ неше\nтүстен тұрады?',o:['5','7','9'],a:1,av:'жеті'},{q:'Сколько цветов\nу радуги?',o:['5','7','9'],a:1,av:'семь'}],
['🐝','#fff3b0',{q:'Бал арасының неше\nқанаты бар?',o:['2','4','6'],a:1,av:'төрт'},{q:'Сколько крыльев\nу пчелы?',o:['2','4','6'],a:1,av:'четыре'}],
['⚽','#d9f5d9',{q:'Футболда бір команданың\nалаңда неше ойыншысы болады?',o:['9','11','12'],a:1,av:'он бір'},{q:'Сколько игроков одной\nкоманды на поле в футболе?',o:['9','11','12'],a:1,av:'одиннадцать'}],
['🌍','#d7f0e6',{q:'Аумағы бойынша ең\nүлкен мемлекет қандай?',o:['Қытай','Ресей','Канада'],a:1,av:'Ресей'},{q:'Какая страна самая\nбольшая по площади?',o:['Китай','Россия','Канада'],a:1,av:'Россия'}],
['🗺️','#e8f0d8',{q:'Қазақстан жер аумағы\nбойынша әлемде\nнешінші орында?',o:['7','9','12'],a:1,av:'тоғызыншы орын'},{q:'Какое место в мире\nзанимает Казахстан по площади?',o:['7','9','12'],a:1,av:'девятое место'}],
['🍵','#e3f2d4',{q:'Шайдың отаны\nқай ел?',o:['Үндістан','Қытай','Англия'],a:1,av:'Қытай'},{q:'Какая страна —\nродина чая?',o:['Индия','Китай','Англия'],a:1,av:'Китай'}],
['☕','#ead8c6',{q:'Кофенің отаны\nқай ел?',o:['Бразилия','Эфиопия','Колумбия'],a:1,av:'Эфиопия'},{q:'Какая страна —\nродина кофе?',o:['Бразилия','Эфиопия','Колумбия'],a:1,av:'Эфиопия'}],
['💰','#e6f5d0',{q:'Теңге қай жылы\nайналымға енгізілді?',o:['1991','1993','1995'],a:1,av:'мың тоғыз жүз тоқсан үшінші жыл'},{q:'В каком году появился\nказахстанский тенге?',o:['1991','1993','1995'],a:1,av:'тысяча девятьсот девяносто третий год'}],
['🥇','#fff0b3',{q:'Алтынның химиялық\nтаңбасы қандай?',o:['Ag','Au','Al'],a:1,av:'А У'},{q:'Какой химический\nсимвол у золота?',o:['Ag','Au','Al'],a:1,av:'А У'}],
['📐','#e4e8ff',{q:'Үшбұрыш бұрыштарының\nқосындысы қанша?',o:['90°','180°','360°'],a:1,av:'жүз сексен градус'},{q:'Чему равна сумма\nуглов треугольника?',o:['90°','180°','360°'],a:1,av:'сто восемьдесят градусов'}],
['⚖️','#cfe6ff',{q:'Жер бетіндегі ең\nірі жануар қандай?',o:['Піл','Көк кит','Ақ аю'],a:1,av:'көк кит'},{q:'Какое животное самое\nкрупное на Земле?',o:['Слон','Синий кит','Белый медведь'],a:1,av:'синий кит'}],
['📏','#fbe7bf',{q:'Ең биік жануар\nқандай?',o:['Піл','Жираф','Түйе'],a:1,av:'жираф'},{q:'Какое животное\nсамое высокое?',o:['Слон','Жираф','Верблюд'],a:1,av:'жираф'}],
['🐫','#f2e1c4',{q:'Түйенің өркешінде\nне сақталады?',o:['Су','Май','Ауа'],a:1,av:'май'},{q:'Что хранится\nв горбу верблюда?',o:['Вода','Жир','Воздух'],a:1,av:'жир'}],
['🏞️','#d3ecff',{q:'Жартысы тұщы, жартысы\nтұзды көл қандай?',o:['Балқаш','Алакөл','Зайсан'],a:0,av:'Балқаш'},{q:'Какое озеро наполовину\nпресное, наполовину солёное?',o:['Балхаш','Алаколь','Зайсан'],a:0,av:'Балхаш'}],
['🍎','#ffd7d2',{q:'Апорт алмасы қай\nқаланың символы?',o:['Шымкент','Алматы','Тараз'],a:1,av:'Алматы'},{q:'Яблоко апорт —\nсимвол какого города?',o:['Шымкент','Алматы','Тараз'],a:1,av:'Алматы'}],
['🦴','#f1f1f1',{q:'Ересек адамның\nнеше сүйегі бар?',o:['186','206','306'],a:1,av:'екі жүз алты'},{q:'Сколько костей\nу взрослого человека?',o:['186','206','306'],a:1,av:'двести шесть'}],
['❤️','#ffd6dc',{q:'Адам жүрегі неше\nкамерадан тұрады?',o:['2','3','4'],a:2,av:'төрт'},{q:'Сколько камер\nв сердце человека?',o:['2','3','4'],a:2,av:'четыре'}],
['🐬','#cdeefb',{q:'Дельфин қай топқа\nжатады?',o:['Балықтар','Сүтқоректілер','Қосмекенділер'],a:1,av:'сүтқоректілер'},{q:'Дельфин —\nэто кто?',o:['Рыба','Млекопитающее','Земноводное'],a:1,av:'млекопитающее'}],
['🎹','#ececec',{q:'Пианинода неше\nперне бар?',o:['66','88','100'],a:1,av:'сексен сегіз'},{q:'Сколько клавиш\nу пианино?',o:['66','88','100'],a:1,av:'восемьдесят восемь'}],
['🪕','#f3e0c6',{q:'Домбыраның неше\nішегі бар?',o:['2','3','4'],a:0,av:'екі'},{q:'Сколько струн\nу домбры?',o:['2','3','4'],a:0,av:'две'}],
['🎸','#f6dccb',{q:'Классикалық гитарада\nнеше ішек бар?',o:['4','6','8'],a:1,av:'алты'},{q:'Сколько струн у\nклассической гитары?',o:['4','6','8'],a:1,av:'шесть'}],
['🌊','#cfe4ff',{q:'Әлемдегі ең терең\nкөл қандай?',o:['Байкал','Балқаш','Виктория'],a:0,av:'Байкал'},{q:'Какое озеро самое\nглубокое в мире?',o:['Байкал','Балхаш','Виктория'],a:0,av:'Байкал'}],
['💡','#fff4c2',{q:'Жарық бір секундта шамамен\nқанша жол жүреді?',o:['3 000 км','30 000 км','300 000 км'],a:2,av:'үш жүз мың шақырым'},{q:'Сколько примерно проходит\nсвет за секунду?',o:['3 000 км','30 000 км','300 000 км'],a:2,av:'триста тысяч километров'}]
];
const CTA={kz:['','Жауабыңыз дұрыс болса, лайк басыңыз!','','Жауабыңызды комментарийге жазыңыз!'],
 ru:['','Если ваш ответ верный — ставьте лайк!','','Напишите свой ответ в комментариях!']};
const shuffle=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
let LASTPOS=-1;
function item(b,l){const o=b[l==='ru'?3:2];const right=o.o[o.a];
  // random order of options; avoid putting the correct answer in the same place twice in a row
  let ord,pos;do{ord=shuffle(o.o.slice());pos=ord.indexOf(right)}while(pos===LASTPOS&&Math.random()<.85);LASTPOS=pos;
  return{emo:b[0],col:b[1],q:o.q,v:o.v||o.q.replace(/\n/g,' '),o:ord,a:pos,av:o.av}}
function pick4(l,used){const u=new Set(used||[]);let pool=QB.filter(b=>!u.has(b[l==='ru'?3:2].q));if(pool.length<4)pool=QB.slice();return shuffle(pool).slice(0,4).map(b=>item(b,l))}
function swap(l,set,i){const have=new Set(set.map(x=>x.q));const pool=shuffle(QB.filter(b=>!have.has(b[l==='ru'?3:2].q)));set[i]=item(pool[0],l);return set}
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
return{pick4,swap,voices,timeline,mix,draw,size:QB.length,CTA};
})();
