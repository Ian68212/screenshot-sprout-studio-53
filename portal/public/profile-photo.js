(()=>{"use strict";
if(window.__rpGlobalProfile)return;window.__rpGlobalProfile=true;
const style=document.createElement("style");style.textContent=`
#rp-global-profile{position:fixed;right:18px;top:12px;z-index:8500;font:14px Arial,sans-serif;color:#fff}
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
`;document.head.append(style);
const root=document.createElement("div");root.id="rp-global-profile";root.innerHTML=`<button class="rp-trigger" type="button" aria-label="Abrir menu do usuário" aria-expanded="false"><span class="rp-avatar">RP</span><span class="rp-name">Meu perfil</span><span aria-hidden="true">⌄</span></button><div class="rp-menu" hidden><button type="button" class="rp-edit">📷 Alterar minha foto</button><button type="button" class="rp-logout">↪ Sair do portal</button></div><dialog class="rp-dialog"><form><h2>Minha foto de perfil</h2><small>Essa foto será utilizada em todos os painéis e no Chat Interno.</small><img class="rp-preview" alt="Foto de perfil"><input type="file" accept="image/jpeg,image/png,image/webp" required><small>JPG, PNG ou WebP · máximo 3 MB</small><p class="rp-feedback" role="status"></p><button type="submit" class="rp-save">Salvar foto</button><button type="button" class="rp-cancel">Cancelar</button></form></dialog>`;
document.body.append(root);
const trigger=root.querySelector(".rp-trigger"),menu=root.querySelector(".rp-menu"),avatar=root.querySelector(".rp-avatar"),name=root.querySelector(".rp-name"),dialog=root.querySelector("dialog"),file=root.querySelector("input"),preview=root.querySelector(".rp-preview"),feedback=root.querySelector(".rp-feedback");
let user=null,photo="";
function paint(){avatar.replaceChildren();if(photo){const img=document.createElement("img");img.src=photo;img.alt="";img.onerror=()=>{avatar.textContent=(user?.nome||"RP").slice(0,2).toUpperCase()};avatar.append(img);preview.src=photo}else{avatar.textContent=(user?.nome||"RP").split(" ").slice(0,2).map(v=>v[0]||"").join("").toUpperCase();preview.removeAttribute("src")}name.textContent=user?.nome||"Meu perfil";}
async function load(){try{const r=await fetch("/colaborador/api/eu",{credentials:"same-origin",cache:"no-store"});if(!r.ok){root.hidden=true;return}user=await r.json();photo=user.foto_url?user.foto_url+"?v="+Date.now():"";paint();}catch{root.hidden=true}}
trigger.onclick=()=>{menu.hidden=!menu.hidden;trigger.setAttribute("aria-expanded",String(!menu.hidden))};
document.addEventListener("click",e=>{if(!root.contains(e.target)){menu.hidden=true;trigger.setAttribute("aria-expanded","false")}});
root.querySelector(".rp-edit").onclick=()=>{menu.hidden=true;feedback.textContent="";file.value="";dialog.showModal()};
root.querySelector(".rp-cancel").onclick=()=>dialog.close();
file.onchange=()=>{const f=file.files?.[0];if(!f)return;if(!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>3*1024*1024){feedback.textContent="Selecione uma foto JPG, PNG ou WebP de até 3 MB.";file.value="";return}preview.src=URL.createObjectURL(f)};
root.querySelector("form").onsubmit=async e=>{e.preventDefault();const f=file.files?.[0];if(!f)return;const btn=root.querySelector(".rp-save");btn.disabled=true;feedback.textContent="Salvando...";try{const form=new FormData();form.append("foto",f);const r=await fetch("/colaborador/api/perfil/foto",{method:"PUT",credentials:"same-origin",headers:{"X-Portal":"1"},body:form});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.erro||"Falha ao salvar");photo=data.foto_url;paint();dialog.close();document.dispatchEvent(new CustomEvent("rp-profile-updated",{detail:{foto_url:photo}}))}catch(err){feedback.textContent=err.message}finally{btn.disabled=false}};
root.querySelector(".rp-logout").onclick=async()=>{try{await fetch("/colaborador/api/logout",{method:"POST",credentials:"same-origin",headers:{"X-Portal":"1"}})}finally{location.replace("/colaborador/")}};
load();
})();