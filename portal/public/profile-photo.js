(()=>{"use strict";
const css=`
#rp-profile-trigger{display:inline-flex;align-items:center;gap:9px;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;padding:5px 8px;border-radius:12px}
#rp-profile-trigger:hover{background:#ffffff18}
#rp-profile-avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;overflow:hidden;flex:none;background:#eaf2f8;color:#173b58;border:2px solid #f18d37;font-weight:800}
#rp-profile-avatar img{width:100%;height:100%;object-fit:cover}
#rp-profile-caption{display:grid;text-align:left;gap:2px}
#rp-profile-caption small{font-size:10px;opacity:.75;font-weight:500}
#rp-profile-dialog{width:min(430px,calc(100vw - 28px));border:0;border-radius:18px;padding:0;box-shadow:0 24px 70px #071d32aa;color:#19354d}
#rp-profile-dialog::backdrop{background:#061a2acc;backdrop-filter:blur(3px)}
#rp-profile-dialog form{padding:22px;display:grid;gap:13px}
#rp-profile-dialog h2{margin:0;font-size:20px}
#rp-profile-dialog p{margin:0;color:#64788a;font-size:13px;line-height:1.45}
#rp-profile-preview{width:112px;height:112px;object-fit:cover;border-radius:50%;margin:4px auto 8px;border:4px solid #edf3f8;background:#edf3f8}
#rp-profile-dialog input[type=file]{width:100%;padding:10px;border:1px solid #d7e1e9;border-radius:10px;background:#f8fafc}
#rp-profile-dialog .rp-profile-actions{display:flex;justify-content:flex-end;gap:9px}
#rp-profile-dialog button{border:0;border-radius:9px;padding:10px 15px;font-weight:700;cursor:pointer;background:#173b58;color:#fff}
#rp-profile-dialog button.secondary{background:#edf2f6;color:#29445b}
#rp-profile-message{min-height:18px;color:#b42332;font-size:12px}
@media(max-width:650px){#rp-profile-caption small{display:none}#rp-profile-avatar{width:34px;height:34px}#rp-profile-trigger{gap:5px;padding:3px}}
`;
const style=document.createElement("style");style.textContent=css;document.head.append(style);
const nameNode=document.getElementById("user");if(!nameNode)return;
const trigger=document.createElement("button");trigger.type="button";trigger.id="rp-profile-trigger";trigger.title="Ver e atualizar minha foto";
const avatar=document.createElement("span");avatar.id="rp-profile-avatar";
const caption=document.createElement("span");caption.id="rp-profile-caption";
const name=document.createElement("strong");name.textContent=nameNode.textContent.trim()||"Colaborador";
const sub=document.createElement("small");sub.textContent="Meu perfil · Alterar foto";
caption.append(name,sub);trigger.append(avatar,caption);nameNode.replaceWith(trigger);
const dialog=document.createElement("dialog");dialog.id="rp-profile-dialog";
dialog.innerHTML='<form id="rp-profile-form"><h2>Meu perfil</h2><p>Atualize sua foto para que ela apareça no portal e na identificação da equipe.</p><img id="rp-profile-preview" alt="Prévia da foto de perfil"><label for="rp-profile-file"><strong>Escolher foto</strong></label><input id="rp-profile-file" type="file" accept="image/jpeg,image/png,image/webp"><p>JPG, PNG ou WebP · até 3 MB</p><div id="rp-profile-message" role="status"></div><div class="rp-profile-actions"><button type="button" class="secondary" id="rp-profile-close">Fechar</button><button type="submit" id="rp-profile-save">Salvar foto</button></div></form>';
document.body.append(dialog);
const preview=dialog.querySelector("#rp-profile-preview"),file=dialog.querySelector("#rp-profile-file"),message=dialog.querySelector("#rp-profile-message"),save=dialog.querySelector("#rp-profile-save");
let currentPhoto="",userName="Colaborador";
function paint(url){avatar.innerHTML="";if(url){const img=document.createElement("img");img.src=url;img.alt="";avatar.append(img);preview.src=url;}else{const initials=userName.split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase();avatar.textContent=initials||"R";preview.removeAttribute("src");preview.style.objectFit="contain";preview.src="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="100%" height="100%" fill="#eaf2f8"/><text x="50%" y="55%" font-size="40" text-anchor="middle" fill="#173b58" font-family="Arial">'+(initials||"R")+'</text></svg>');}}
async function load(){try{const r=await fetch("/colaborador/api/eu",{credentials:"same-origin",cache:"no-store"});if(!r.ok)return;const u=await r.json();userName=u.nome||"Colaborador";name.textContent=userName;sub.textContent=[u.setor,u.cargo].filter(Boolean).join(" · ")||"Meu perfil · Alterar foto";currentPhoto=u.foto_url?u.foto_url+"?v="+Date.now():"";paint(currentPhoto);}catch(e){console.warn("Perfil não carregado",e);}}
trigger.addEventListener("click",()=>{message.textContent="";file.value="";preview.style.objectFit="cover";dialog.showModal();});
dialog.querySelector("#rp-profile-close").addEventListener("click",()=>dialog.close());
file.addEventListener("change",()=>{const f=file.files?.[0];if(!f)return;if(!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>3*1024*1024){file.value="";message.textContent="Escolha JPG, PNG ou WebP de até 3 MB.";return;}preview.src=URL.createObjectURL(f);preview.style.objectFit="cover";message.textContent="";});
dialog.querySelector("form").addEventListener("submit",async e=>{e.preventDefault();const f=file.files?.[0];if(!f){message.textContent="Escolha uma foto antes de salvar.";return;}save.disabled=true;save.textContent="Enviando...";message.textContent="";try{const data=new FormData();data.append("foto",f);const r=await fetch("/colaborador/api/perfil/foto",{method:"PUT",credentials:"same-origin",headers:{"X-Portal":"1"},body:data});const out=await r.json().catch(()=>({}));if(!r.ok)throw Error(out.erro||"Não foi possível salvar a foto.");currentPhoto=out.foto_url;paint(currentPhoto);dialog.close();}catch(err){message.textContent=err.message;}finally{save.disabled=false;save.textContent="Salvar foto";}});
load();
})();