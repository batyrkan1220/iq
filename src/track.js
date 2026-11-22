// ---- iqtest.live analytics (Supabase) ----
const SB_URL='https://dlhejkmuyyqvjzjxbwbg.supabase.co/rest/v1/',SB_KEY='sb_publishable_7F3dYw4mts2-rpJAgjkcKw_PnlYI2bR';
const VID=(()=>{try{return crypto.randomUUID()}catch(e){return'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c=='x'?r:(r&3|8)).toString(16)})}})();
const NOTRACK=(()=>{try{return window.top!==window||/[?&]notrack/.test(location.search)}catch(e){return true}})();
function sbIns(t,row){if(NOTRACK)return;try{fetch(SB_URL+t,{method:'POST',keepalive:true,headers:{apikey:SB_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(row)}).catch(()=>{})}catch(e){}}
let _visitP=null;
function trVisit(){const u=new URLSearchParams(location.search),g=k=>(u.get(k)||'').slice(0,190)||null;const ua=navigator.userAgent||'';
  const dev=/iPad|Tablet/i.test(ua)?'tablet':/Mobi|Android|iPhone/i.test(ua)?'mobile':'desktop';
  const src=g('utm_source')||(u.get('ttclid')?'tiktok':u.get('fbclid')?'meta':null);
  sbIns('visits',{id:VID,lang:(typeof LANG!=='undefined'?LANG:null),path:location.pathname.slice(0,190),referrer:(document.referrer||'').slice(0,490)||null,utm_source:src,utm_medium:g('utm_medium'),utm_campaign:g('utm_campaign'),utm_content:g('utm_content'),device:dev,ua:ua.slice(0,390)})}
// ---- ad pixels (TikTok, Meta, Yandex Metrica, Google) — IDs are set in admin → Маркетинг → Пиксели ----
// Каждое событие сайта уходит во все включённые пиксели. Карта событий: PXMAP (та же таблица показана в админке).
const PXMAP={start:['start_click','StartClick','ClickButton'],begin:['test_start','ViewContent','ViewContent'],answer:['question_{n}','Question_{n}','Question_{n}'],
  finish:['test_complete','TestComplete','CompleteRegistration'],email_view:['email_view','EmailView',null],email:['lead','Lead','Lead'],result:['view_result','ViewResult','ViewContent'],
  pay_click:['begin_checkout','InitiateCheckout','InitiateCheckout'],pay_phone:['add_payment_info','AddPaymentInfo','AddPaymentInfo'],paid:['purchase','Purchase','CompletePayment'],
  share:['share','Share',null],again:['restart','Restart',null],open_link:['open_result_link','OpenResultLink',null]};
const FB_STD=['PageView','ViewContent','Lead','InitiateCheckout','AddPaymentInfo','Purchase','CompleteRegistration'];
const PX={cfg:null,q:[],ready:false};
function pxLoad(src,cb){const s=document.createElement('script');s.async=true;s.src=src;if(cb)s.onload=cb;document.head.appendChild(s)}
function pxInit(c){PX.cfg=c||{};const id=k=>{const v=PX.cfg[k];return typeof v==='string'&&/^[\w-]{4,40}$/.test(v.trim())?v.trim():null};
  const tt=id('px_tiktok'),fb=id('px_meta'),ymId=id('px_ym'),ga=id('px_ga');
  try{if(tt){!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var s=d.createElement("script");s.type="text/javascript",s.async=!0,s.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(s,a)};ttq.load(tt);ttq.page()}(window,document,'ttq')}}catch(e){}
  try{if(fb){!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',fb);fbq('track','PageView')}}catch(e){}
  try{if(ymId&&/^\d+$/.test(ymId)){(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');ym(+ymId,'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:PX.cfg.px_ym_webvisor!==false});PX.ymId=+ymId}}catch(e){}
  try{if(ga){pxLoad('https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(ga));window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',ga)}}catch(e){}
  PX.ready=true;PX.q.splice(0).forEach(a=>pxFire(a[0],a[1]))}
function pxFire(type,data){if(NOTRACK)return;if(!PX.ready){PX.q.push([type,data]);return}const m=PXMAP[type];if(!m)return;
  if(type==='answer'&&PX.cfg.px_questions===false)return;data=data||{};
  const sub=s=>s&&s.replace('{n}',data.n||0),gaN=sub(m[0]),fbN=sub(m[1]),ttN=sub(m[2]),val=+data.value||0;
  const money=type==='paid'&&val?{value:val,currency:'KZT'}:{},eid=data.order?type+'-'+data.order:undefined;
  if(type==='paid'&&data.order){try{if(localStorage.getItem('px_paid_'+data.order))return;localStorage.setItem('px_paid_'+data.order,'1')}catch(e){}}
  try{if(window.ttq&&ttN)ttq.track(ttN,{...money,...(type==='paid'?{content_id:'iq_report',content_type:'product',quantity:1}:{})},eid?{event_id:eid}:undefined)}catch(e){}
  try{if(window.fbq&&fbN)fbq(FB_STD.includes(fbN)?'track':'trackCustom',fbN,money,eid?{eventID:eid}:undefined)}catch(e){}
  try{if(PX.ymId&&window.ym)ym(PX.ymId,'reachGoal',gaN,type==='paid'?{order_price:val,currency:'KZT'}:undefined)}catch(e){}
  try{if(window.gtag)gtag('event',gaN,type==='paid'?{value:val,currency:'KZT',transaction_id:data.order}:{})}catch(e){}}
if(!NOTRACK){try{const c=sessionStorage.getItem('px_cfg');if(c)pxInit(JSON.parse(c));else fetch(SB_URL+'rpc/site_config',{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:'{}'}).then(r=>r.ok?r.json():{}).then(j=>{try{sessionStorage.setItem('px_cfg',JSON.stringify(j||{}))}catch(e){}pxInit(j)}).catch(()=>{if(!PX.ready)pxInit({})})}catch(e){pxInit({})}}
function TR(type,data){setTimeout(()=>sbIns('events',{visit_id:VID,type,data:data||null}),300);pxFire(type,data)}
trVisit();
