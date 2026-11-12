"use strict";
(function(){
 document.addEventListener("click",function(e){
  const b=e.target.closest('button[data-tab="chat-interno"]');
  if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  location.href="/colaborador/chat-interno.html";
 },true);
 async function check(){
  if(document.hidden)return;
  try{
   const r=await fetch("/colaborador/api/chat-interno/nao-lidas",{credentials:"same-origin",cache:"no-store"});
   if(!r.ok)return;
   const data=await r.json(),n=Number(data.total)||0;
   document.querySelectorAll(".chat-nav-count").forEach(b=>{b.hidden=!n;b.textContent=n>99?"99+":String(n);b.style.cssText="display:"+(n?"inline-block":"none")+";background:#f28c3d;color:#10243b;border-radius:20px;padding:2px 6px;margin-left:5px;font-size:11px;font-weight:700"});
  }catch{}
 }
 setTimeout(check,1500);
 setInterval(check,12000);
})();
