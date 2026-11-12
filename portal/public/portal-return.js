(()=>{"use strict";
if(window.__rpPortalReturnReady)return;window.__rpPortalReturnReady=true;
async function resolve(){
 try{const r=await fetch("/colaborador/api/eu",{credentials:"same-origin",cache:"no-store"});if(!r.ok)return;const u=await r.json();const target=u.perfil==="admin"?"/colaborador/painel/oficial/":"/colaborador/oficial/";
 document.querySelectorAll('a[href="/colaborador/oficial/"],a[href="/colaborador/painel.html"],a[href="/colaborador/painel.html#"],a[href="painel.html"],a[href="./painel.html"],a[href="/colaborador/oficial"]').forEach(a=>{const t=(a.textContent||"").toLowerCase();if(/portal|voltar|início/.test(t))a.href=target;});
 document.querySelectorAll("[data-portal-return]").forEach(a=>a.href=target);
 }catch(e){console.warn("Não foi possível identificar o destino do portal",e)}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",resolve,{once:true});else resolve();
if(new URLSearchParams(location.search).get("abrir")==="atendimento"){
 let tries=0;const go=()=>{const b=document.querySelector('nav [data-tab="atendimento"]');if(b){b.click();return;}if(++tries<20)setTimeout(go,300)};setTimeout(go,350);
}
})();