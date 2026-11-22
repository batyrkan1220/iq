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
function TR(type,data){setTimeout(()=>sbIns('events',{visit_id:VID,type,data:data||null}),300)}
trVisit();
