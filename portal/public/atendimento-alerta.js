"use strict";
(function(){
if(window.rodrinoxAttendanceAlerts)return;window.rodrinoxAttendanceAlerts=true;
let busy=false,uid=null,seen={},pending=new Map(),previous=new Map();
const rows=d=>Array.isArray(d)?d:[d?.rows,d?.data,d?.items,d?.results].find(Array.isArray)||[];
const key=t=>String(t.id);
const stamp=t=>String(t.lastMessageId||t.lastMessage?.id||t.lastMessageAt||t.lastMessage?.createdAt||t.updatedAt||t.createdAt||"");
const version=t=>t.rodrinoxFila+"|"+stamp(t);
const style=document.createElement("style");style.textContent=".ca-attention{animation:caAttention 1s infinite!important}.ca-attention-count{background:#d71935;color:white;border-radius:20px;padding:2px 7px;margin-left:auto;font-size:12px}@keyframes caAttention{50%{background:#087e65!important;box-shadow:0 0 0 4px #23d99788}}@media(prefers-reduced-motion:reduce){.ca-attention{animation:none!important;outline:2px solid #23d997}}";document.head.append(style);
function paint(){const n=pending.size;const nodes=[...document.querySelectorAll('#sidebarAttendance button,#sidebarAttendance a,nav [data-tab="atendimento"]')].filter(el=>/central de atendimento/i.test(el.textContent));for(const el of nodes){el.classList.toggle("ca-attention",n>0);let badge=el.querySelector(".ca-attention-count");if(!badge){badge=document.createElement("span");badge.className="ca-attention-count";el.append(badge)}badge.hidden=!n;badge.textContent=n>99?"99+":String(n)}window.dispatchEvent(new CustomEvent("rp-notification-state",{detail:{source:"whatsapp",count:n}}));}
function persist(){try{localStorage.setItem("rp-ca-seen:"+uid,JSON.stringify(seen))}catch{}}
window.addEventListener("rp-ca-viewed",e=>{if(document.hidden||!uid)return;const id=String(e.detail?.id||"");const t=previous.get(id);if(t){seen[id]=version(t);pending.delete(id);persist();paint()}});
async function poll(){if(busy||document.hidden)return;busy=true;try{
const s=await fetch("/colaborador/api/atendimento/status",{credentials:"same-origin",cache:"no-store"});if(!s.ok){if(s.status===403){pending.clear();paint()}return}const status=await s.json();if(!status.identidadeCorporativa)return;
if(uid!==String(status.usuario.id)){uid=String(status.usuario.id);seen={};try{seen=JSON.parse(localStorage.getItem("rp-ca-seen:"+uid)||"{}")||{}}catch{}previous.clear();pending.clear()}
const r=await fetch("/colaborador/api/atendimento/consultar/tickets",{credentials:"same-origin",cache:"no-store"});if(!r.ok)return;
const tickets=rows(await r.json()).filter(t=>t.rodrinoxFila==="meus"||(status.podeVerFila===true&&t.rodrinoxFila==="fila"));const next=new Map(tickets.map(t=>[key(t),t]));const oldCount=pending.size;pending.clear();
for(const [id,t] of next){if(seen[id]!==version(t))pending.set(id,t)}
for(const id of Object.keys(seen))if(!next.has(id))delete seen[id];persist();previous=next;paint();
if(pending.size>oldCount&&"Notification" in window&&Notification.permission==="granted"){const n=new Notification("Rodrinoxpro · Central de Atendimento",{body:"Você tem atendimentos aguardando visualização.",tag:"rodrinox-whatsapp"});n.onclick=()=>{window.focus();document.querySelector('nav [data-tab="atendimento"]')?.click();n.close()}}
}catch(e){console.warn("Avisos da Central indisponíveis",e)}finally{busy=false}}
poll();setInterval(poll,8000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)poll()});
})();
