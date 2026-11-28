"use strict";
(()=>{if(document.body.classList.contains("portal-embedded"))return;if(window.__rpChatNavReady)return;window.__rpChatNavReady=true;
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
@media(max-width:780px){#rp-attendance-dock{right:10px;bottom:calc(10px + env(safe-area-inset-bottom));width:min(320px,calc(100vw - 20px))}#rp-attendance-dock button{min-height:45px;font-size:11px;padding:7px 6px}#rp-attendance-dock .rp-dock-icon svg{width:21px;height:21px}body:not(:has(#sidebarAttendance)){padding-bottom:70px}}
#rp-chat-window{position:fixed;right:18px;bottom:88px;width:min(520px,calc(100vw - 36px));height:min(650px,calc(100dvh - 125px));z-index:99990;display:flex;flex-direction:column;background:#09243c;border:1px solid #426784;border-radius:14px;box-shadow:0 16px 55px #0009;overflow:hidden}#rp-chat-window[hidden]{display:none!important}#rp-chat-window.rp-chat-maximized{inset:12px 12px 12px var(--rp-chat-left,12px);width:auto;height:auto;border-radius:10px}#rp-chat-window .rp-chat-window-bar{display:flex;align-items:center;gap:10px;min-height:44px;padding:7px 10px 7px 15px;background:#123a58;color:white;font:700 13px system-ui,Arial}#rp-chat-window .rp-chat-window-bar strong{flex:1}#rp-chat-window .rp-chat-window-bar button{background:#234f70;color:white;border:1px solid #50718b;border-radius:7px;padding:5px 9px;cursor:pointer;font:700 14px system-ui,Arial}#rp-chat-window iframe{width:100%;flex:1;min-height:0;border:0;background:#09243c}#rp-chat-window.rp-chat-maximized iframe{width:100%}@media(max-width:780px){
 body:not(:has(#sidebarAttendance)) > #rp-chat-window{display:none!important}
 body:has(#sidebarAttendance) > #rp-chat-window{inset:64px 10px 10px;width:auto;height:auto}
 body:has(#sidebarAttendance) .side.open{z-index:99995!important}
}
#menu button[data-tab=chat-interno].rp-chat-nav-alert:after{content:"";display:inline-block;width:10px;height:10px;margin-left:7px;border-radius:50%;background:#ff2934;box-shadow:0 0 0 3px #ff293455;animation:rp-dot-blink .55s steps(2,end) infinite;vertical-align:middle}
#menu button[data-tab=chat-interno].rp-chat-nav-alert{animation:rp-nav-flash .7s steps(2,end) infinite}
@keyframes rp-dot-blink{0%,100%{opacity:1}50%{opacity:.08}}@keyframes rp-nav-flash{0%,100%{background:#2b4969}50%{background:#a3222a;color:#fff}}
#sidebarAttendance{flex:none;padding:0 0 8px}
#sidebarAttendance #rp-attendance-dock{position:static;grid-template-columns:1fr;gap:4px;width:100%;padding:0 4px;border:0;background:none;box-shadow:none;backdrop-filter:none}
#sidebarAttendance #rp-attendance-dock :is(button, a){min-height:34px;display:flex;align-items:center;justify-content:flex-start;gap:7px;font:700 12px/1.2 system-ui,Arial;text-decoration:none;padding:5px 9px;border:1px solid #35516c;border-radius:7px;background:#193650;color:#f5f9ff;font-size:12px;text-align:left}
#sidebarAttendance #rp-attendance-dock [data-open="whatsapp"]{--accent:#81ddb5;--border:#3e7667;--surface:#153c3b;--highlight:#214d48}
#sidebarAttendance #rp-attendance-dock [data-open="chat"]{--accent:#ffc18c;--border:#865a42;--surface:#3b302d;--highlight:#4f3c31}
#sidebarAttendance #rp-attendance-dock [data-sidebar-email]{--accent:#a5d2ff;--border:#436e98;--surface:#193b60;--highlight:#244e78}
#sidebarAttendance #rp-attendance-dock :is(button, a){background:var(--surface);border-color:var(--border)}
#sidebarAttendance #rp-attendance-dock :is(button, a):is(:hover,:focus-visible,[aria-expanded="true"],[aria-current="page"]){background:var(--highlight)}
#sidebarAttendance #rp-attendance-dock :is(button, a):focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
#sidebarAttendance #rp-attendance-dock .rp-dock-icon{color:var(--accent)}
#sidebarAttendance #rp-attendance-dock .rp-dock-icon svg{width:17px;height:17px;stroke:currentColor}
#sidebarAttendance #rp-attendance-dock .rp-dock-count{position:static;margin-left:auto}
.side:has(#sidebarAttendance #rp-attendance-dock) #menu [data-tab="chat-interno"],
.side:has(#sidebarAttendance #rp-attendance-dock) #menu [data-tab="atendimento"]{display:none}
.side:not(:has(#menu [data-tab="chat-interno"]:not([hidden]))) #sidebarAttendance [data-open="chat"],
.side:not(:has(#menu [data-tab="atendimento"]:not([hidden]))) #sidebarAttendance [data-open="whatsapp"]{display:none}
`;document.head.append(style);
const dock=document.createElement("nav");dock.id="rp-attendance-dock";dock.setAttribute("aria-label","Atalhos de comunicação");
dock.innerHTML='<button type="button" data-open="whatsapp"><span class="rp-dock-icon" aria-hidden="true"><svg viewBox="0 0 24 24" role="img" aria-label="WhatsApp"><path d="M12 2.1a9.7 9.7 0 0 0-8.35 14.63L2.4 21.6l5.02-1.2A9.7 9.7 0 1 0 12 2.1Z"/><path d="M8.15 7.25c.25-.55.52-.56.8-.56h.55c.18 0 .38.07.5.36l.78 1.82c.1.24.08.43-.08.62l-.57.68c-.17.18-.22.36-.08.6.45.83 1.2 1.62 2.06 2.13.25.15.44.15.62-.08l.72-.86c.18-.22.4-.25.65-.14l1.75.83c.27.13.42.2.46.36.04.17.04.96-.35 1.47-.4.52-1.05.8-1.7.82-.7.02-1.57-.2-2.7-.7-1.4-.62-2.5-1.65-3.43-2.76-.77-.92-1.26-2-1.3-2.88-.04-.83.36-1.42.72-1.7Z"/></svg></span><span>Central de Atendimento</span></button><button type="button" data-open="chat"><span class="rp-dock-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3h4l2 5-2.5 1.7a15 15 0 0 0 5.8 5.8L16 13l5 2v4c0 1.1-.9 2-2 2C10.2 21 3 13.8 3 5c0-1.1.9-2 2-2Z"/></svg></span><span>Chat Interno</span></button>';
const sidebarAttendance = document.getElementById("sidebarAttendance");
const emailShortcut = sidebarAttendance?.closest(".side")?.querySelector("[data-sidebar-email]");
if (emailShortcut) {
  emailShortcut.innerHTML = '<span class="rp-dock-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg></span><span>Minha caixa de e-mails</span>';
  dock.append(emailShortcut);
}
(sidebarAttendance || document.body).append(dock);
const chatDockButton=dock.querySelector('[data-open="chat"]');const chatDockCount=document.createElement("span");chatDockCount.className="rp-dock-count";chatDockCount.hidden=true;chatDockCount.setAttribute("aria-label","Mensagens não lidas");chatDockButton.append(chatDockCount);
const chatWindow=document.createElement("section");chatWindow.id="rp-chat-window";chatWindow.hidden=true;chatWindow.setAttribute("aria-label","Janela do Chat Interno");chatWindow.innerHTML='<div class="rp-chat-window-bar"><strong>Chat Interno · Rodrinoxpro</strong><button type="button" data-window="maximize" title="Maximizar chat" aria-label="Maximizar chat">□</button><button type="button" data-window="close" title="Fechar chat" aria-label="Fechar chat">×</button></div><iframe title="Chat Interno Rodrinoxpro" loading="lazy"></iframe>';document.body.append(chatWindow);const chatFrame=chatWindow.querySelector("iframe"),maximizeButton=chatWindow.querySelector('[data-window="maximize"]');const attendanceButton=dock.querySelector('[data-open="whatsapp"]');
const attendanceTab=document.querySelector('#menu [data-tab="atendimento"]');
const isAttendanceOpen=()=>Boolean(attendanceTab?.classList.contains("active"));
let returnFromAttendance=null;

chatDockButton.setAttribute("aria-controls",chatWindow.id);
chatDockButton.setAttribute("aria-expanded","false");
attendanceButton.setAttribute("aria-expanded","false");

function openChatWindow(){
  if(window.matchMedia("(max-width:780px)").matches){
    const sidebar=dock.closest(".side");
    if(!sidebar){location.assign(chatUrl);return;}
    if(sidebar.classList.contains("open"))document.getElementById("menuToggle")?.click();
  }
  if(!chatFrame.getAttribute("src"))chatFrame.src=chatUrl+"?compact=1";
  chatWindow.hidden=false;
  chatDockButton.setAttribute("aria-expanded","true");
  chatFrame.focus();
}

function closeChatWindow(){
  chatWindow.hidden=true;
  chatDockButton.setAttribute("aria-expanded","false");
}

function toggleChatWindow(){
  if(chatWindow.hidden)openChatWindow();
  else closeChatWindow();
}

chatWindow.querySelector('[data-window="close"]').onclick=closeChatWindow;
maximizeButton.onclick=()=>{
  const sidebar=dock.closest(".side");
  chatWindow.style.setProperty("--rp-chat-left",sidebar?sidebar.getBoundingClientRect().right+12+"px":"12px");
  const full=chatWindow.classList.toggle("rp-chat-maximized");
  maximizeButton.textContent=full?"❐":"□";
  maximizeButton.title=full?"Restaurar tamanho":"Maximizar chat";
  maximizeButton.setAttribute("aria-label",maximizeButton.title);
};
window.addEventListener("rp-open-internal-chat",openChatWindow);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!chatWindow.hidden)closeChatWindow();});

function toggleAttendance(){
  if(isAttendanceOpen()){
    const restore=returnFromAttendance;
    returnFromAttendance=null;
    if(restore)restore();
    else document.querySelector('#menu [data-tab="inicio"]')?.click();
    return;
  }

  const module=document.querySelector('#menu [data-module][aria-current="page"]');
  const selected=document.querySelector('#menu button.active:not([hidden])');
  returnFromAttendance=module?()=>module.click():selected?()=>selected.click():null;
  const alert=document.getElementById("ca-global-alert");
  if(alert)alert.click();
  else if(attendanceTab)attendanceTab.click();
  else location.assign((location.pathname.includes("/painel/")?"/colaborador/painel/oficial/":"/colaborador/oficial/")+"?abrir=atendimento");
}

dock.addEventListener("click",e=>{
  const action=e.target.closest("button")?.dataset.open;
  if(action==="chat")toggleChatWindow();
  if(action==="whatsapp")toggleAttendance();
});

if(attendanceTab){
  const syncAttendance=()=>{
    const open=isAttendanceOpen();
    attendanceButton.setAttribute("aria-expanded",String(open));
    if(!open)returnFromAttendance=null;
  };
  new MutationObserver(syncAttendance).observe(attendanceTab,{attributes:true,attributeFilter:["class"]});
  syncAttendance();
}
document.addEventListener("click",e=>{
  if(!e.target.closest('button[data-tab="chat-interno"]'))return;
  e.preventDefault();
  e.stopImmediatePropagation();
  toggleChatWindow();
},true);
const alertCounts={}, alertSelectors={whatsapp:'[data-open="whatsapp"]',chat:'[data-open="chat"]',email:'[data-sidebar-email]'};let audio,queued=false,lastBeep=0;
const alertStyle=document.createElement("style");alertStyle.textContent='#rp-attendance-dock .rp-strong-alert{animation:rpStrongAlert 1.2s ease-in-out infinite!important;outline:2px solid var(--accent,#a5d2ff)}@keyframes rpStrongAlert{50%{background:var(--highlight,#244e78);box-shadow:inset 0 0 0 2px var(--accent,#a5d2ff),0 0 12px var(--accent,#a5d2ff)}}@media(prefers-reduced-motion:reduce){#rp-attendance-dock .rp-strong-alert{animation:none!important}}';document.head.append(alertStyle);
function beep(){if(!audio||audio.state!=="running"){queued=true;return}if(Date.now()-lastBeep<1500)return;lastBeep=Date.now();queued=false;for(let i=0;i<4;i++){const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.26;o.type="sine";o.frequency.value=1050;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.65,t+.015);g.gain.setValueAtTime(.65,t+.13);g.gain.linearRampToValueAtTime(0,t+.19);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.2)}}
function unlock(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;audio??=new A();audio.resume().then(()=>{if(queued)beep()}).catch(()=>{})}catch{}}
document.addEventListener("pointerdown",unlock,true);document.addEventListener("keydown",unlock,true);
window.addEventListener("rp-notification-state",e=>{const {source,count}=e.detail||{};if(!Object.hasOwn(alertSelectors,source))return;const n=Math.max(0,Number(count)||0),old=alertCounts[source];alertCounts[source]=n;const target=dock.querySelector(alertSelectors[source]);if(target){target.classList.toggle("rp-strong-alert",n>0);if(source==="email"){let b=target.querySelector(".rp-dock-count");if(!b){b=document.createElement("span");b.className="rp-dock-count";target.append(b)}b.hidden=!n;b.textContent=n>99?"99+":String(n)}}if((old!==undefined&&n>old)||e.detail.fresh===true)beep()});
let previous=null,busy=false;
async function check(){if(busy)return;busy=true;try{const r=await fetch("/colaborador/api/chat-interno/nao-lidas",{credentials:"same-origin",cache:"no-store"});if(!r.ok)return;const data=await r.json(),n=Math.max(0,Number(data.total)||0);chatDockCount.hidden=n===0;chatDockCount.textContent=n>99?"99+":String(n);chatDockButton.classList.toggle("rp-dock-unread",n>0);document.querySelectorAll(".chat-nav-count").forEach(b=>{b.hidden=!n;b.textContent=n>99?"99+":String(n);b.style.cssText="display:"+(n?"inline-block":"none")+";background:#f28c3d;color:#10243b;border-radius:20px;padding:2px 6px;margin-left:5px;font-size:11px;font-weight:700"});window.dispatchEvent(new CustomEvent("rp-notification-state",{detail:{source:"chat",count:n}}));document.querySelectorAll("[data-tab=chat-interno]").forEach(b=>b.classList.toggle("rp-chat-nav-alert",n>0));if(previous!==null&&n>previous&&document.hidden&&"Notification"in window&&Notification.permission==="granted")new Notification("Rodrinox Pro • Nova mensagem",{body:"Você recebeu uma mensagem no chat interno.",tag:"rp-chat-interno"});previous=n}catch{}finally{busy=false}}
check();setInterval(check,5000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)check()});
})();