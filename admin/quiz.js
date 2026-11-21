// ===== IQly · "Викторина" Reels format: 4 questions × 3 options, timer bar, reveal + stickers, last one → comments =====
window.QUIZ=(function(){
const W=1080,H=1920,SR=44100;
// [emoji, tileColor, kz{q,v?,o,a,av}, ru{q,v?,o,a,av}]
const QB=[
['🧊','#bfe3ff',{q:'Су неше градуста\nқата бастайды?',o:['0°C','-1°C','-5°C'],a:0,av:'нөл градус'},{q:'При какой температуре\nначинает замерзать вода?',o:['0°C','-1°C','-5°C'],a:0,av:'ноль градусов'}],
['🪖','#e7dcc8',{q:'Бірінші дүниежүзілік соғыс\nқай жылы басталды?',v:'Бірінші дүниежүзілік соғыс қай жылы басталды?',o:['1913','1905','1914'],a:2,av:'мың тоғыз жүз он төртінші жыл'},{q:'В каком году началась\nПервая мировая война?',o:['1913','1905','1914'],a:2,av:'тысяча девятьсот четырнадцатый год'}],
['🍕','#ffe1c2',{q:'Пиццаның отаны\nқай ел?',o:['Греция','Италия','Франция'],a:1,av:'Италия'},{q:'Какая страна является\nродиной пиццы?',o:['Греция','Италия','Франция'],a:1,av:'Италия'}],
['🌊','#bfe8ff',{q:'Әлемдегі ең үлкен\nмұхит қайсы?',o:['Атлант','Тынық','Үнді'],a:1,av:'Тынық мұхиты'},{q:'Какой океан\nсамый большой?',o:['Атлантический','Тихий','Индийский'],a:1,av:'Тихий океан'}],
['🏔️','#dbe7f5',{q:'Әлемдегі ең биік\nтау қайсы?',o:['Эверест','Эльбрус','Хан Тәңірі'],a:0,av:'Эверест'},{q:'Какая гора самая\nвысокая в мире?',o:['Эверест','Эльбрус','Хан-Тенгри'],a:0,av:'Эверест'}],
['🪐','#e3dcff',{q:'Күн жүйесіндегі ең\nүлкен планета қайсы?',o:['Сатурн','Юпитер','Нептун'],a:1,av:'Юпитер'},{q:'Какая планета самая\nбольшая в Солнечной системе?',o:['Сатурн','Юпитер','Нептун'],a:1,av:'Юпитер'}],
['🦷','#f3f3f3',{q:'Ересек адамның\nнеше тісі болады?',v:'Ересек адамның неше тісі болады?',o:['28','32','36'],a:1,av:'отыз екі'},{q:'Сколько зубов\nу взрослого человека?',o:['28','32','36'],a:1,av:'тридцать два'}],
['🕷️','#e5e5e5',{q:'Өрмекшінің неше\nаяғы бар?',o:['6','8','10'],a:1,av:'сегіз'},{q:'Сколько ног\nу паука?',o:['6','8','10'],a:1,av:'восемь'}],
['📅','#d9f2e4',{q:'Бір жылда неше\nапта бар?',o:['48','52','56'],a:1,av:'елу екі'},{q:'Сколько недель\nв году?',o:['48','52','56'],a:1,av:'пятьдесят две'}],
['📖','#f5e7c8',{q:'Абай Құнанбайұлы\nқай жылы туған?',v:'Абай Құнанбайұлы қай жылы туған?',o:['1845','1856','1835'],a:0,av:'мың сегіз жүз қырық бесінші жыл'},{q:'В каком году родился\nАбай Кунанбаев?',o:['1845','1856','1835'],a:0,av:'тысяча восемьсот сорок пятый год'}],
['🕊️','#cfe9ff',{q:'Қазақстан қай жылы\nтәуелсіздік алды?',o:['1990','1991','1993'],a:1,av:'мың тоғыз жүз тоқсан бірінші жыл'},{q:'В каком году Казахстан\nстал независимым?',o:['1990','1991','1993'],a:1,av:'тысяча девятьсот девяносто первый год'}],
['🐆','#fbe3b5',{q:'Құрлықтағы ең жылдам\nжануар қайсы?',o:['Арыстан','Гепард','Бөкен'],a:1,av:'гепард'},{q:'Какое животное самое\nбыстрое на суше?',o:['Лев','Гепард','Сайгак'],a:1,av:'гепард'}],
['🦘','#f6dcc2',{q:'Кенгуру табиғатта\nқай жерде тұрады?',o:['Африка','Австралия','Бразилия'],a:1,av:'Австралия'},{q:'Где в природе\nживут кенгуру?',o:['Африка','Австралия','Бразилия'],a:1,av:'Австралия'}],
['🔴','#ffd6d6',{q:'Қай планетаны «Қызыл\nпланета» деп атайды?',o:['Венера','Марс','Меркурий'],a:1,av:'Марс'},{q:'Какую планету называют\n«Красной планетой»?',o:['Венера','Марс','Меркурий'],a:1,av:'Марс'}],
['🐦','#d8f5e5',{q:'Әлемдегі ең кішкентай\nқұс қайсы?',o:['Колибри','Торғай','Шымшық'],a:0,av:'колибри'},{q:'Какая птица самая\nмаленькая в мире?',o:['Колибри','Воробей','Синица'],a:0,av:'колибри'}],
['🏅','#fff1b8',{q:'Олимпиада туында\nнеше сақина бар?',o:['4','5','6'],a:1,av:'бес'},{q:'Сколько колец\nна олимпийском флаге?',o:['4','5','6'],a:1,av:'пять'}],
['♟️','#ececec',{q:'Шахмат тақтасында\nнеше шаршы бар?',o:['36','64','81'],a:1,av:'алпыс төрт'},{q:'Сколько клеток\nна шахматной доске?',o:['36','64','81'],a:1,av:'шестьдесят четыре'}],
['🖼️','#f3e2c7',{q:'«Мона Лизаны»\nкім салған?',o:['Микеланджело','Леонардо да Винчи','Рафаэль'],a:1,av:'Леонардо да Винчи'},{q:'Кто написал\n«Мону Лизу»?',o:['Микеланджело','Леонардо да Винчи','Рафаэль'],a:1,av:'Леонардо да Винчи'}],
['🗼','#dfe7ff',{q:'Эйфель мұнарасы\nқай қалада?',o:['Рим','Париж','Лондон'],a:1,av:'Париж'},{q:'В каком городе\nЭйфелева башня?',o:['Рим','Париж','Лондон'],a:1,av:'Париж'}],
['💧','#cdeeff',{q:'Судың химиялық\nформуласы қандай?',o:['H₂O','CO₂','O₂'],a:0,av:'аш екі о'},{q:'Какая химическая\nформула воды?',o:['H₂O','CO₂','O₂'],a:0,av:'аш два о'}],
['⏰','#ffe8cc',{q:'Бір сағатта неше\nсекунд бар?',o:['360','3600','6000'],a:1,av:'үш мың алты жүз'},{q:'Сколько секунд\nв одном часе?',o:['360','3600','6000'],a:1,av:'три тысячи шестьсот'}],
['❄️','#e2f3ff',{q:'Ең суық материк\nқайсы?',o:['Арктика','Антарктида','Гренландия'],a:1,av:'Антарктида'},{q:'Какой материк\nсамый холодный?',o:['Арктика','Антарктида','Гренландия'],a:1,av:'Антарктида'}],
['🖐️','#ffe0d0',{q:'Адам денесіндегі ең\nүлкен мүше қайсы?',o:['Бауыр','Тері','Өкпе'],a:1,av:'тері'},{q:'Какой орган у человека\nсамый большой?',o:['Печень','Кожа','Лёгкие'],a:1,av:'кожа'}],
['🚀','#dcd8ff',{q:'Байқоңыр ғарыш айлағы\nқай елде орналасқан?',o:['Ресей','Қазақстан','Өзбекстан'],a:1,av:'Қазақстан'},{q:'В какой стране находится\nкосмодром Байконур?',o:['Россия','Казахстан','Узбекистан'],a:1,av:'Казахстан'}],
['👨‍🚀','#d6e4ff',{q:'Ғарышқа ұшқан алғашқы\nадам кім?',o:['Юрий Гагарин','Нил Армстронг','Тоқтар Әубәкіров'],a:0,av:'Юрий Гагарин'},{q:'Кто первым полетел\nв космос?',o:['Юрий Гагарин','Нил Армстронг','Токтар Аубакиров'],a:0,av:'Юрий Гагарин'}],
['🛰️','#e0e8ff',{q:'Тұңғыш қазақ\nғарышкері кім?',o:['Тоқтар Әубәкіров','Талғат Мұсабаев','Айдын Айымбетов'],a:0,av:'Тоқтар Әубәкіров'},{q:'Кто первый\nказахский космонавт?',o:['Токтар Аубакиров','Талгат Мусабаев','Айдын Аимбетов'],a:0,av:'Токтар Аубакиров'}],
['🍓','#ffd9df',{q:'Құлпынайдың тұқымы\nқай жерінде болады?',o:['Ішінде','Сыртында','Тұқымы жоқ'],a:1,av:'сыртында'},{q:'Где у клубники\nнаходятся семена?',o:['Внутри','Снаружи','Их нет'],a:1,av:'снаружи'}],
['🌈','#fff0d6',{q:'Кемпірқосақ неше\nтүстен тұрады?',o:['5','7','9'],a:1,av:'жеті'},{q:'Сколько цветов\nу радуги?',o:['5','7','9'],a:1,av:'семь'}],
['🐝','#fff3b0',{q:'Бал арасының неше\nқанаты бар?',o:['2','4','6'],a:1,av:'төрт'},{q:'Сколько крыльев\nу пчелы?',o:['2','4','6'],a:1,av:'четыре'}],
['⚽','#d9f5d9',{q:'Футболда алаңда бір\nкомандадан неше ойыншы?',o:['9','11','12'],a:1,av:'он бір'},{q:'Сколько игроков одной\nкоманды на поле в футболе?',o:['9','11','12'],a:1,av:'одиннадцать'}],
['🌍','#d7f0e6',{q:'Аумағы бойынша ең\nүлкен ел қайсы?',o:['Қытай','Ресей','Канада'],a:1,av:'Ресей'},{q:'Какая страна самая\nбольшая по площади?',o:['Китай','Россия','Канада'],a:1,av:'Россия'}],
['🗺️','#e8f0d8',{q:'Қазақстан аумағы бойынша\nәлемде нешінші орында?',o:['7','9','12'],a:1,av:'тоғызыншы орын'},{q:'Какое место в мире\nзанимает Казахстан по площади?',o:['7','9','12'],a:1,av:'девятое место'}],
['🍵','#e3f2d4',{q:'Шайдың отаны\nқай ел?',o:['Үндістан','Қытай','Англия'],a:1,av:'Қытай'},{q:'Какая страна —\nродина чая?',o:['Индия','Китай','Англия'],a:1,av:'Китай'}],
['☕','#ead8c6',{q:'Кофенің отаны\nқай ел?',o:['Бразилия','Эфиопия','Колумбия'],a:1,av:'Эфиопия'},{q:'Какая страна —\nродина кофе?',o:['Бразилия','Эфиопия','Колумбия'],a:1,av:'Эфиопия'}],
['💰','#e6f5d0',{q:'Теңге қай жылы\nайналымға шықты?',o:['1991','1993','1995'],a:1,av:'мың тоғыз жүз тоқсан үшінші жыл'},{q:'В каком году появился\nказахстанский тенге?',o:['1991','1993','1995'],a:1,av:'тысяча девятьсот девяносто третий год'}],
['🥇','#fff0b3',{q:'Алтынның химиялық\nтаңбасы қандай?',o:['Ag','Au','Al'],a:1,av:'А У'},{q:'Какой химический\nсимвол у золота?',o:['Ag','Au','Al'],a:1,av:'А У'}],
['📐','#e4e8ff',{q:'Үшбұрыш бұрыштарының\nқосындысы қанша?',o:['90°','180°','360°'],a:1,av:'жүз сексен градус'},{q:'Чему равна сумма\nуглов треугольника?',o:['90°','180°','360°'],a:1,av:'сто восемьдесят градусов'}],
['🐋','#cfe6ff',{q:'Жер бетіндегі ең\nірі жануар қайсы?',o:['Піл','Көк кит','Ақ аю'],a:1,av:'көк кит'},{q:'Какое животное самое\nкрупное на Земле?',o:['Слон','Синий кит','Белый медведь'],a:1,av:'синий кит'}],
['🦒','#fbe7bf',{q:'Ең биік жануар\nқайсы?',o:['Піл','Жираф','Түйе'],a:1,av:'жираф'},{q:'Какое животное\nсамое высокое?',o:['Слон','Жираф','Верблюд'],a:1,av:'жираф'}],
['🐫','#f2e1c4',{q:'Түйенің өркешінде\nне сақталады?',o:['Су','Май','Ауа'],a:1,av:'май'},{q:'Что хранится\nв горбу верблюда?',o:['Вода','Жир','Воздух'],a:1,av:'жир'}],
['🏞️','#d3ecff',{q:'Жартысы тұщы, жартысы\nтұзды көл қайсы?',o:['Балқаш','Алакөл','Зайсан'],a:0,av:'Балқаш'},{q:'Какое озеро наполовину\nпресное, наполовину солёное?',o:['Балхаш','Алаколь','Зайсан'],a:0,av:'Балхаш'}],
['🍎','#ffd7d2',{q:'Апорт алмасы қай\nқаланың символы?',o:['Шымкент','Алматы','Тараз'],a:1,av:'Алматы'},{q:'Яблоко апорт —\nсимвол какого города?',o:['Шымкент','Алматы','Тараз'],a:1,av:'Алматы'}],
['🦴','#f1f1f1',{q:'Ересек адамда\nнеше сүйек бар?',o:['186','206','306'],a:1,av:'екі жүз алты'},{q:'Сколько костей\nу взрослого человека?',o:['186','206','306'],a:1,av:'двести шесть'}],
['❤️','#ffd6dc',{q:'Адам жүрегі неше\nбөлімнен тұрады?',o:['2','3','4'],a:2,av:'төрт'},{q:'Сколько камер\nв сердце человека?',o:['2','3','4'],a:2,av:'четыре'}],
['🐬','#cdeefb',{q:'Дельфин —\nбұл кім?',o:['Балық','Сүтқоректі','Қосмекенді'],a:1,av:'сүтқоректі'},{q:'Дельфин —\nэто кто?',o:['Рыба','Млекопитающее','Земноводное'],a:1,av:'млекопитающее'}],
['🎹','#ececec',{q:'Пианинода неше\nперне бар?',o:['66','88','100'],a:1,av:'сексен сегіз'},{q:'Сколько клавиш\nу пианино?',o:['66','88','100'],a:1,av:'восемьдесят восемь'}],
['🪕','#f3e0c6',{q:'Домбыраның неше\nішегі бар?',o:['2','3','4'],a:0,av:'екі'},{q:'Сколько струн\nу домбры?',o:['2','3','4'],a:0,av:'две'}],
['🎸','#f6dccb',{q:'Классикалық гитарада\nнеше ішек бар?',o:['4','6','8'],a:1,av:'алты'},{q:'Сколько струн у\nклассической гитары?',o:['4','6','8'],a:1,av:'шесть'}],
['🌊','#cfe4ff',{q:'Әлемдегі ең терең\nкөл қайсы?',o:['Байкал','Балқаш','Виктория'],a:0,av:'Байкал'},{q:'Какое озеро самое\nглубокое в мире?',o:['Байкал','Балхаш','Виктория'],a:0,av:'Байкал'}],
['💡','#fff4c2',{q:'Жарық секундына\nшамамен қанша жүреді?',o:['3 000 км','30 000 км','300 000 км'],a:2,av:'үш жүз мың шақырым'},{q:'Сколько примерно проходит\nсвет за секунду?',o:['3 000 км','30 000 км','300 000 км'],a:2,av:'триста тысяч километров'}]
];
const CTA={kz:['Дұрыс тапсаңыз, парақшаға жазылыңыз!','Жауабыңыз дұрыс болса, лайк басыңыз!','Ал келесі сұрақ — ең қиыны!','Жауабыңызды комментке жазыңыз!'],
 ru:['Если ответили правильно — подписывайтесь!','Если ваш ответ верный — ставьте лайк!','А следующий вопрос — самый сложный!','Напишите свой ответ в комментариях!']};
const STK=['follow','heart','fire','comment'];
const shuffle=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
function item(b,l){const o=b[l==='ru'?3:2];return{emo:b[0],col:b[1],q:o.q,v:o.v||o.q.replace(/\n/g,' '),o:o.o.slice(),a:o.a,av:o.av}}
function pick4(l,used){const u=new Set(used||[]);let pool=QB.filter(b=>!u.has(b[l==='ru'?3:2].q));if(pool.length<4)pool=QB.slice();return shuffle(pool).slice(0,4).map(b=>item(b,l))}
function swap(l,set,i){const have=new Set(set.map(x=>x.q));const pool=shuffle(QB.filter(b=>!have.has(b[l==='ru'?3:2].q)));set[i]=item(pool[0],l);return set}
function voices(set,l){const pre=l==='ru'?'Ответ — ':'Жауабы — ';return set.map((q,i)=>({q:q.v,a:i<3?`${pre}${q.av}. ${CTA[l][i]}`:CTA[l][3]}))}

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

// ---------- drawing ----------
const F=s=>`700 ${s}px "Balsamiq Sans", "Comic Sans MS", "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
const EF=s=>`${s}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`;
const cl=x=>Math.max(0,Math.min(1,x)),ease=x=>1-Math.pow(1-x,3),back=x=>{const c=1.7;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function wrap(ctx,text,maxW){const out=[];String(text).split('\n').forEach(par=>{let line='';par.split(' ').forEach(w=>{const t=line?line+' '+w:w;if(ctx.measureText(t).width>maxW&&line){out.push(line);line=w}else line=t});out.push(line)});return out}
let BG=null;function bg(ctx){if(!BG){BG=document.createElement('canvas');BG.width=W;BG.height=H;const b=BG.getContext('2d');const g=b.createLinearGradient(0,0,0,H);g.addColorStop(0,'#8aa1b1');g.addColorStop(1,'#71899a');b.fillStyle=g;b.fillRect(0,0,W,H);
  const id=b.getImageData(0,0,W,H),d=id.data;for(let k=0;k<d.length;k+=4){const n=(Math.random()-.5)*18;d[k]+=n;d[k+1]+=n;d[k+2]+=n}b.putImageData(id,0,0);
  const v=b.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.18)');b.fillStyle=v;b.fillRect(0,0,W,H)}ctx.drawImage(BG,0,0)}
function box(ctx,x,y,w,h,fill){ctx.save();ctx.shadowColor='rgba(0,0,0,.18)';ctx.shadowBlur=14;ctx.shadowOffsetY=6;ctx.fillStyle=fill;rr(ctx,x,y,w,h,26);ctx.fill();ctx.restore();ctx.lineWidth=6;ctx.strokeStyle='#1f2328';rr(ctx,x,y,w,h,26);ctx.stroke()}
function bubble(ctx,cx,cy,s){ctx.save();ctx.translate(cx,cy);ctx.scale(s,s);ctx.fillStyle='#fff';ctx.shadowColor='rgba(0,0,0,.15)';ctx.shadowBlur=20;ctx.beginPath();ctx.ellipse(0,0,190,150,0,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(-120,90);ctx.lineTo(-170,190);ctx.lineTo(-40,135);ctx.fill();ctx.shadowColor='transparent';
  ctx.fillStyle='#9aa3ad';for(const x of [-70,0,70]){ctx.beginPath();ctx.arc(x,0,24,0,7);ctx.fill()}ctx.restore()}
function sticker(ctx,kind,cx,cy,p,t){const s=back(cl(p))*(1+.05*Math.sin(t*8));ctx.save();ctx.translate(cx,cy);ctx.scale(s,s);ctx.textAlign='center';ctx.textBaseline='middle';
  if(kind==='follow'){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,130,0,7);ctx.fill();ctx.lineWidth=8;ctx.strokeStyle='#1f2328';ctx.stroke();ctx.font=EF(150);ctx.fillText('🧠',0,8);
    ctx.fillStyle='#ef3b55';ctx.beginPath();ctx.arc(0,128,46,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=8;ctx.stroke();ctx.fillStyle='#fff';ctx.fillRect(-22,122,44,12);ctx.fillRect(-6,106,12,44)}
  else if(kind==='heart'){ctx.font=EF(240);ctx.fillText('❤️',0,10)}
  else if(kind==='fire'){ctx.font=EF(230);ctx.fillText('🔥',0,10)}
  ctx.restore()}
function draw(ctx,D,t){const T=D.tl;bg(ctx);ctx.textAlign='center';ctx.textBaseline='alphabetic';
  let i=T.qs.findIndex(o=>t<o.e);if(i<0)i=T.qs.length-1;const o=T.qs[i],q=D.set[i],lt=t-o.s;
  const ap=cl(lt/.35),slide=(1-ease(ap))*60;
  // question box
  ctx.font=F(62);const ql=wrap(ctx,q.q,880);const qh=Math.max(220,ql.length*78+70);const qy=110;
  ctx.save();ctx.globalAlpha=ap;ctx.translate(0,-slide);box(ctx,60,qy,960,qh,'#fff');ctx.fillStyle='#111';ql.forEach((l,k)=>ctx.fillText(l,W/2,qy+qh/2-(ql.length-1)*39+k*78+22));ctx.restore();
  // picture tile
  const ty=qy+qh+44,tw=640,th=460,tx=(W-tw)/2;const revealed=t>=o.ra,last=i===T.qs.length-1;
  ctx.save();ctx.globalAlpha=ap;ctx.translate(0,slide*.5);
  {box(ctx,tx,ty,tw,th,q.col);ctx.save();rr(ctx,tx+3,ty+3,tw-6,th-6,24);ctx.clip();const g=ctx.createRadialGradient(W/2,ty+th/2,20,W/2,ty+th/2,tw*.7);g.addColorStop(0,'rgba(255,255,255,.75)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(tx,ty,tw,th);
    ctx.textBaseline='middle';ctx.font=EF(300);const bob=Math.sin(t*2.2)*8;ctx.fillText(q.emo,W/2,ty+th/2+bob+10);ctx.restore();ctx.lineWidth=6;ctx.strokeStyle='#1f2328';rr(ctx,tx,ty,tw,th,26);ctx.stroke();
    if(revealed&&!last)sticker(ctx,STK[i],W/2,ty+th/2,(t-o.ra)/.45,t)}
  ctx.restore();
  // timer bar
  const by=ty+th+34,bx=80,bw=W-160,bh=36;
  if(t>=o.ts-.2&&t<o.ra){const rem=cl(1-(t-o.ts)/5);ctx.save();ctx.globalAlpha=cl((t-o.ts+.2)/.2);ctx.fillStyle='#fff';rr(ctx,bx,by,bw,bh,18);ctx.fill();ctx.lineWidth=4;ctx.strokeStyle='#2b3036';ctx.stroke();
    if(rem>0){ctx.fillStyle=rem>.55?'#2ecc40':rem>.25?'#f5d90a':'#ef3b3b';rr(ctx,bx+5,by+5,Math.max(26,(bw-10)*rem),bh-10,13);ctx.fill()}ctx.restore()}
  // options
  const oy=by+bh+44,ow=640,oh=132,gap=26;ctx.font=F(q.o.some(s=>s.length>12)?58:q.o.some(s=>s.length>9)?66:80);
  q.o.forEach((s,k)=>{const p=cl((lt-.15-k*.08)/.3);ctx.save();ctx.globalAlpha=p;ctx.translate(0,(1-ease(p))*40);const y=oy+k*(oh+gap);const ok=revealed&&!last&&k===q.a;
    const pulse=ok?1+.04*Math.max(0,Math.sin((t-o.ra)*10))*Math.exp(-(t-o.ra)*2):1;ctx.translate(W/2,y+oh/2);ctx.scale(pulse,pulse);ctx.translate(-W/2,-(y+oh/2));
    box(ctx,(W-ow)/2,y,ow,oh,ok?'#2ecc40':'#fff');ctx.fillStyle='#111';ctx.textBaseline='middle';ctx.fillText(s,W/2,y+oh/2+4);ctx.restore()});
}
return{pick4,swap,voices,timeline,mix,draw,size:QB.length,CTA};
})();
