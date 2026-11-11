"use strict";
window.aplicarPermissoesMenu=async function(){
  const buttons=[...document.querySelectorAll("#menu button[data-tab],#menu button[data-admin-tab]")];
  const key=b=>b.dataset.adminTab?"admin."+b.dataset.adminTab:b.dataset.tab;
  // Enquanto a consulta não terminar, não expor links que possam ter sido ocultados.
  buttons.filter(b=>key(b)!=="inicio").forEach(b=>b.hidden=true);
  try{
    const r=await fetch("/colaborador/api/menu/minhas",{credentials:"same-origin",cache:"no-store",headers:{"Accept":"application/json"}});
    if(!r.ok)throw Error("Permissões indisponíveis");
    const result=await r.json();
    buttons.forEach(b=>{b.hidden=key(b)!=="inicio"&&!result.botoes?.[key(b)]});
    const selected=document.querySelector("#menu button.active");
    if(selected?.hidden)document.querySelector('#menu button[data-tab="inicio"]')?.click();
  }catch(e){
    // Falha fechada: só Início até a consulta ser restabelecida.
    buttons.forEach(b=>{b.hidden=b.dataset.tab!=="inicio"});
    console.warn("Menu: não foi possível carregar permissões",e);
  }
};
