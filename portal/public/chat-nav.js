"use strict";
(function(){
 const URL="/colaborador/chat-interno.html";
 let lastCount=null, audio=null, unlocked=false, checking=false;
 const style=document.createElement("style");
 style.textContent=`
 #rp-chat-fab{position:fixed;right:22px;bottom:22px;z-index:99990;display:flex;align-items:center;gap:9px;padding:13px 17px;background:#f18d37;color:#13283d;border:0;border-radius:28px;box-shadow:0 8px 28px #0006;font:700 14px system-ui,Arial;cursor:pointer}
 #rp-chat-fab .rp-chat-icon{font-size:21px}#rp-chat-fab .rp-chat-badge{display:none;min-width:21px;padding:3px 6px;border-radius:20px;background:#c82d32;color:#fff;font-size:12px}
 #rp-chat-fab.rp-has-unread{animation:rp-chat-pulse 1.15s ease-in-out infinite}
 #rp-chat-fab.rp-has-unread .rp-chat-badge{display:inline-block}
 @keyframes rp-chat-pulse{0%,100%{background:#f18d37;color:#13283d;box-shadow:0 8px 28px #0006;transform:scale(1)}50%{background:#fff0bd;color:#13283d;box-shadow:0 0 0 9px #f18d3740,0 8px 28px #0006;transform:scale(1.065)}}
 #rp-chat-toast{position:fixed;right:22px;bottom:89px;z-index:99991;background:#fff;color:#19344b;border-left:4px solid #f18d37;border-radius:12px;box-shadow:0 10px 35px #0006;padding:13px 16px;max-width:min(320px,calc(100vw - 28px));font:14px system-ui;cursor:pointer}
 #rp-chat-toast strong{display:block;margin-bottom:4px}
 @media(max-width:700px){#rp-chat-fab{right:14px;bottom:calc(14px + env(safe-area-inset-bottom));padding:12px 15px}#rp-chat-toast{right:14px;bottom:calc(80px + env(safe-area-inset-bottom))}}
 @media(prefers-reduced-motion:reduce){#rp-chat-fab.rp-has-unread{animation:none}}
 `;
 document.head.append(style);
 const fab=document.createElement("button");fab.type="button";fab.id="rp-chat-fab";fab.setAttribute("aria-label","Abrir Chat Interno Rodrinox");fab.innerHTML='<span class="rp-chat-icon" aria-hidden="true">✉</span><span>Chat interno</span><span class="rp-chat-badge" aria-hidden="true"></span>';
 fab.addEventListener("click",()=>location.assign(URL));
 document.body.append(fab);
 document.addEventListener("click",function(e){const b=e.target.closest('button[data-tab="chat-interno"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();location.assign(URL)},true);
 function unlock(){
  if(unlocked)return;
  try{audio=new (window.AudioContext||window.webkitAudioContext)();audio.resume().then(()=>{unlocked=true}).catch(()=>{});}catch{}
 }
 document.addEventListener("pointerdown",unlock,{passive:true});
 document.addEventListener("keydown",unlock);
 function beep(){
  if(!unlocked||!audio||audio.state!=="running")return;
  try{const t=audio.currentTime;for(let i=0;i<2;i++){const o=audio.createOscillator(),g=audio.createGain(),start=t+i*.19;o.type="sine";o.frequency.value=i?740:620;g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(.065,start+.025);g.gain.exponentialRampToValueAtTime(.0001,start+.15);o.connect(g);g.connect(audio.destination);o.start(start);o.stop(start+.16);}}catch{}
 }
 function toast(count){
  document.getElementById("rp-chat-toast")?.remove();
  const t=document.createElement("div");t.id="rp-chat-toast";t.setAttribute("role","status");
  const h=document.createElement("strong");h.textContent="Nova mensagem no Chat Interno";
  const p=document.createElement("span");p.textContent=count===1?"Você tem 1 mensagem não lida.":"Você tem "+count+" mensagens não lidas.";
  t.append(h,p);t.addEventListener("click",()=>location.assign(URL));document.body.append(t);
  setTimeout(()=>t.remove(),7500);
 }
 async function check(){
  if(checking)return;checking=true;
  try{
   const r=await fetch("/colaborador/api/chat-interno/nao-lidas",{credentials:"same-origin",cache:"no-store"});
   if(!r.ok)return;
   const data=await r.json(),n=Math.max(0,Number(data.total)||0);
   document.querySelectorAll(".chat-nav-count").forEach(b=>{b.hidden=!n;b.textContent=n>99?"99+":String(n);b.style.cssText="display:"+(n?"inline-block":"none")+";background:#f28c3d;color:#10243b;border-radius:20px;padding:2px 6px;margin-left:5px;font-size:11px;font-weight:700"});
   fab.classList.toggle("rp-has-unread",n>0);fab.querySelector(".rp-chat-badge").textContent=n>99?"99+":String(n);
   fab.setAttribute("aria-label",n?"Chat interno: "+n+" mensagens não lidas":"Abrir Chat Interno Rodrinox");
   if(lastCount!==null&&n>lastCount){beep();toast(n);if(document.hidden&&"Notification" in window&&Notification.permission==="granted"){try{new Notification("Rodrinox Pro • Nova mensagem",{body:"Você recebeu uma mensagem no chat interno.",tag:"rp-chat-interno"});}catch{}}}
   lastCount=n;
  }catch{}finally{checking=false}
 }
 setTimeout(check,1200);setInterval(check,5000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)check()});
})();
