"use strict";
(()=>{if(window.__rpChatNavReady)return;window.__rpChatNavReady=true;
const chatUrl="/colaborador/chat-interno.html";
const style=document.createElement("style");style.textContent=`
#rp-attendance-dock{position:fixed;right:18px;left:auto;bottom:16px;transform:none;z-index:99980;width:min(350px,calc(100vw - 36px));display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:7px;background:rgba(5,24,43,.96);border:1px solid #294965;border-radius:15px;box-shadow:0 5px 22px #0005;backdrop-filter:blur(14px)}
#rp-attendance-dock button{position:relative;min-width:0;min-height:46px;border:1.5px solid #00d66f;border-radius:30px;background:transparent;color:#fff;display:flex;align-items:center;justify-content:center;gap:7px;padding:7px 9px;font:700 12px system-ui,Arial;cursor:pointer;line-height:1.2}
#rp-attendance-dock button:last-child{background:#ff7900;border-color:#ff7900;color:#fff}
#rp-attendance-dock button:focus-visible{outline:2px solid #fff;outline-offset:2px}
#rp-attendance-dock .rp-dock-icon{line-height:1;display:grid;place-items:center;color:#fff;flex-shrink:0}
#rp-attendance-dock .rp-dock-icon svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#rp-attendance-dock button:first-child .rp-dock-icon svg{stroke:#fff;stroke-width:1.9}
#rp-attendance-dock .rp-dock-count{position:absolute;top:-8px;right:-4px;min-width:19px;height:19px;padding:0 4px;border-radius:12px;background:#ff2934;color:#fff;border:2px solid #09223b;display:grid;place-items:center;font:700 10px system-ui,Arial}
#rp-attendance-dock .rp-dock-count[hidden]{display:none}
#rp-attendance-dock .rp-dock-unread{animation:rp-dock-pulse 1.4s ease-in-out infinite}
@keyframes rp-dock-pulse{0%,100%{box-shadow:0 0 0 0 #ff293400}50%{box-shadow:0 0 0 4px #ff293455}}
#rp-chat-fab,#ca-global-alert{display:none!important}
body.rp-no-dock #rp-attendance-dock{display:grid!important}
@media(min-width:781px){body{padding-bottom:0!important}}
@media(max-width:780px){#rp-attendance-dock{right:10px;bottom:calc(10px + env(safe-area-inset-bottom));width:min(320px,calc(100vw - 20px))}#rp-attendance-dock button{min-height:45px;font-size:11px;padding:7px 6px}#rp-attendance-dock .rp-dock-icon svg{width:21px;height:21px}body{padding-bottom:70px}}
#menu button[data-tab=chat-interno].rp-chat-nav-alert:after{content:"";display:inline-block;width:10px;height:10px;margin-left:7px;border-radius:50%;background:#ff2934;box-shadow:0 0 0 3px #ff293455;animation:rp-dot-blink .55s steps(2,end) infinite;vertical-align:middle}
#menu button[data-tab=chat-interno].rp-chat-nav-alert{animation:rp-nav-flash .7s steps(2,end) infinite}
@keyframes rp-dot-blink{0%,100%{opacity:1}50%{opacity:.08}}@keyframes rp-nav-flash{0%,100%{background:#2b4969}50%{background:#a3222a;color:#fff}}
`;document.head.append(style);
const dock=document.createElement("nav");dock.id="rp-attendance-dock";dock.setAttribute("aria-label","Atendimento Rodrinox");
dock.innerHTML='<button type="button" data-open="whatsapp"><span class="rp-dock-icon" aria-hidden="true"><svg viewBox="0 0 24 24" role="img" aria-label="WhatsApp"><path d="M12 2.1a9.7 9.7 0 0 0-8.35 14.63L2.4 21.6l5.02-1.2A9.7 9.7 0 1 0 12 2.1Z"/><path d="M8.15 7.25c.25-.55.52-.56.8-.56h.55c.18 0 .38.07.5.36l.78 1.82c.1.24.08.43-.08.62l-.57.68c-.17.18-.22.36-.08.6.45.83 1.2 1.62 2.06 2.13.25.15.44.15.62-.08l.72-.86c.18-.22.4-.25.65-.14l1.75.83c.27.13.42.2.46.36.04.17.04.96-.35 1.47-.4.52-1.05.8-1.7.82-.7.02-1.57-.2-2.7-.7-1.4-.62-2.5-1.65-3.43-2.76-.77-.92-1.26-2-1.3-2.88-.04-.83.36-1.42.72-1.7Z"/></svg></span><span>Central de Atendimento</span></button><button type="button" data-open="chat"><span class="rp-dock-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3h4l2 5-2.5 1.7a15 15 0 0 0 5.8 5.8L16 13l5 2v4c0 1.1-.9 2-2 2C10.2 21 3 13.8 3 5c0-1.1.9-2 2-2Z"/></svg></span><span>Chat Interno</span></button>';
document.body.append(dock);
const chatDockButton=dock.querySelector('[data-open="chat"]');const chatDockCount=document.createElement("span");chatDockCount.className="rp-dock-count";chatDockCount.hidden=true;chatDockCount.setAttribute("aria-label","Mensagens não lidas");chatDockButton.append(chatDockCount);
dock.addEventListener("click",e=>{const action=e.target.closest("button")?.dataset.open;if(action==="chat"){location.assign(chatUrl);return}if(action==="whatsapp"){const target=document.getElementById("ca-global-alert");if(target)target.click();else location.assign((location.pathname.includes("/painel/")?"/colaborador/painel/oficial/":"/colaborador/oficial/")+"?abrir=atendimento")}});
function syncDock(){const path=location.pathname.toLowerCase(),section=(document.getElementById("sectionTitle")?.textContent||"").trim().toLowerCase(),active=document.querySelector('nav [data-tab="atendimento"].active');const excluded=false;document.body.classList.toggle("rp-no-dock",excluded)}
new MutationObserver(syncDock).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","hidden"]});syncDock();
document.addEventListener("click",e=>{const b=e.target.closest('button[data-tab="chat-interno"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();location.assign(chatUrl)},true);
let previous=null,busy=false;
async function check(){if(busy)return;busy=true;try{const r=await fetch("/colaborador/api/chat-interno/nao-lidas",{credentials:"same-origin",cache:"no-store"});if(!r.ok)return;const data=await r.json(),n=Math.max(0,Number(data.total)||0);chatDockCount.hidden=n===0;chatDockCount.textContent=n>99?"99+":String(n);chatDockButton.classList.toggle("rp-dock-unread",n>0);document.querySelectorAll(".chat-nav-count").forEach(b=>{b.hidden=!n;b.textContent=n>99?"99+":String(n);b.style.cssText="display:"+(n?"inline-block":"none")+";background:#f28c3d;color:#10243b;border-radius:20px;padding:2px 6px;margin-left:5px;font-size:11px;font-weight:700"});window.dispatchEvent(new CustomEvent("rp-notification-state",{detail:{source:"chat",count:n}}));document.querySelectorAll("[data-tab=chat-interno]").forEach(b=>b.classList.toggle("rp-chat-nav-alert",n>0));if(previous!==null&&n>previous&&document.hidden&&"Notification"in window&&Notification.permission==="granted")new Notification("Rodrinox Pro • Nova mensagem",{body:"Você recebeu uma mensagem no chat interno.",tag:"rp-chat-interno"});previous=n}catch{}finally{busy=false}}
check();setInterval(check,5000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)check()});
})();