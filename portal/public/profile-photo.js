(()=>{"use strict";
if(window.__rpGlobalProfile)return;window.__rpGlobalProfile=true;
const style=document.createElement("style");style.textContent=`
#rp-global-profile{position:fixed;right:18px;top:12px;z-index:8500;font:14px Arial,sans-serif;color:#fff;pointer-events:none}
#rp-global-profile>.rp-trigger,#rp-global-profile>.rp-menu,#rp-global-profile>.rp-dialog{pointer-events:auto}
#rp-global-profile.rp-in-header{position:relative;right:auto;top:auto;z-index:100;flex:none;margin-left:auto;pointer-events:auto}
#rp-global-profile.rp-in-header .rp-menu{z-index:9000}
#rp-global-profile.rp-in-header .rp-dialog{position:fixed}
#rp-global-profile.rp-compact .rp-name{display:none}
#rp-global-profile.rp-compact .rp-trigger{padding:4px 7px}
#rp-global-profile .rp-trigger{display:flex;align-items:center;gap:10px;padding:6px 12px;border:1px solid #ffffff33;border-radius:14px;background:#102d49ed;color:#fff;box-shadow:0 5px 18px #0003;cursor:pointer}
#rp-global-profile .rp-avatar{display:grid;place-items:center;flex:none;width:39px;height:39px;border:2px solid #87b9e1;border-radius:50%;overflow:hidden;background:#264a69;color:#fff;font-weight:700}
#rp-global-profile .rp-avatar img{width:100%;height:100%;object-fit:cover}
#rp-global-profile .rp-menu{position:absolute;right:0;top:calc(100% + 8px);min-width:235px;background:#fff;color:#18334a;border:1px solid #dbe5ed;border-radius:13px;padding:8px;box-shadow:0 15px 35px #0004}
#rp-global-profile .rp-menu[hidden]{display:none}
#rp-global-profile .rp-menu button{display:block;width:100%;padding:12px;border:0;background:transparent;color:#18334a;text-align:left;font:inherit;cursor:pointer;border-radius:8px}
#rp-global-profile .rp-menu button:hover{background:#eef4f9}
#rp-global-profile .rp-menu .rp-logout{color:#b42332;border-top:1px solid #e7edf2;border-radius:0}
#rp-global-profile .rp-name{max-width:155px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}
#rp-global-profile .rp-dialog{border:0;border-radius:16px;padding:22px;max-width:410px;width:calc(100vw - 35px);color:#19354d;background:white;box-shadow:0 20px 70px #0007}
#rp-global-profile .rp-dialog::backdrop{background:#031729b8}
#rp-global-profile .rp-dialog form{display:grid;gap:12px}
#rp-global-profile .rp-dialog h2{margin:0}
#rp-global-profile .rp-dialog img{height:105px;width:105px;border-radius:50%;object-fit:cover;margin:auto;background:#eaf1f7}
#rp-global-profile .rp-dialog input{max-width:100%}
#rp-global-profile .rp-dialog button{padding:10px;border:0;border-radius:8px;background:#174e79;color:white;cursor:pointer}
#rp-global-profile .rp-dialog .rp-cancel{background:#eaf1f7;color:#173b58}
#rp-global-profile .rp-dialog small{color:#63798c}
@media(max-width:650px){#rp-global-profile{right:8px;top:7px}.rp-name{display:none}#rp-global-profile .rp-trigger{padding:4px 7px}}
`;style.textContent+=`
#rp-global-profile .rp-trigger{position:relative;min-height:40px;border-radius:13px;padding:4px 8px 4px 5px;gap:8px;background:linear-gradient(145deg,#173b5b,#0b263f);border:1px solid #456783;box-shadow:0 4px 14px #0003}
#rp-global-profile .rp-avatar{width:36px;height:36px;border:2px solid #8bb8d8;box-shadow:0 0 0 2px #ffffff12}
#rp-global-profile .rp-name{font-size:13px;max-width:125px}
#rp-global-profile .rp-alert-dot{display:none;width:8px;height:8px;border-radius:50%;background:#ff3b42;box-shadow:0 0 0 4px #ff3b4233}
#rp-global-profile.rp-has-alert .rp-trigger{border-color:#ff7b24;background:linear-gradient(145deg,#7b3d18,#163754);box-shadow:0 0 0 2px #ff8a2d55,0 0 18px #ff7b2455;animation:rp-profile-alert .8s ease-in-out infinite}
#rp-global-profile.rp-has-alert .rp-avatar{border-color:#ff9b3e;box-shadow:0 0 0 3px #ff9b3e55}
#rp-global-profile.rp-has-alert .rp-alert-dot{display:block;animation:rp-profile-dot .7s steps(2,end) infinite}
@keyframes rp-profile-alert{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35)}}
@keyframes rp-profile-dot{0%,100%{opacity:1}50%{opacity:.15}}
#rp-global-profile .rp-menu{min-width:255px;padding:9px;border-radius:15px;background:linear-gradient(160deg,#102e49,#071d32);border:1px solid #42617d;color:#edf6ff}
#rp-global-profile .rp-menu-user{display:flex;align-items:center;gap:11px;padding:10px 9px 13px;margin-bottom:5px;border-bottom:1px solid #ffffff20}
#rp-global-profile .rp-menu-avatar{width:43px;height:43px;display:grid;place-items:center;overflow:hidden;border-radius:50%;border:2px solid #79a9cc;background:#254965;font-weight:800}
#rp-global-profile .rp-menu-avatar img{width:100%;height:100%;object-fit:cover}
#rp-global-profile .rp-menu-user strong,#rp-global-profile .rp-menu-user small{display:block}
#rp-global-profile .rp-menu-user small{margin-top:4px;color:#a9c0d4;font-size:11px}
#rp-global-profile .rp-menu .rp-menu-link{display:flex;align-items:center;gap:12px;width:100%;padding:12px 10px;border:0;border-radius:9px;background:transparent;color:#edf6ff;text-align:left;text-decoration:none;font:600 13px Arial;cursor:pointer}
#rp-global-profile .rp-menu .rp-menu-link:hover,#rp-global-profile .rp-menu button:hover{background:#244765}
#rp-global-profile .rp-menu .rp-menu-link>span{display:grid;place-items:center;width:24px;height:24px;color:#ff9a43;font-size:19px}
#rp-global-profile .rp-menu .rp-wa-icon{color:#39d67a!important}#rp-global-profile .rp-menu .rp-menu-link>span svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#rp-global-profile .rp-menu .rp-edit{margin-top:5px;border-top:1px solid #ffffff20;border-radius:0;padding-top:13px;color:#c4d8e8}
#rp-global-profile .rp-menu .rp-logout{color:#ffb2a9}
@media(max-width:650px){#rp-global-profile.rp-in-header .rp-name{display:block;max-width:92px;font-size:12px}#rp-global-profile.rp-in-header .rp-trigger{padding:3px 7px 3px 4px;gap:6px}#rp-global-profile.rp-in-header .rp-avatar{width:34px;height:34px}#rp-global-profile.rp-in-header .rp-trigger>span:last-child{display:block}}
`;
document.head.append(style);
const root=document.createElement("div");root.id="rp-global-profile";root.innerHTML=`<button class="rp-trigger" type="button" aria-label="Abrir menu do usuário" aria-expanded="false"><span class="rp-avatar">RP</span><span class="rp-name">Meu perfil</span><span class="rp-alert-dot" aria-hidden="true"></span><span aria-hidden="true">⌄</span></button><div class="rp-menu" hidden><div class="rp-menu-user"><span class="rp-menu-avatar">RP</span><span><strong class="rp-menu-name">Meu perfil</strong><small class="rp-menu-role">Portal Rodrinox Pro</small></span></div><a class="rp-menu-link rp-email" href="/colaborador/oficial/email-corporativo.html"><span>✉</span>E-mail corporativo</a><button type="button" class="rp-menu-link rp-whatsapp"><span class="rp-wa-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 11.7a8.2 8.2 0 0 1-12.1 7.2L3 20l1.2-4.8a8.2 8.2 0 1 1 16-3.5Z"/><path d="M8.2 7.7c.3-.5.6-.5.9-.5h.5c.2 0 .4.1.5.4l.8 1.8c.1.2.1.4-.1.6l-.6.7c-.2.2-.2.4-.1.6.5.9 1.3 1.7 2.2 2.2.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.7.8c.3.1.4.3.4.5v.5c0 .3 0 .6-.5.9-.5.3-1.2.5-2 .3-1.1-.2-2.4-.9-3.7-2.2-1.3-1.3-2-2.6-2.2-3.7-.2-.8 0-1.5.3-2Z"/></svg></span>Central de Atendimento</button><button type="button" class="rp-menu-link rp-chat"><span>☎</span>Chat interno</button><button type="button" class="rp-edit">◎　Meu perfil / Alterar foto</button><button type="button" class="rp-logout">↪　Sair do portal</button></div><dialog class="rp-dialog"><form><h2>Minha foto de perfil</h2><small>Essa foto será utilizada em todos os painéis e no Chat Interno.</small><img class="rp-preview" alt="Foto de perfil"><input type="file" accept="image/jpeg,image/png,image/webp" required><small>JPG, PNG ou WebP · máximo 3 MB</small><p class="rp-feedback" role="status"></p><button type="submit" class="rp-save">Salvar foto</button><button type="button" class="rp-cancel">Cancelar</button></form></dialog>`;
document.body.append(root);
function positionProfile(){
 const headers=[...document.querySelectorAll("header")].filter(el=>{
  const b=el.getBoundingClientRect();
  return b.top>=-3&&b.top<75&&b.width>Math.min(420,innerWidth*.55)&&b.height>=45&&b.height<150&&!el.closest("aside,dialog");
 });
 const header=headers.sort((a,b)=>b.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
 if(header){
  // Anexar o perfil ao fluxo do cabeçalho, evitando sobrepor botões existentes.
  if(root.parentElement!==header)header.append(root);
  root.classList.add("rp-in-header");
  header.style.display="flex";
  header.style.alignItems="center";
  header.style.minWidth="0";
  root.classList.toggle("rp-compact",header.getBoundingClientRect().width<950);
 }else{
  if(root.parentElement!==document.body)document.body.append(root);
  root.classList.remove("rp-in-header");
  root.classList.toggle("rp-compact",innerWidth<1000);
 }
}
positionProfile();
window.addEventListener("resize",positionProfile);
const trigger=root.querySelector(".rp-trigger"),menu=root.querySelector(".rp-menu"),avatar=root.querySelector(".rp-avatar"),name=root.querySelector(".rp-name"),dialog=root.querySelector("dialog"),file=root.querySelector("input"),preview=root.querySelector(".rp-preview"),feedback=root.querySelector(".rp-feedback");
const menuAvatar=root.querySelector(".rp-menu-avatar"),menuName=root.querySelector(".rp-menu-name"),menuRole=root.querySelector(".rp-menu-role");
const alertState={chat:0,whatsapp:0};
window.addEventListener("rp-notification-state",e=>{const d=e.detail||{};if(d.source in alertState)alertState[d.source]=Math.max(0,Number(d.count)||0);root.classList.toggle("rp-has-alert",alertState.chat+alertState.whatsapp>0);});
let user=null,photo="";
function paint(){const full=user?.nome||"Meu perfil",first=full.trim().split(/\s+/)[0]||"Meu perfil",initials=full.split(" ").slice(0,2).map(v=>v[0]||"").join("").toUpperCase();avatar.replaceChildren();menuAvatar.replaceChildren();if(photo){const img=document.createElement("img");img.src=photo;img.alt="";img.onerror=()=>{avatar.textContent=initials;menuAvatar.textContent=initials};avatar.append(img);const img2=document.createElement("img");img2.src=photo;img2.alt="";menuAvatar.append(img2);preview.src=photo}else{avatar.textContent=initials;menuAvatar.textContent=initials;preview.removeAttribute("src")}name.textContent=first;menuName.textContent=full;menuRole.textContent=user?.perfil==="admin"?"Administrador":"Colaborador";}
async function load(){try{const r=await fetch("/colaborador/api/eu",{credentials:"same-origin",cache:"no-store"});if(!r.ok){root.hidden=true;return}user=await r.json();photo=user.foto_url?user.foto_url+"?v="+Date.now():"";paint();}catch{root.hidden=true}}
trigger.onclick=()=>{menu.hidden=!menu.hidden;trigger.setAttribute("aria-expanded",String(!menu.hidden))};
root.querySelector(".rp-email").addEventListener("click",e=>{e.preventDefault();location.assign("/colaborador/homologacao/email-corporativo.html")});
root.querySelector(".rp-whatsapp").onclick=()=>{menu.hidden=true;const b=document.getElementById("ca-global-alert");if(b)b.click();else location.assign((location.pathname.includes("/painel/oficial")?"/colaborador/painel/oficial/":"/colaborador/oficial/")+"?abrir=atendimento")};
root.querySelector(".rp-chat").onclick=()=>{menu.hidden=true;const b=document.getElementById("rp-chat-fab");if(b)b.click();else location.assign("/colaborador/chat-interno.html?janela=1")};
document.addEventListener("click",e=>{if(!root.contains(e.target)){menu.hidden=true;trigger.setAttribute("aria-expanded","false")}});
root.querySelector(".rp-edit").onclick=()=>{menu.hidden=true;feedback.textContent="";file.value="";dialog.showModal()};
root.querySelector(".rp-cancel").onclick=()=>dialog.close();
file.onchange=()=>{const f=file.files?.[0];if(!f)return;if(!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>3*1024*1024){feedback.textContent="Selecione uma foto JPG, PNG ou WebP de até 3 MB.";file.value="";return}preview.src=URL.createObjectURL(f)};
root.querySelector("form").onsubmit=async e=>{e.preventDefault();const f=file.files?.[0];if(!f)return;const btn=root.querySelector(".rp-save");btn.disabled=true;feedback.textContent="Salvando...";try{const form=new FormData();form.append("foto",f);const r=await fetch("/colaborador/api/perfil/foto",{method:"PUT",credentials:"same-origin",headers:{"X-Portal":"1"},body:form});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.erro||"Falha ao salvar");photo=data.foto_url;paint();dialog.close();document.dispatchEvent(new CustomEvent("rp-profile-updated",{detail:{foto_url:photo}}))}catch(err){feedback.textContent=err.message}finally{btn.disabled=false}};
root.querySelector(".rp-logout").onclick=async()=>{try{await fetch("/colaborador/api/logout",{method:"POST",credentials:"same-origin",headers:{"X-Portal":"1"}})}finally{location.replace("/colaborador/")}};
load();
})();