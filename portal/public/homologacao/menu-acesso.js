"use strict";
window.aplicarPermissoesMenu=async function(){
  const buttons=[...document.querySelectorAll("#menu button[data-tab]")];
  // Enquanto a consulta não terminar, não expor links que possam ter sido ocultados.
  buttons.filter(b=>b.dataset.tab!=="inicio").forEach(b=>b.hidden=true);
  try{
    const r=await fetch("/colaborador/api/menu/minhas",{credentials:"same-origin",cache:"no-store",headers:{"Accept":"application/json"}});
    if(!r.ok)throw Error("Permissões indisponíveis");
    const result=await r.json();
    buttons.forEach(b=>{b.hidden=b.dataset.tab!=="inicio"&&!result.botoes?.[b.dataset.tab]});
    const selected=document.querySelector("#menu button[data-tab].active");
    if(selected?.hidden)document.querySelector('#menu button[data-tab="inicio"]')?.click();
  }catch(e){
    // Falha fechada: só Início até a consulta ser restabelecida.
    buttons.forEach(b=>{b.hidden=b.dataset.tab!=="inicio"});
    console.warn("Menu: não foi possível carregar permissões",e);
  }
};

// Revalida as permissoes quando o colaborador retorna a esta aba.
window.addEventListener("focus",()=>{if(typeof window.aplicarPermissoesMenu==="function")window.aplicarPermissoesMenu()});
