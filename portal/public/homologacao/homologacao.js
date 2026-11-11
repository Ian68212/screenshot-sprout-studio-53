"use strict";
const $=id=>document.getElementById(id), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const names={documentos:"Documentos",comunicados:"Comunicados",treinamentos:"Treinamentos",ferramentas:"Ferramentas",pcp:"PCP",tarefas:"Gestão de Tarefas",almoxarifado:"Almoxarifado",qualidade:"Setor Teste de Qualidade",rh:"RH",seguranca:"Segurança do Trabalho",aplicativos:"Central de Aplicativos",contatos:"Contatos",suporte:"Suporte / TI"};
let data=[];
const recursoUrl=x=>{try{const u=new URL(String(x.url||""));return u.protocol==="https:"?u.href:null;}catch{return null;}};
const cardRecurso=x=>{const url=recursoUrl(x);return '<article class="item"><div class="placeholder">Rodrinox Pro</div><div class="body"><b>'+esc(x.nome)+'</b><p>'+esc(x.descricao||"")+':</p>'+(url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Abrir recurso ↗</a>':'<span>Sem link disponível</span>')+'</div></article>';};
const logo=document.querySelector(".brand-logo");if(logo){logo.addEventListener("load",()=>{document.querySelector(".brand-fallback").hidden=true;});logo.addEventListener("error",()=>{logo.hidden=true;document.querySelector(".brand-fallback").hidden=false;});}
async function read(endpoint){const r=await fetch("/colaborador/api/"+endpoint,{credentials:"same-origin",method:"GET",headers:{"Accept":"application/json"}});if(r.status===401){location.assign("/colaborador/");throw Error("Sessão expirada");}if(!r.ok)throw Error("Falha de leitura "+r.status);return r.json();}
function openTab(tab){$("home").hidden=tab!=="inicio";$("hero").hidden=tab!=="inicio";$("details").hidden=tab==="inicio";document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));if(tab!=="inicio"){$("items").classList.remove("contacts-list");$("sectionTitle").textContent=names[tab]||tab;const items=data.filter(x=>x.categoria===tab);if(tab==="tarefas"){$("items").innerHTML=renderTarefas();}else if(["documentos","comunicados","treinamentos","ferramentas","pcp","almoxarifado","qualidade","rh","seguranca"].includes(tab)){$("items").innerHTML=items.length?items.map(x=>{const url=recursoUrl(x)||"#";return '<article class="item">'+(/meister\s*task/i.test(String(x.nome||''))?'<div class="brand-meistertask" role="img" aria-label="MeisterTask"><span class="meistertask-mark">M</span><span class="meistertask-word">MeisterTask</span></div>':(x.imagem_url?'<img src="'+esc(x.imagem_url)+'" alt="">':'<div class="placeholder">Rodrinox Pro</div>'))+'<div class="body"><b>'+esc(x.nome)+'</b><p>'+esc(x.descricao||"")+'</p>'+(url!=="#"?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Abrir recurso ↗</a>':'<span>Sem link disponível</span>')+'</div></article>'}).join(""):'<p class="empty">Nenhum item disponível para seu perfil.</p>';}else if(tab==="aplicativos"){$("items").innerHTML='<article class="item"><div class="isic-app-visual" role="img" aria-label="Intelbras iSIC Lite"><div class="isic-app-icon"><svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect x="10" y="17" width="32" height="30" rx="7" fill="none" stroke="currentColor" stroke-width="5"/><path d="M42 27 55 20v24L42 37" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><circle cx="26" cy="32" r="7" fill="none" stroke="currentColor" stroke-width="4"/></svg></div><span class="isic-app-name">iSIC Lite</span></div><div class="body"><b>Intelbras iSIC Lite</b><p>Acesso ao aplicativo de câmeras. A abertura nativa depende do dispositivo.</p><a href="https://play.google.com/store/apps/details?id=com.intelbras.isiclite" target="_blank" rel="noopener noreferrer">Google Play</a></div></article>';}else if(tab==="suporte"){$("items").innerHTML='<article class="item"><div class="body"><b>Suporte / TI</b><p>Para solicitar atendimento, utilize o e-mail oficial de suporte da Rodrinox Pro.</p><p><a href="mailto:suporte@rodrinoxpro.com.br?subject=Solicita%C3%A7%C3%A3o%20de%20suporte%20TI%20-%20Rodrinox%20Pro">Enviar solicitação para suporte@rodrinoxpro.com.br ↗</a></p></div></article>';}else if(tab==="contatos"){mostrarContatos();}else{$("items").innerHTML='<p class="empty">Este módulo ainda não está habilitado para homologação.</p>';}}$("menuToggle").closest(".work").previousElementSibling.classList.remove("open");window.scrollTo(0,0);}
// Consulta autenticada e agrupamento por departamento, sem dados inventados.
async function mostrarContatos(){
  const area=$("items");
  area.classList.add("contacts-list");
  area.innerHTML='<p class="empty">Carregando contatos corporativos...</p>';
  try{
    const contatos=await read("contatos");
    if($("details").hidden||$("sectionTitle").textContent!=="Contatos")return;
    const grupos=new Map();
    for(const c of contatos){
      if(!c.nome||!c.email)continue;
      const setor=c.departamento||"Sem departamento cadastrado";
      if(!grupos.has(setor))grupos.set(setor,[]);
      grupos.get(setor).push(c);
    }
    area.innerHTML=grupos.size?[...grupos].map(([setor,pessoas])=>
      '<section class="contact-group"><h3>'+esc(setor)+'</h3><div class="contact-people">'+
      pessoas.map(c=>'<article class="contact-person"><strong>'+esc(c.nome)+'</strong><a href="mailto:'+encodeURIComponent(c.email)+'">'+esc(c.email)+'</a></article>').join('')+
      '</div></section>').join(''):'<p class="empty">Nenhum e-mail corporativo ativo foi encontrado.</p>';
  }catch(e){area.innerHTML='<p class="empty">Não foi possível carregar os contatos. Tente novamente.</p>';console.error(e);}
}

document.addEventListener("click",e=>{const b=e.target.closest("[data-tab]");if(b){e.preventDefault();openTab(b.dataset.tab);}});
$("menuToggle").addEventListener("click",() =>document.querySelector(".side").classList.toggle("open"));
(async()=>{try{const me=await read("eu");$("user").textContent=me.nome||"Colaborador";$("firstName").textContent=(me.nome||"Colaborador").split(" ")[0];$("adminLink").hidden=me.perfil!=="admin";$("siteLink").hidden=me.perfil!=="admin";const items=await read("ferramentas");data=Array.isArray(items)?items:[];for(const [id,cat] of [["recent","comunicados"],["featured","treinamentos"]]){const arr=data.filter(x=>x.categoria===cat).slice(0,3);$(id).innerHTML=arr.length?arr.map(x=>{const url=recursoUrl(x);const image=x.imagem_url&&(/^https:\/\//i.test(x.imagem_url)||/^\/colaborador\/api\/site\/midias\/\d+\/arquivo$/.test(x.imagem_url))?x.imagem_url:null;const thumb=image?'<img class="resource-thumb" src="'+esc(image)+'" alt="Imagem do curso '+esc(x.nome)+'" loading="lazy">':'';return '<div class="recentItem '+(id==="featured"?"training-item":"")+'">'+thumb+'<div class="resource-info"><strong>'+esc(x.nome)+'</strong>'+(url?' <a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Abrir ↗</a>':' <span>Sem link cadastrado</span>')+'</div></div>';}).join(""):'<p class="empty">Nenhum item disponível ainda.</p>';}}catch(e){$("recent").textContent="Não foi possível consultar os recursos.";$("featured").textContent="Verifique sua sessão e tente novamente.";console.error(e);}})();

/* Ícones vetoriais locais: sem dependência de biblioteca externa. */
const pictos={
 documentos:'<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v6h5M9 12h8M9 16h8"/>',
 comunicados:'<path d="m3 11 12-5v12L3 14zM15 9l4-2v10l-4-2M6 15l2 6h3l-2-6"/>',
 treinamentos:'<path d="m2 9 10-5 10 5-10 5zM6 12v6c4 3 8 3 12 0v-6M22 9v8"/>',
 ferramentas:'<path d="M14 6a5 5 0 0 0-6 6L2 18l4 4 6-6a5 5 0 0 0 6-6l-4 3-3-3z"/><path d="m16 3 5 5M19 2l3 3"/>',
 email:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m3 7 9 7 9-7"/>',
 drive:'<path d="m8 3 5 0 9 15-3 4-9-15zM8 3 1 17l3 5 8-14M4 22h15l3-4H7"/>',
 bling:'<rect x="4" y="11" width="4" height="10"/><rect x="10" y="7" width="4" height="14"/><rect x="16" y="3" width="4" height="18"/>',
 camera:'<rect x="3" y="6" width="14" height="12" rx="2"/><path d="m17 10 5-3v10l-5-3"/>',
 contatos:'<circle cx="9" cy="8" r="3"/><path d="M2 20v-2a7 7 0 0 1 14 0v2M17 5a3 3 0 0 1 0 6M18 14a6 6 0 0 1 4 6"/>',
 suporte:'<path d="M3 14v-3a9 9 0 0 1 18 0v3M3 13h4v7H5a2 2 0 0 1-2-2zM21 13h-4v7h2a2 2 0 0 0 2-2zM17 21a5 5 0 0 1-5 2"/>'
};
function iconMarkup(name){return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+pictos[name]+'</svg>';}
document.querySelectorAll(".features button").forEach((b,i)=>{const name=["documentos","comunicados","treinamentos","ferramentas"][i];const el=b.querySelector("i");if(el){el.classList.add("feature-icon");el.innerHTML=iconMarkup(name);}});
document.querySelectorAll(".access > a,.access > button").forEach((b,i)=>{const name=["email","drive","bling","camera","contatos","suporte"][i];const small=b.querySelector("small");if(small){const span=document.createElement("span");span.className="access-icon";span.innerHTML=iconMarkup(name);b.replaceChildren(span,small);}});

function renderTarefas(){return '<section class="tasks-shell"><div class="tasks-heading"><div><span class="tasks-eyebrow">RODRINOX PRO · GESTÃO OPERACIONAL</span><h2>Gestão de Tarefas</h2><p>Projetos, responsáveis e prazos em um único ambiente.</p></div><span class="tasks-connection">Integração pendente</span></div><div class="tasks-stats"><div><small>Projetos</small><strong>—</strong></div><div><small>Minhas tarefas</small><strong>—</strong></div><div><small>Em andamento</small><strong>—</strong></div><div><small>Vencimentos</small><strong>—</strong></div></div><div class="tasks-tabs"><span>Quadro Kanban</span><span>Minhas tarefas</span><span>Projetos</span><span>Visão administrativa</span></div><div class="tasks-board">'+["A fazer","Em andamento","Em revisão","Concluídas"].map(label=>'<div class="tasks-column"><h3>'+label+'</h3><p>Conecte sua conta MeisterTask para visualizar tarefas autorizadas.</p></div>').join("")+'</div><p class="tasks-note">A integração com a API do MeisterTask ainda requer autorização OAuth individual e configuração segura no servidor. Nenhuma tarefa fictícia é exibida.</p></section>';}
