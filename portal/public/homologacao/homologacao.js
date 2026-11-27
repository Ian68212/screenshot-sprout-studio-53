"use strict";
const $=id=>document.getElementById(id), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const names={documentos:"Documentos",comunicados:"Comunicados",treinamentos:"Treinamentos",ferramentas:"Ferramentas",pcp:"PCP",tarefas:"Gestão de Tarefas",atendimento:"Central de Atendimento","gestao-empresarial":"Gestão Empresarial",almoxarifado:"Almoxarifado",qualidade:"Setor Teste de Qualidade",rh:"RH",seguranca:"Segurança do Trabalho",aplicativos:"Central de Aplicativos",contatos:"Contatos",suporte:"Suporte / TI"};
let data=[];
let gePerfil=null;
const recursoUrl=x=>{try{const u=new URL(String(x.url||""));return u.protocol==="https:"?u.href:null;}catch{return null;}};
const cardRecurso=x=>{const url=recursoUrl(x);return '<article class="item"><div class="placeholder">Rodrinox Pro</div><div class="body"><b>'+esc(x.nome)+'</b><p>'+esc(x.descricao||"")+':</p>'+(url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Abrir recurso ↗</a>':'<span>Sem link disponível</span>')+'</div></article>';};
const logo=document.querySelector(".brand-logo");if(logo){logo.addEventListener("load",()=>{document.querySelector(".brand-fallback").hidden=true;});logo.addEventListener("error",()=>{logo.hidden=true;document.querySelector(".brand-fallback").hidden=false;});}
async function read(endpoint){const r=await fetch("/colaborador/api/"+endpoint,{credentials:"same-origin",method:"GET",headers:{"Accept":"application/json"}});if(r.status===401){location.assign("/colaborador/");throw Error("Sessão expirada");}if(!r.ok)throw Error("Falha de leitura "+r.status);return r.json();}
function openTab(tab){closePortalModule();setPortalMenu(false);$("home").hidden=tab!=="inicio";$("hero").hidden=tab!=="inicio";$("details").hidden=tab==="inicio";document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));if(tab==="treinamentos"&&window.renderMyTrainings){$("sectionTitle").textContent="Treinamentos";$("items").replaceChildren();window.renderMyTrainings($("items"));return;}if(tab!=="inicio"){$("items").classList.remove("contacts-list","ge-area");$("sectionTitle").textContent=names[tab]||tab;const items=data.filter(x=>x.categoria===tab);if(tab==="seguranca"){window.renderSST?.();}else if(tab==="atendimento"){window.renderCentralAtendimento?.();}else if(tab==="gestao-empresarial"){$("items").classList.add("ge-area");$("items").innerHTML=window.renderGestaoEmpresarial?window.renderGestaoEmpresarial(gePerfil):'<p class="empty">Módulo indisponível.</p>';}else if(tab==="tarefas"){$("details").style.display="";$("details").style.width="";$("details").style.maxWidth="";$("details").style.minWidth="";$("items").style.display="";$("items").style.width="";$("items").style.maxWidth="";$("items").style.minWidth="";$("items").innerHTML=renderTarefas();rtLoadPeople();rtRefreshBoard();}else if(["documentos","comunicados","treinamentos","ferramentas","pcp","almoxarifado","qualidade","rh","seguranca"].includes(tab)){$("items").innerHTML=items.length?items.map(x=>{const url=recursoUrl(x)||"#";return '<article class="item">'+(/meister\s*task/i.test(String(x.nome||''))?'<div class="brand-meistertask" role="img" aria-label="MeisterTask"><span class="meistertask-mark">M</span><span class="meistertask-word">MeisterTask</span></div>':(x.imagem_url?'<img src="'+esc(x.imagem_url)+'" alt="">':'<div class="placeholder">Rodrinox Pro</div>'))+'<div class="body"><b>'+esc(x.nome)+'</b><p>'+esc(x.descricao||"")+'</p>'+(url!=="#"?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Abrir recurso ↗</a>':'<span>Sem link disponível</span>')+'</div></article>'}).join(""):'<p class="empty">Nenhum item disponível para seu perfil.</p>';}else if(tab==="aplicativos"){$("items").innerHTML='<article class="item"><div class="isic-app-visual" role="img" aria-label="Intelbras iSIC Lite"><div class="isic-app-icon"><svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect x="10" y="17" width="32" height="30" rx="7" fill="none" stroke="currentColor" stroke-width="5"/><path d="M42 27 55 20v24L42 37" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><circle cx="26" cy="32" r="7" fill="none" stroke="currentColor" stroke-width="4"/></svg></div><span class="isic-app-name">iSIC Lite</span></div><div class="body"><b>Intelbras iSIC Lite</b><p>Acesso ao aplicativo de câmeras. A abertura nativa depende do dispositivo.</p><a href="https://play.google.com/store/apps/details?id=com.intelbras.isiclite" target="_blank" rel="noopener noreferrer">Google Play</a></div></article>';}else if(tab==="suporte"){$("items").innerHTML='<article class="item"><div class="body"><b>Suporte / TI</b><p>Para solicitar atendimento, utilize o e-mail oficial de suporte da Rodrinox Pro.</p><p><a href="mailto:suporte@rodrinoxpro.com.br?subject=Solicita%C3%A7%C3%A3o%20de%20suporte%20TI%20-%20Rodrinox%20Pro">Enviar solicitação para suporte@rodrinoxpro.com.br ↗</a></p></div></article>';}else if(tab==="contatos"){mostrarContatos();}else{$("items").innerHTML='<p class="empty">Este módulo ainda não está habilitado para homologação.</p>';}}$("menuToggle").closest(".work").previousElementSibling.classList.remove("open");window.scrollTo(0,0);}
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

const moduleRoutes = {
  email: { url: "./email-corporativo.html?noPortal=1&v=assinatura-colaborador", title: "E-mail corporativo" },
  propostas: { url: "/colaborador/propostas-comerciais.html?noPortal=1", title: "Propostas Comerciais" }
};
const sidebar = document.querySelector(".side");
const work = document.querySelector(".work");
const portalModule = $("portalModule");
const moduleFrame = $("portalModuleFrame");
const portalMenuToggle = $("menuToggle");

function setPortalMenu(open) {
  sidebar.classList.toggle("open", open);
  portalMenuToggle.setAttribute("aria-expanded", String(open));
}

function closePortalModule() {
  if (portalModule.hidden) return;
  portalModule.hidden = true;
  work.classList.remove("module-open");
  moduleFrame.removeAttribute("src");
  sidebar.querySelector("a[data-module][aria-current]")?.removeAttribute("aria-current");
  if (Object.hasOwn(moduleRoutes, location.hash.slice(1))) {
    history.pushState(null, "", location.pathname + location.search);
  }
}

function openPortalModule() {
  const key = location.hash.slice(1);
  const route = Object.hasOwn(moduleRoutes, key) ? moduleRoutes[key] : null;
  if (!route) {
    if (!portalModule.hidden) openTab("inicio");
    return;
  }
  setPortalMenu(false);
  work.classList.add("module-open");
  portalModule.hidden = false;
  moduleFrame.title = route.title;
  if (moduleFrame.getAttribute("src") !== route.url) moduleFrame.src = route.url;
  for (const button of document.querySelectorAll("#menu button")) button.classList.remove("active");
  for (const link of sidebar.querySelectorAll("a[data-module]")) {
    if (link.dataset.module === key) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}

sidebar.addEventListener("click", event => {
  if (event.target.closest("a[data-module]")) setPortalMenu(false);
});
document.addEventListener("click", e => {
  const button = e.target.closest("[data-tab]");
  if (button && !button.hidden) {
    e.preventDefault();
    openTab(button.dataset.tab);
  }
});
portalMenuToggle.addEventListener("click", () => setPortalMenu(!sidebar.classList.contains("open")));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && sidebar.classList.contains("open")) {
    setPortalMenu(false);
    portalMenuToggle.focus();
  }
});
window.addEventListener("hashchange", openPortalModule);
openPortalModule();
function configureAdminMenu(user) {
  if (user.perfil !== "admin") return;
  const menu = $("portalAdminMenu");
  const environment = location.pathname.includes("/homologacao/") ? "homologacao" : "oficial";
  for (const link of menu.querySelectorAll("[data-admin-destino]")) {
    link.href = "/colaborador/painel/" + environment + "/" + link.dataset.adminDestino;
  }
  menu.hidden = false;
}

(async()=>{try{const me=await read("eu");if(window.aplicarPermissoesMenu)await window.aplicarPermissoesMenu();configureAdminMenu(me);gePerfil=me.perfil;if(document.querySelector('nav button[data-tab="gestao-empresarial"].active'))openTab("gestao-empresarial");$("user").textContent=me.nome||"Colaborador";$("firstName").textContent=(me.nome||"Colaborador").split(" ")[0];$("adminLink").hidden=me.perfil!=="admin";$("siteLink").hidden=me.perfil!=="admin";const items=await read("ferramentas");data=Array.isArray(items)?items:[];for(const [id,cat] of [["recent","comunicados"],["featured","treinamentos"]]){const arr=data.filter(x=>x.categoria===cat).slice(0,3);$(id).innerHTML=arr.length?arr.map(x=>{const url=recursoUrl(x);const image=x.imagem_url&&(/^https:\/\//i.test(x.imagem_url)||/^\/colaborador\/api\/site\/midias\/\d+\/arquivo$/.test(x.imagem_url))?x.imagem_url:null;const thumb=image?'<img class="resource-thumb" src="'+esc(image)+'" alt="Imagem do curso '+esc(x.nome)+'" loading="lazy">':'';return '<div class="recentItem '+(id==="featured"?"training-item":"")+'">'+thumb+'<div class="resource-info"><strong>'+esc(x.nome)+'</strong>'+(url?' <a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Abrir ↗</a>':' <span>Sem link cadastrado</span>')+'</div></div>';}).join(""):'<p class="empty">Nenhum item disponível ainda.</p>';}window.renderMyTrainings?.($("featured"),true);}catch(e){$("recent").textContent="Não foi possível consultar os recursos.";$("featured").textContent="Verifique sua sessão e tente novamente.";console.error(e);}})();

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


/* Rodrinox Tasks: protótipo interativo de homologação, com dados locais deste navegador.
   NÃO representa persistência multiusuário nem substitui a API protegida do servidor. */
const rtStoreKey="rodrinox-tasks-demo-v1";
const rtSeed={projects:[{id:1,name:"PCP — Projeto piloto"}],tasks:[
{id:1,projectId:1,title:"Conferir materiais da OP-1024",owner:"Frank",status:"a_fazer",due:"",manager:"Administrador",note:""},
{id:2,projectId:1,title:"Atualizar relatório de produção",owner:"Frank",status:"andamento",due:"",manager:"Administrador",note:""},
{id:3,projectId:1,title:"Validar documentação técnica",owner:"Administrador",status:"revisao",due:"",manager:"Administrador",note:""}]};
let rtState={projects:[],tasks:[]};
let rtTrash=[];
let rtAttachments={};
const rtSaveAttachments=()=>{};
async function rtLoadAttachments(){
 const tasks=rtState.tasks.filter(t=>rtCurrentUser?.perfil==="admin"||Number(t.ownerId)===Number(rtCurrentUser?.id)||Number(t.createdById)===Number(rtCurrentUser?.id));
 await Promise.all(tasks.map(async t=>{
  try{const r=await fetch("/colaborador/api/task-attachments/"+encodeURIComponent(t.id),{credentials:"same-origin",cache:"no-store"});if(r.ok)rtAttachments[t.id]=await r.json();}catch(e){console.warn("[anexos]",e)}
 }));
 rtDraw();
}
let rtSearch="",rtPriority="all",rtSort="default",rtProjectStatusFilter="todos";
let rtPeople=[],rtPeopleError="",rtPicker=null;
async function rtLoadPeople(){try{const result=await read("tarefas/responsaveis");if(!Array.isArray(result))throw Error("Resposta inválida");rtPeople=result.filter(p=>Number.isSafeInteger(Number(p.id))&&p.nome&&p.email);rtPeopleError="";}catch(e){rtPeople=[];rtPeopleError="Não foi possível carregar os colaboradores cadastrados.";console.error("[tarefas] diretório",e);}rtDraw();}
function rtOpenPicker(taskId,kind){rtPicker={taskId,kind};rtDraw();}
function rtPersonLabel(p){return p.nome+" · "+p.departamento+" · "+p.email;}
let rtHistoryOpen=null;
const rtActor=()=>rtCurrentUser?.nome||"Usuário";
function rtLog(task,event,details=""){(task.history??=[]).push({at:new Date().toISOString(),actor:rtActor(),event,details});}
function rtHistory(task){const history=task.history?.length?task.history:[{at:null,actor:"Demonstração",event:"Tarefa inicial do protótipo",details:"Eventos anteriores não foram registrados."}];return '<div class="rt-history-panel"><h4>Linha do tempo</h4>'+history.map(h=>'<div class="rt-history-event"><strong>'+esc(h.event)+'</strong><small>'+esc(h.actor)+' · '+(h.at?new Date(h.at).toLocaleString("pt-BR"):"Sem data")+'</small>'+(h.details?'<p>'+esc(h.details)+'</p>':"")+'</div>').join("")+'</div>';}
let rtView="admin",rtProject=0,rtPriorityPickerId=null;
const rtStatus={a_fazer:"A fazer",andamento:"Em andamento",revisao:"Em revisão",concluida:"Concluída"};
let rtTaskPolicy={grants:{},scope:"own"};
const rtCan=key=>rtCurrentUser?.perfil==="admin"||rtTaskPolicy.grants?.[key]===true;
let rtRevision=null,rtCurrentUser=null,rtSyncing=false,rtDirty=false,rtSharedReady=false,rtSyncError="",rtBoardMode="all",rtPermissionStamp="";
async function rtRefreshBoard(){
 if(rtSyncing||rtDirty||rtDraggingTask!==null)return;
 rtSyncing=true;
 try{const response=await fetch("/colaborador/api/tasks-official/board",{credentials:"same-origin",cache:"no-store"});
 if(!response.ok){const problem=await response.json().catch(()=>({}));throw Error("HTTP "+response.status+(problem.erro?" — "+problem.erro:""));}
 const data=await response.json();if(!data.state||!Array.isArray(data.state.projects)||!Array.isArray(data.state.tasks))throw Error("Resposta inválida");
 const policyStamp=JSON.stringify(data.permissions||{});
 if(rtRevision!==data.revision||!rtSharedReady||policyStamp!==rtPermissionStamp){
 rtState={projects:data.state.projects,tasks:data.state.tasks};rtTrash=Array.isArray(data.state.trash)?data.state.trash:[];
 rtRevision=data.revision;rtCurrentUser=data.user;rtTaskPolicy=data.permissions||{grants:{},scope:"own"};rtPermissionStamp=policyStamp;rtSharedReady=true;rtSyncError="";
 rtView=rtCan("tasks.priority")||rtCan("tasks.due")||rtCan("tasks.checklist")||rtCan("tasks.comment")||rtCan("tasks.assign")||rtCan("tasks.recurrence")?"admin":"frank";
 rtProject=rtState.projects.some(p=>p.id===rtProject)?rtProject:0;rtDraw();void rtLoadAttachments();
 }
 }catch(e){console.error("[tarefas] sincronização",e);rtSharedReady=false;rtSyncError=e.message||"Falha desconhecida";rtDraw();}
 finally{rtSyncing=false;}
}
const rtSave=()=>{
 if(!rtSharedReady||rtDirty){alert("Quadro não sincronizado. Aguarde a conexão antes de alterar.");return;}
 rtDirty=true;
 fetch("/colaborador/api/tasks-official/board",{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json","X-Portal":"1"},body:JSON.stringify({revision:rtRevision,state:{projects:rtState.projects,tasks:rtState.tasks,trash:Array.isArray(rtTrash)?rtTrash:[]}})})
 .then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.erro||"Erro "+r.status);rtRevision=data.revision;})
 .catch(e=>{alert("Alteração não salva: "+e.message+". O quadro será recarregado.");rtRevision=null;})
 .finally(()=>{rtDirty=false;rtRefreshBoard();});
};
setInterval(()=>{if(document.querySelector("#items .tasks-shell"))rtRefreshBoard();},10000);
function rtExportBackup(){
 const raw=localStorage.getItem(rtStoreKey);
 if(!raw){alert("Nenhum dado salvo neste navegador. Abra o navegador onde criou os projetos.");return;}
 let parsed;try{parsed=JSON.parse(raw)}catch{alert("Os dados locais não estão em formato válido. Não foram alterados.");return;}
 if(!Array.isArray(parsed.projects)||!Array.isArray(parsed.tasks)){alert("Formato de projetos/tarefas inesperado. Nenhum dado foi alterado.");return;}
 const payload={format:"rodrinox-tasks-backup-v1",exportedAt:new Date().toISOString(),origin:location.origin,projects:parsed.projects,tasks:parsed.tasks,attachments:rtAttachments,notes:"Backup de dados locais de homologação; anexos podem estar ausentes se a sessão original terminou."};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="rodrinox-tasks-backup-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}

const rtExpandedCards=new Set();
let rtDraggingTask=null;
function rtChangeStatus(id,status){
 const task=rtState.tasks.find(t=>t.id===id);
 if(!task||!Object.hasOwn(rtStatus,status)||task.status===status){rtDraw();return;}
 if(!rtCan("tasks.status")||!rtSharedReady||rtDirty||rtSyncing){
  alert(!rtCan("tasks.status")?"Seu perfil não permite alterar o status.":"Aguarde a sincronização antes de alterar o status.");
  rtDraw();return;
 }
 const previous=task.status;
 task.status=status;
 rtLog(task,"Status alterado",rtStatus[previous]+" → "+rtStatus[status]);
 rtSave();rtDraw();
}
document.addEventListener("toggle",e=>{
 const card=e.target;
 if(!card.matches?.("details.rt-task-card")||!card.isConnected)return;
 const id=Number(card.dataset.taskId);
 if(card.open)rtExpandedCards.add(id);
 else rtExpandedCards.delete(id);
},true);
document.addEventListener("dragstart",e=>{
 const handle=e.target.closest?.(".rt-task-title[draggable=true]");
 if(!handle||!e.dataTransfer)return;
 if(!rtCan("tasks.status")||!rtSharedReady||rtDirty||rtSyncing){e.preventDefault();return;}
 const card=handle.closest(".rt-task-card");
 rtDraggingTask=Number(card.dataset.taskId);
 e.dataTransfer.effectAllowed="move";
 e.dataTransfer.setData("text/plain",handle.textContent);
});
function rtClearDrag(){
 rtDraggingTask=null;
 document.querySelectorAll(".rt-drop-active").forEach(column=>column.classList.remove("rt-drop-active"));
}
document.addEventListener("dragend",rtClearDrag);
document.addEventListener("dragover",e=>{
 const column=e.target.closest?.(".tasks-column[data-task-status]");
 if(!column||rtDraggingTask===null)return;
 e.preventDefault();
 e.dataTransfer.dropEffect="move";
 column.classList.add("rt-drop-active");
});
document.addEventListener("dragleave",e=>{
 const column=e.target.closest?.(".rt-drop-active");
 if(column&&!column.contains(e.relatedTarget))column.classList.remove("rt-drop-active");
});
document.addEventListener("drop",e=>{
 if(rtDraggingTask===null)return;
 const column=e.target.closest?.(".tasks-column[data-task-status]");
 const id=rtDraggingTask;
 rtClearDrag();
 if(!column)return;
 e.preventDefault();
 rtChangeStatus(id,column.dataset.taskStatus);
});

function rtDraw(){const root=document.querySelector("#items .tasks-shell");if(root)root.outerHTML=renderTarefas();}
let rtProjectDialogId=null,rtProjectHistoryId=null;
function rtProjectAudit(p,action,detail){(p.history??=[]).push({at:new Date().toISOString(),actor:rtActor(),action,detail});}
function rtTaskForm(t){document.getElementById("rt-task-overlay")?.remove();const overlay=document.createElement("div");overlay.id="rt-task-overlay";overlay.className="rt-project-overlay";overlay.innerHTML='<form id="rt-task-form" class="rt-project-form" data-task-id="'+(t?.id||0)+'"><div class="rt-form-header"><h3>'+(t?"Editar tarefa":"Nova tarefa")+'</h3><button type="button" class="rt-task-cancel" aria-label="Fechar">✕</button></div>'+(t?'':'<label>Descrição da tarefa<input name="title" required maxlength="220" placeholder="O que precisa ser feito?"></label>')+'<label>Prazo de conclusão (opcional)<input type="date" name="due" value="'+esc(t?.due||"")+'"></label><small>Selecione a data no calendário ou deixe em branco para definir depois.</small><div class="rt-form-actions"><button type="button" class="rt-task-cancel">Cancelar</button><button type="submit">Salvar tarefa</button></div></form>';document.body.appendChild(overlay);overlay.querySelector(t?'[name="due"]':'[name="title"]').focus();}
function rtProjectForm(p){rtProjectDialogId=p?.id||0;const overlay=document.createElement("div");overlay.id="rt-project-overlay";overlay.className="rt-project-overlay";overlay.innerHTML='<form id="rt-project-form" class="rt-project-form"><div class="rt-form-header"><h3>'+(p?"Editar projeto":"Novo projeto")+'</h3><button type="button" id="rt-project-cancel" aria-label="Fechar">✕</button></div><label>Nome do projeto<input name="name" required maxlength="160" value="'+esc(p?.name||"")+'"></label><label>Descrição do projeto<textarea name="description" rows="4" maxlength="2000" placeholder="Objetivo, escopo e informações principais...">'+esc(p?.description||"")+'</textarea></label><div class="rt-form-dates"><label>Data de início<input type="date" name="startDate" value="'+esc(p?.startDate||"")+'"></label><label>Prazo de entrega<input type="date" name="endDate" value="'+esc(p?.endDate||"")+'"></label></div><div class="rt-form-actions"><button type="button" id="rt-project-cancel-bottom">Cancelar</button><button type="submit">Salvar projeto</button></div></form>';document.body.appendChild(overlay);overlay.querySelector('[name="name"]').focus();}
function rtProjectHistory(p){const history=(p.history||[]).slice().reverse();return '<div class="rt-project-history"><strong>Histórico de alterações do projeto</strong>'+(history.length?history.map(h=>'<div class="rt-project-history-item"><strong>'+esc(h.action)+'</strong><small>'+esc(h.actor)+' · '+new Date(h.at).toLocaleString("pt-BR")+'</small><p>'+esc(h.detail)+'</p></div>').join(""):'<small>Nenhuma alteração registrada nesta versão.</small>')+'</div>';}
function rtParticipatingProjects(){return rtState.projects.filter(p=>!p.archivedAt).filter(p=>(rtBoardMode==="all"&&rtCurrentUser?.perfil==="admin")||rtState.tasks.some(t=>t.projectId===p.id&&Number(t.ownerId)===Number(rtCurrentUser?.id)));}
function rtValidDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+"T12:00:00"));}
function rtDateLabel(v){if(!rtValidDate(v||""))return "Não definida";const [y,m,d]=v.split("-");return d+"/"+m+"/"+y;}
function rtProjectColor(p){const tasks=rtState.tasks.filter(t=>t.projectId===p.id);if(tasks.length&&tasks.every(t=>t.status==="concluida"))return "concluido";const today=new Date();const localToday=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),String(today.getDate()).padStart(2,"0")].join("-");if(p.endDate&&p.endDate<localToday)return "atrasado";if(p.startDate&&p.startDate>localToday)return "nao-iniciado";return tasks.some(t=>t.status!=="a_fazer")||p.startDate&&p.startDate<=localToday?"andamento":"nao-iniciado";}
const rtColorLabels={"concluido":"Concluído","atrasado":"Atrasado","nao-iniciado":"Não iniciado","andamento":"Em andamento"};
function rtProjectStatus(p){const tasks=rtState.tasks.filter(t=>t.projectId===p.id);if(tasks.length&&tasks.every(t=>t.status==="concluida"))return "concluidos";if(tasks.some(t=>t.status!=="a_fazer"))return "andamento";return "abertos";}
function rtProjectSummary(){const projects=rtParticipatingProjects();const counts={todos:projects.length,abertos:0,andamento:0,concluidos:0};for(const p of projects)counts[rtProjectStatus(p)]++;const cards=[["todos","Total de projetos"],["abertos","Em aberto"],["andamento","Em andamento"],["concluidos","Concluídos"]];return '<section class="rt-summary"><div class="rt-summary-heading"><strong>'+(rtBoardMode==="mine"?"Projetos com tarefas atribuídas a mim":"Visão geral dos projetos") +'</strong><small>'+(rtView==="frank"?"Projetos em que Frank participa (simulação)":"Todos os projetos da demonstração")+'</small></div><div class="rt-summary-grid">'+cards.map(([key,label])=>'<button type="button" class="rt-summary-card'+(rtProjectStatusFilter===key?" is-selected":"")+'" data-status="'+key+'" aria-pressed="'+(rtProjectStatusFilter===key)+'"><small>'+label+'</small><strong>'+counts[key]+'</strong><span>'+ (key==="todos"?"Visualizar todos": "Filtrar projetos")+'</span></button>').join("")+'</div></section>';}
function rtProjectProgress(){const participating=rtParticipatingProjects();const projects=participating.filter(p=>(!rtProject||p.id===rtProject)&&(rtProjectStatusFilter==="todos"||rtProjectStatus(p)===rtProjectStatusFilter));return '<section class="rt-progress-section"><strong>Progresso dos projetos</strong><small>Percentual calculado sobre todas as tarefas de cada projeto</small><div class="rt-color-legend"><span class="rt-legend-nao-iniciado">● Azul: não iniciado</span><span class="rt-legend-andamento">● Amarelo: em andamento</span><span class="rt-legend-atrasado">● Vermelho: atrasado</span><span class="rt-legend-concluido">● Verde: concluído</span></div><div class="rt-progress-grid">'+(projects.length?projects.map(p=>{const tasks=rtState.tasks.filter(t=>t.projectId===p.id);const total=tasks.length,done=tasks.filter(t=>t.status==="concluida").length,percent=total?Math.round(done*100/total):0;const color=rtProjectColor(p);return '<article class="rt-progress-card rt-project-'+color+'"><div class="rt-progress-top"><strong>'+esc(p.name)+'</strong><span>'+percent+'%</span></div><details class="rt-project-description-toggle"><summary>Descrição do projeto</summary><p>'+esc(p.description||"Nenhuma descrição cadastrada. Use Editar projeto para informar o objetivo.")+'</p></details><span class="rt-project-status">'+rtColorLabels[color]+'</span><div class="rt-project-dates"><small>Início: '+rtDateLabel(p.startDate)+'</small><small>Entrega: '+rtDateLabel(p.endDate)+'</small></div><div class="rt-progress-track" role="progressbar" aria-label="Progresso do projeto" aria-valuenow="'+percent+'" aria-valuemin="0" aria-valuemax="100"><div style="width:'+percent+'%"></div></div><small>'+done+' de '+total+' tarefas concluídas · '+(total-done)+' restantes'+(total===0?' · Sem tarefas cadastradas':'')+'</small><div class="rt-project-actions"><button type="button" class="rt-progress-select" data-project="'+p.id+'">Visualizar projeto</button><button type="button" class="rt-project-dates-edit" data-project="'+p.id+'">Editar projeto</button><button type="button" class="rt-project-history-btn" data-project="'+p.id+'">Histórico</button></div>'+(rtProjectHistoryId===p.id?rtProjectHistory(p):"")+'</article>';}).join(""):'<p class="rt-no-projects">Nenhum projeto nesta situação.</p>')+'</div></section>';}
let rtWorkspaceView="board";
function rtProjectFocus(project){
 if(!project)return "";
 const tasks=rtState.tasks.filter(task=>task.projectId===project.id);
 const done=tasks.filter(task=>task.status==="concluida").length;
 const percent=tasks.length?Math.round(done*100/tasks.length):0;
 const color=rtProjectColor(project);
 return `<section class="rt-project-focus rt-project-${color}" aria-label="Projeto selecionado">
  <div><span class="rt-project-status">${rtColorLabels[color]}</span><h3>${esc(project.name)}</h3>
   <div class="rt-project-dates"><small>Início: ${rtDateLabel(project.startDate)}</small><small>Entrega: ${rtDateLabel(project.endDate)}</small></div>
   <details class="rt-project-description-toggle"><summary>Descrição e histórico</summary>
    <p>${esc(project.description||"Sem descrição cadastrada.")}</p>${rtProjectHistory(project)}</details>
  </div>
  <div class="rt-focus-progress"><div class="rt-progress-top"><small>Progresso do projeto</small><span>${percent}%</span></div>
   <div class="rt-progress-track" role="progressbar" aria-label="Progresso do projeto" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><div style="width:${percent}%"></div></div>
   <small>${done} de ${tasks.length} tarefas concluídas</small>
  </div>
  <div class="rt-focus-actions">
   ${rtCan("tasks.create")?'<button type="button" class="rt-focus-create">+ Nova tarefa</button>':""}
   ${rtCan("projects.edit")?'<button type="button" class="rt-project-dates-edit" data-project="'+project.id+'">Editar projeto</button>':""}
   <button type="button" class="rt-focus-all">Todos os projetos</button>
  </div>
 </section>`;
}
const rtPriorityLabels={baixa:"Baixa",normal:"Normal",alta:"Alta",urgente:"Urgente"};
function rtTaskCardHeading(task){
 const priority=Object.hasOwn(rtPriorityLabels,task.priority)?task.priority:"normal";
 return `<details class="rt-task-card" data-task-id="${task.id}" data-priority="${priority}"${rtExpandedCards.has(task.id)?" open":""}><summary class="rt-task-title" draggable="${rtCan("tasks.status")}">${esc(task.title)} <span class="rt-task-priority-label">${rtPriorityLabels[priority]}</span></summary>`;
}
function rtCloneTask(source){
 if(!rtCan("tasks.create"))return;
 if(!rtSharedReady||rtDirty||rtSyncing){alert("Aguarde a sincronização antes de clonar a tarefa.");return;}
 let id=Date.now();
 while(rtState.tasks.some(task=>task.id===id))id++;
 const actor=rtActor();
 const copy={
  id,projectId:source.projectId,title:source.title,note:source.note||"",
  due:source.due||"",priority:source.priority||"normal",status:"a_fazer",
  owner:actor,ownerId:rtCurrentUser.id,ownerEmail:rtCurrentUser.email||"",
  createdBy:actor,createdById:rtCurrentUser.id,manager:actor,
  checklist:(source.checklist||[]).map(({text})=>({text,done:false})),comments:[]
 };
 rtLog(copy,"Tarefa clonada","Origem: "+source.title+" (#"+source.id+")");
 rtState.tasks.push(copy);
 rtSave();
 if(rtCan("tasks.assign")){
  rtExpandedCards.add(copy.id);
  rtOpenPicker(copy.id,"delegate");
 }else rtDraw();
}
function renderTarefas(){
 const visible=rtState.tasks.filter(t=>rtState.projects.some(p=>p.id===t.projectId&&!p.archivedAt)).filter(t=>(!rtProject||t.projectId===rtProject)&&(rtBoardMode==="all"?rtCurrentUser?.perfil==="admin"||rtParticipatingProjects().some(p=>p.id===t.projectId):Number(t.ownerId)===Number(rtCurrentUser?.id)));
 const filtered=visible.filter(t=>(!rtSearch||(t.title+" "+(t.note||"")+" "+t.owner).toLowerCase().includes(rtSearch.toLowerCase()))&&(rtPriority==="all"||(t.priority||"normal")===rtPriority));if(rtSort==="due")filtered.sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999"));const total=filtered.length,done=filtered.filter(t=>t.status==="concluida").length;
 return '<section class="tasks-shell"><div class="tasks-heading"><div><span class="tasks-eyebrow">RODRINOX TASKS · OFICIAL</span><h2>Gestão de Tarefas</h2><p>Delegue, acompanhe e receba as tarefas concluídas.</p></div><span class="tasks-connection">'+(rtSharedReady?'Dados compartilhados · atualização a cada 10 s':'Conectando ao servidor…')+'</span></div>'+
 '<div class="tasks-toolbar"><button type="button" id="rt-mode-mine" aria-pressed="'+(rtBoardMode==="mine")+'">Minhas tarefas (atribuídas a mim)</button><button type="button" id="rt-mode-all" aria-pressed="'+(rtBoardMode==="all")+'">'+(rtCurrentUser?.perfil==="admin"?"Todos os projetos":"Projetos em que participo")+'</button><label>Visualizar como <select id="rt-view"><option value="admin"'+(rtView==="admin"?" selected":"")+'>Administrador</option><option value="frank"'+(rtView==="frank"?" selected":"")+'>Frank (simulação)</option></select></label><label>Projeto <select id="rt-project"><option value="0">Todos os projetos</option>'+rtState.projects.filter(p=>!p.archivedAt).map(p=>'<option value="'+p.id+'"'+(rtProject===p.id?" selected":"")+'>'+esc(p.name)+'</option>').join("")+'</select></label><button type="button" id="rt-new-project"'+(rtCan("projects.create")?"":" disabled")+'>+ Novo projeto</button><button type="button" id="rt-new-task"'+(rtCan("tasks.create")?"":" disabled")+'>+ Nova tarefa</button><button type="button" id="rt-export-backup" title="Salvar cópia dos projetos e tarefas antes da migração">Exportar backup</button>'+(rtCurrentUser?.perfil==="admin"?'<button type="button" id="rt-archive-project" '+(rtProject?"":"disabled")+'>Arquivar projeto</button><button type="button" id="rt-archive-view">Projetos arquivados ('+rtState.projects.filter(p=>p.archivedAt).length+')</button><button type="button" id="rt-trash-project" '+(rtProject?"":"disabled")+' style="color:#ff9a90">Mover projeto para lixeira</button><button type="button" id="rt-trash-view">Lixeira ('+rtTrash.filter(x=>x.kind==="project").length+')</button>':"")+'</div>'+
 '<div class="rt-workspace-switch" role="group" aria-label="Visualização"><button type="button" data-rt-workspace="board" aria-pressed="'+(rtWorkspaceView==="board")+'">Quadro</button><button type="button" data-rt-workspace="projects" aria-pressed="'+(rtWorkspaceView==="projects")+'">Projetos</button></div>'+
 (rtWorkspaceView==="projects" ? rtProjectSummary()+rtProjectProgress() :
 rtProjectFocus(rtParticipatingProjects().find(p=>p.id===rtProject))+
 '<div class="rt-filterbar"><label>Buscar <input id="rt-search" placeholder="Título, responsável, descrição..." value="'+esc(rtSearch)+'"></label><label>Prioridade <select id="rt-priority"><option value="all">Todas</option>'+["baixa","normal","alta","urgente"].map(p=>'<option value="'+p+'"'+(rtPriority===p?" selected":"")+'>'+p+'</option>').join("")+'</select></label><label>Ordenação <select id="rt-sort"><option value="default">Padrão</option><option value="due"'+(rtSort==="due"?" selected":"")+'>Prazo mais próximo</option></select></label></div><div class="tasks-stats"><div><small>Tarefas visíveis</small><strong>'+total+'</strong></div><div><small>Pendentes</small><strong>'+filtered.filter(t=>t.status!=="concluida").length+'</strong></div><div><small>Em andamento</small><strong>'+filtered.filter(t=>t.status==="andamento").length+'</strong></div><div><small>Concluídas</small><strong>'+done+'</strong></div></div>'+
 '<div class="tasks-board">'+Object.entries(rtStatus).map(([key,label])=>'<div class="tasks-column" data-task-status="'+key+'"><h3>'+label+' <small>'+filtered.filter(t=>t.status===key).length+'</small></h3>'+filtered.filter(t=>t.status===key).map(t=>rtTaskCardHeading(t)+'<article class="rt-card rt-priority-'+(["baixa","normal","alta","urgente"].includes(t.priority)?t.priority:"normal")+'"><div class="rt-card-heading"><span class="rt-priority-badge">'+({baixa:"Baixa",normal:"Normal",alta:"Alta",urgente:"Urgente"}[t.priority]||"Normal")+'</span></div><small>'+esc(rtState.projects.find(p=>p.id===t.projectId)?.name||"Projeto")+'</small><small>Responsável: '+esc(t.owner)+'</small><div class="rt-task-deadlines"><small>Prazo do projeto: '+rtDateLabel(rtState.projects.find(p=>p.id===t.projectId)?.endDate) .replace("Não definida","—")+'</small><small>Prazo da tarefa: '+rtDateLabel(t.due).replace("Não definida","—")+'</small></div>'+(t.note?'<small>'+esc(t.note)+'</small>':'')+(t.repeat?'<small>Recorrência: '+esc(t.repeat)+'</small>':'')+((t.comments||[]).length?'<details class="rt-comments-details"><summary>Visualizar comentários <span class="rt-comments-count">'+t.comments.length+'</span></summary><div class="rt-comments-list">'+t.comments.map(c=>'<small class="rt-comment">'+esc(c)+'</small>').join("")+'</div></details>':'')+(t.checklist||[]).map((c,i)=>'<div class="rt-check rt-check-row" style="display:flex;align-items:center;gap:6px"><input type="checkbox" aria-label="Concluir item" class="rt-check-toggle" data-id="'+t.id+'" data-index="'+i+'"'+(c.done?" checked":"")+'><span class="rt-check-text" tabindex="0" data-id="'+t.id+'" data-index="'+i+'" style="flex:1;overflow-wrap:anywhere">'+esc(c.text)+'</span>'+(rtCan("tasks.checklist")?'<span class="rt-check-actions" style="display:none;gap:4px"><button type="button" class="rt-check-edit" title="Editar item" aria-label="Editar item" data-id="'+t.id+'" data-index="'+i+'">✎</button><button type="button" class="rt-check-delete" title="Excluir item" aria-label="Excluir item" style="color:#b42318" data-id="'+t.id+'" data-index="'+i+'">🗑</button></span>':'')+'</div>').join("")+'<div class="rt-attachments"><strong>Anexos e documentos</strong>'+(rtAttachments[t.id]||[]).map((a,i)=>'<div class="rt-attachment-row"><span title="'+esc(a.name)+'">'+esc(a.name)+' · '+Math.round(a.size/1024)+' KB</span><button type="button" class="rt-download" data-id="'+t.id+'" data-index="'+i+'">Baixar</button><button type="button" class="rt-remove-file" data-id="'+t.id+'" data-index="'+i+'">Excluir</button></div>').join("")+'<label class="rt-upload-label">+ Anexar documentos<input class="rt-upload" type="file" data-id="'+t.id+'" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx" multiple></label><small>Arquivos de até 10 MB; anexos armazenados no servidor.</small></div>'+'<label>Status <select class="rt-status" data-id="'+t.id+'">'+Object.entries(rtStatus).map(([v,n])=>'<option value="'+v+'"'+(v===t.status?" selected":"")+'>'+n+'</option>').join("")+'</select></label>'+(rtView==="admin"?'<button type="button" class="rt-delegate" data-id="'+t.id+'">Prazo de conclusão</button><button type="button" class="rt-priority-btn" data-id="'+t.id+'" aria-expanded="'+(rtPriorityPickerId===t.id)+'">Prioridade</button>'+(rtPriorityPickerId===t.id?'<div class="rt-priority-picker" role="group" aria-label="Selecionar prioridade da tarefa">'+["baixa","normal","alta","urgente"].map(p=>'<button type="button" class="rt-priority-choice rt-choice-'+p+'" data-id="'+t.id+'" data-priority="'+p+'" aria-pressed="'+((t.priority||"normal")===p)+'"><span class="rt-choice-dot"></span>'+({baixa:"Baixa",normal:"Normal",alta:"Alta",urgente:"Urgente"}[p])+'</button>').join("")+'</div>':'')+'<button type="button" class="rt-checklist-add" data-id="'+t.id+'">+ Checklist</button><button type="button" class="rt-comment-add" data-id="'+t.id+'">+ Comentário</button><button type="button" class="rt-recurring" data-id="'+t.id+'">Recorrência</button><button type="button" class="rt-history-btn" data-id="'+t.id+'">Histórico ('+(t.history?.length||0)+')</button><button type="button" class="rt-handoff" data-id="'+t.id+'">Concluir etapa e encaminhar</button>':'')+(rtPicker?.taskId===t.id?'<div class="rt-person-picker"><strong>'+(rtPicker.kind==="handoff"?"Encaminhar próxima etapa":"Selecionar responsável")+'</strong><label>Colaborador cadastrado <select class="rt-person-select"><option value="">Selecione um colaborador</option>'+rtPeople.map(p=>'<option value="'+p.id+'">'+esc(rtPersonLabel(p))+'</option>').join("")+'</select></label>'+(rtPeopleError?'<small>'+esc(rtPeopleError)+'</small>':"")+(!rtPeople.length&&!rtPeopleError?'<small>Nenhum colaborador ativo encontrado.</small>':"")+'<div class="rt-picker-actions"><button type="button" class="rt-person-confirm" data-id="'+t.id+'"'+(!rtPeople.length?" disabled":"")+'>Confirmar</button><button type="button" class="rt-person-cancel" data-id="'+t.id+'">Cancelar</button></div></div>':"")+(rtCan("tasks.create")?'<button type="button" class="rt-clone-task" data-id="'+t.id+'">Clonar tarefa</button>':"")+(rtCurrentUser?.perfil==="admin"?'<button type="button" class="rt-rename-task" data-id="'+t.id+'">✎ Renomear tarefa</button>':"")+(rtCan("tasks.delete")?'<button type="button" class="rt-delete-task" style="color:#b42318;background:#fff1f0;border:1px solid #efb4af" data-id="'+t.id+'">🗑 Excluir tarefa</button>':"")+(rtHistoryOpen===t.id?rtHistory(t):"")+'</article></details>').join("")+(filtered.some(t=>t.status===key)?"":'<p class="rt-empty">Nenhuma tarefa</p>')+'</div>').join("")+'</div>')+
 '<p class="tasks-note">'+(rtSharedReady?'Quadro compartilhado no servidor. As tarefas pessoais são filtradas pelo usuário autenticado.':'Sincronização indisponível: '+esc(rtSyncError||'aguardando resposta')+'. Não faça alterações até restabelecer a conexão.')+'</p></section>';
}
document.addEventListener("change",async e=>{
 if(e.target.classList.contains("rt-upload")){
  if(!rtCan("tasks.attachments.upload")){alert("Seu perfil não permite anexar documentos.");return;}
  const id=Number(e.target.dataset.id);
  for(const file of Array.from(e.target.files||[])){
   if(file.size>10*1024*1024){alert(file.name+": limite de 10 MB.");continue;}
   const data=new FormData();data.append("arquivo",file);
   try{
    const r=await fetch("/colaborador/api/task-attachments/"+encodeURIComponent(id),{method:"POST",credentials:"same-origin",headers:{"X-Portal":"1"},body:data});
    const result=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(result.erro||"Erro "+r.status);
   }catch(error){alert("Não foi possível anexar "+file.name+": "+error.message);}
  }
  e.target.value="";
  await rtLoadAttachments();return;
 }
 if(e.target.id==="rt-search"){rtSearch=e.target.value;rtDraw();}
 if(e.target.id==="rt-priority"){rtPriority=e.target.value;rtDraw();}
 if(e.target.id==="rt-sort"){rtSort=e.target.value;rtDraw();}
 if(e.target.classList.contains("rt-check-toggle")){const t=rtState.tasks.find(x=>x.id===Number(e.target.dataset.id));const c=t?.checklist?.[Number(e.target.dataset.index)];if(c){c.done=e.target.checked;rtLog(t,"Checklist atualizado",(c.done?"Concluiu: ":"Reabriu: ")+c.text);rtSave();rtDraw();}}
 if(e.target.id==="rt-view"){if(!rtCan("tasks.priority")&&!rtCan("tasks.assign"))return;rtView=e.target.value;rtProject=0;rtProjectStatusFilter="todos";rtDraw();}
 if(e.target.id==="rt-project"){rtProject=Number(e.target.value);rtProjectStatusFilter="todos";rtWorkspaceView="board";rtDraw();}
 if(e.target.classList.contains("rt-status"))rtChangeStatus(Number(e.target.dataset.id),e.target.value);
});
function rtEditChecklistItem(id,index,remove=false){if(!rtCan("tasks.checklist"))return;if(!rtSharedReady||rtDirty||rtSyncing)return alert("Aguarde a sincronização.");const t=rtState.tasks.find(x=>x.id===Number(id)),c=t?.checklist?.[Number(index)];if(!c)return;if(remove){if(!confirm("Excluir o item "+c.text+"?"))return;t.checklist.splice(Number(index),1);rtLog(t,"Item do checklist excluído",c.text);}else{const v=prompt("Editar item do checklist:",c.text);if(v===null||!v.trim()||v.trim()===c.text)return;const old=c.text;c.text=v.trim().slice(0,200);rtLog(t,"Item do checklist editado",old+" → "+c.text);}rtSave();rtDraw();}
const rtCheckStyle=document.createElement("style");rtCheckStyle.textContent=".rt-check-row:hover .rt-check-actions,.rt-check-row:focus-within .rt-check-actions,.rt-check-row.rt-check-open .rt-check-actions{display:inline-flex!important}.rt-check-row .rt-check-actions button{width:auto!important;min-width:24px;padding:2px 5px!important}.rt-check-text{cursor:pointer}";document.head.appendChild(rtCheckStyle);
document.addEventListener("dblclick",e=>{const x=e.target.closest(".rt-check-text");if(x)rtEditChecklistItem(x.dataset.id,x.dataset.index);});
document.addEventListener("click",e=>{
 const x=e.target.closest(".rt-check-text");if(x){x.closest(".rt-check-row").classList.toggle("rt-check-open");return;}
 const b=e.target.closest("button");if(!b)return;
 if(b.classList.contains("rt-check-edit")||b.classList.contains("rt-check-delete")){rtEditChecklistItem(b.dataset.id,b.dataset.index,b.classList.contains("rt-check-delete"));return;}
 if(b.id==="rt-archive-project"||b.id==="rt-archive-view"||b.classList.contains("rt-unarchive-project")){if(rtCurrentUser?.perfil!=="admin"||!rtSharedReady||rtDirty||rtSyncing)return;if(b.id==="rt-archive-project"){const p=rtState.projects.find(p=>p.id===rtProject&&!p.archivedAt);if(!p||!confirm("Arquivar o projeto "+p.name+"? Suas tarefas e histórico serão preservados."))return;p.archivedAt=new Date().toISOString();rtProjectAudit(p,"Projeto arquivado","Retirado do quadro ativo");rtProject=0;rtSave();rtDraw();return;}if(b.classList.contains("rt-unarchive-project")){const p=rtState.projects.find(p=>String(p.id)===b.dataset.id&&p.archivedAt);if(!p)return;delete p.archivedAt;rtProjectAudit(p,"Projeto desarquivado","Retornou ao quadro ativo");document.getElementById("rt-archive-overlay")?.remove();rtSave();rtDraw();return;}document.getElementById("rt-archive-overlay")?.remove();const overlay=document.createElement("div");overlay.id="rt-archive-overlay";overlay.className="rt-project-overlay";const archived=rtState.projects.filter(p=>p.archivedAt);overlay.innerHTML='<div class="rt-project-form" style="max-height:80vh;overflow:auto"><h3>Projetos arquivados</h3>'+(archived.length?archived.map(p=>'<details><summary>'+esc(p.name)+'</summary><small>Arquivado em '+new Date(p.archivedAt).toLocaleDateString("pt-BR")+'</small><p>'+esc(p.description||"")+'</p>'+rtState.tasks.filter(t=>t.projectId===p.id).map(t=>'<details><summary>'+esc(t.title)+' · '+esc(rtStatus[t.status]||t.status)+'</summary><p>Responsável: '+esc(t.owner||"")+'</p>'+ (t.comments||[]).map(c=>'<p>'+esc(c)+'</p>').join("")+rtHistory(t)+'</details>').join("")+rtProjectHistory(p)+'<button type="button" class="rt-unarchive-project" data-id="'+p.id+'">Desarquivar projeto</button></details>').join(""):'<p>Nenhum projeto arquivado.</p>')+'<button type="button" id="rt-archive-close">Fechar</button></div>';document.body.append(overlay);overlay.querySelector("#rt-archive-close").onclick=()=>overlay.remove();return;}
 if(["rt-trash-project","rt-trash-view","rt-trash-restore"].includes(b.id)||b.classList.contains("rt-trash-restore")){if(rtCurrentUser?.perfil!=="admin"||!rtSharedReady||rtDirty||rtSyncing)return;if(b.id==="rt-trash-project"){const p=rtState.projects.find(p=>p.id===rtProject);if(!p||!confirm("Mover o projeto "+p.name+" e suas tarefas para a lixeira por 30 dias?"))return;rtTrash.push({kind:"project",project:p,tasks:rtState.tasks.filter(t=>t.projectId===p.id),deletedAt:new Date().toISOString()});rtState.projects=rtState.projects.filter(x=>x.id!==p.id);rtState.tasks=rtState.tasks.filter(t=>t.projectId!==p.id);rtProject=0;rtSave();rtDraw();return;}if(b.classList.contains("rt-trash-restore")){const entry=rtTrash.find(x=>x.kind==="project"&&String(x.project.id)===b.dataset.id);if(!entry||Date.now()-Date.parse(entry.deletedAt)>=2592000000)return alert("Prazo de restauração encerrado.");if(rtState.projects.some(p=>p.id===entry.project.id)||entry.tasks.some(t=>rtState.tasks.some(x=>x.id===t.id)))return alert("Identificador já existente.");rtState.projects.push(entry.project);rtState.tasks.push(...entry.tasks);rtTrash=rtTrash.filter(x=>x!==entry);document.getElementById("rt-trash-overlay")?.remove();rtSave();rtDraw();return;}document.getElementById("rt-trash-overlay")?.remove();const overlay=document.createElement("div");overlay.id="rt-trash-overlay";overlay.className="rt-project-overlay";overlay.innerHTML='<div class="rt-project-form"><h3>Lixeira de projetos</h3>'+rtTrash.filter(x=>x.kind==="project").map(x=>'<div><strong>'+esc(x.project.name)+'</strong><small> · '+Math.max(0,Math.ceil((Date.parse(x.deletedAt)+2592000000-Date.now())/86400000))+' dias restantes</small><button type="button" class="rt-trash-restore" data-id="'+x.project.id+'">Restaurar</button></div>').join("")+'<button type="button" id="rt-trash-close">Fechar</button></div>';document.body.append(overlay);overlay.querySelector("#rt-trash-close").onclick=()=>overlay.remove();return;}
 if(b.id==="rt-mode-mine"||b.id==="rt-mode-all"){rtBoardMode=b.id==="rt-mode-mine"?"mine":"all";rtProject=0;rtProjectStatusFilter="todos";rtDraw();return;}
  if(b.classList.contains("rt-download")){const a=rtAttachments[Number(b.dataset.id)]?.[Number(b.dataset.index)];if(a){const link=document.createElement("a");link.href="/colaborador/api/task-attachments/"+encodeURIComponent(b.dataset.id)+"/"+encodeURIComponent(a.id)+"/download";link.download=a.name;document.body.appendChild(link);link.click();link.remove();}return;}
 if(b.classList.contains("rt-remove-file")){if(!rtCan("tasks.attachments.delete")){alert("Seu perfil não permite excluir documentos anexados.");return;}const a=rtAttachments[Number(b.dataset.id)]?.[Number(b.dataset.index)];if(!a)return;fetch("/colaborador/api/task-attachments/"+encodeURIComponent(b.dataset.id)+"/"+encodeURIComponent(a.id),{method:"DELETE",credentials:"same-origin",headers:{"X-Portal":"1"}}).then(async r=>{if(!r.ok)throw Error((await r.json().catch(()=>({})).erro)||"Erro "+r.status);await rtLoadAttachments();}).catch(e=>alert("Falha ao excluir anexo: "+e.message));return;}
 if(b.classList.contains("rt-history-btn")){const id=Number(b.dataset.id);rtHistoryOpen=rtHistoryOpen===id?null:id;rtDraw();return;}
 if(b.classList.contains("rt-handoff")){rtOpenPicker(Number(b.dataset.id),"handoff");return;}
 if(b.classList.contains("rt-person-cancel")){rtPicker=null;rtDraw();return;}
 if(b.classList.contains("rt-person-confirm")){
   if(!rtSharedReady||rtDirty||rtSyncing)return alert("Aguarde a sincronização antes de delegar.");
   const t=rtState.tasks.find(x=>x.id===Number(b.dataset.id));if(!t||!rtPicker||rtPicker.taskId!==t.id)return;
   const selector=document.querySelector(".rt-person-select");const person=rtPeople.find(p=>p.id===Number(selector?.value));if(!person)return alert("Selecione um colaborador cadastrado.");
   let note="";if(rtPicker.kind==="handoff"){const response=prompt("Descreva a etapa concluída (opcional):","");if(response===null)return;note=response.trim().slice(0,600);}
   const previous=t.owner;t.owner=person.nome;t.ownerId=person.id;t.ownerEmail=person.email;
   if(rtPicker.kind==="handoff"){t.status="a_fazer";rtLog(t,"Etapa concluída e encaminhada",previous+" → "+person.nome+" ("+person.email+")"+(note?" | Entrega: "+note:""));rtHistoryOpen=t.id;}
   else rtLog(t,"Responsável alterado",previous+" → "+person.nome+" ("+person.email+")");
   rtPicker=null;rtSave();rtDraw();return;
 }
 const task=rtState.tasks.find(t=>t.id===Number(b.dataset.id));
 if(task&&b.classList.contains("rt-rename-task")){if(rtCurrentUser?.perfil!=="admin"||!rtSharedReady||rtDirty||rtSyncing)return;const title=prompt("Novo nome da tarefa:",task.title);if(title===null||!title.trim()||title.trim()===task.title)return;const previous=task.title;task.title=title.trim().slice(0,220);rtLog(task,"Tarefa renomeada",previous+" → "+task.title);rtSave();rtDraw();return;}
 if(task&&b.classList.contains("rt-delete-task")){if(!rtCan("tasks.delete"))return alert("Seu perfil não permite excluir tarefas.");if(!rtSharedReady||rtDirty||rtSyncing)return alert("Aguarde a sincronização antes de excluir.");if(!confirm("Excluir definitivamente a tarefa \""+task.title+"\"? Os comentários e o histórico da tarefa serão removidos do quadro."))return;rtState.tasks=rtState.tasks.filter(t=>t.id!==task.id);rtExpandedCards.delete(task.id);rtSave();rtDraw();return;}
 if(task&&b.classList.contains("rt-clone-task")){rtCloneTask(task);return;}
 if(task&&b.classList.contains("rt-priority-btn")){rtPriorityPickerId=rtPriorityPickerId===task.id?null:task.id;rtDraw();return;}
 if(task&&b.classList.contains("rt-priority-choice")){const v=b.dataset.priority;if(!["baixa","normal","alta","urgente"].includes(v))return;const previous=task.priority||"normal";if(previous!==v){task.priority=v;rtLog(task,"Prioridade alterada",previous+" → "+v);rtSave();}rtPriorityPickerId=null;rtDraw();return;}
 if(task&&b.classList.contains("rt-checklist-add")){const v=prompt("Novo item do checklist:");if(!v?.trim())return;(task.checklist??=[]).push({text:v.trim().slice(0,200),done:false});rtLog(task,"Checklist adicionado",v.trim());rtSave();rtDraw();}
 if(task&&b.classList.contains("rt-comment-add")){const v=prompt("Comentário:");if(!v?.trim())return;(task.comments??=[]).push(v.trim().slice(0,1000));rtLog(task,"Comentário registrado",v.trim().slice(0,1000));rtSave();rtDraw();}
 if(task&&b.classList.contains("rt-recurring")){const v=prompt("Recorrência: nenhuma, diaria, semanal ou mensal",task.repeat||"nenhuma");if(v===null)return;if(!["nenhuma","diaria","semanal","mensal"].includes(v))return alert("Opção inválida");task.repeat=v;rtLog(task,"Recorrência configurada",v);rtSave();rtDraw();}
 if(b.classList.contains("rt-summary-card")){rtProjectStatusFilter=b.dataset.status;rtProject=0;rtDraw();return;}
 if(b.classList.contains("rt-project-dates-edit")){const p=rtState.projects.find(x=>x.id===Number(b.dataset.project));if(p)rtProjectForm(p);return;}
 if(b.classList.contains("rt-project-history-btn")){const id=Number(b.dataset.project);rtProjectHistoryId=rtProjectHistoryId===id?null:id;rtDraw();return;}
 if(b.dataset.rtWorkspace){
  rtWorkspaceView=b.dataset.rtWorkspace;
  if(rtWorkspaceView==="projects"){rtProject=0;rtProjectStatusFilter="todos";}
  rtDraw();document.querySelector('[data-rt-workspace="'+rtWorkspaceView+'"]')?.focus();return;
 }
 if(b.classList.contains("rt-focus-all")){rtProject=0;rtProjectStatusFilter="todos";rtDraw();document.getElementById("rt-project")?.focus();return;}
 if(b.classList.contains("rt-progress-select")){
  rtProject=Number(b.dataset.project);rtProjectStatusFilter="todos";rtWorkspaceView="board";
  rtSearch="";rtPriority="all";rtDraw();return;
 }
 if(b.id==="rt-new-project"){if(!rtCan("projects.create"))return alert("Seu perfil não permite criar projetos.");rtProjectForm(null);return;}
 if(b.id==="rt-new-task"||b.classList.contains("rt-focus-create")){if(!rtCan("tasks.create"))return alert("Seu perfil não permite criar tarefas.");if(!rtState.projects.length)return alert("Crie um projeto primeiro.");rtTaskForm(null);return;}
 if(b.classList.contains("rt-delegate")){const t=rtState.tasks.find(x=>x.id===Number(b.dataset.id));if(t)rtTaskForm(t);return;}
});

/* Formulário de projeto: histórico local de mudanças de campos */
document.addEventListener("click",e=>{if(e.target.id==="rt-project-cancel"||e.target.id==="rt-project-cancel-bottom"||e.target.id==="rt-project-overlay"){document.getElementById("rt-project-overlay")?.remove();rtProjectDialogId=null;}});
document.addEventListener("submit",e=>{if(e.target.id!=="rt-project-form")return;e.preventDefault();const form=e.target;const name=form.elements.name.value.trim(),description=form.elements.description.value.trim(),startDate=form.elements.startDate.value,endDate=form.elements.endDate.value;if(!name)return alert("Informe o nome do projeto.");if(startDate&&endDate&&endDate<startDate)return alert("A entrega não pode ser anterior ao início.");let p=rtProjectDialogId?rtState.projects.find(x=>x.id===rtProjectDialogId):null;if(rtProjectDialogId&&!p)return alert("Projeto não encontrado.");if(!p){p={id:Date.now(),name,description,startDate,endDate,createdBy:rtActor(),createdById:rtCurrentUser?.id,history:[]};rtProjectAudit(p,"Projeto criado","Início: "+rtDateLabel(startDate)+"; entrega: "+rtDateLabel(endDate)+"; descrição: "+(description||"Não informada"));rtState.projects.push(p);rtProject=p.id;}else{for(const [field,label,next] of [["name","Nome",name],["description","Descrição",description],["startDate","Data de início",startDate],["endDate","Prazo de entrega",endDate]]){const old=p[field]||"";if(old!==next){rtProjectAudit(p,label+" alterado",((field==="startDate"||field==="endDate")?rtDateLabel(old):old||"Não informado")+" → "+((field==="startDate"||field==="endDate")?rtDateLabel(next):next||"Não informado"));p[field]=next;}}}rtSave();document.getElementById("rt-project-overlay")?.remove();rtProjectDialogId=null;rtDraw();});

/* Calendário nativo para prazo de criação e edição de tarefas */
document.addEventListener("click",e=>{if(e.target.classList?.contains("rt-task-cancel")||e.target.id==="rt-task-overlay")document.getElementById("rt-task-overlay")?.remove();});
document.addEventListener("submit",e=>{if(e.target.id!=="rt-task-form")return;e.preventDefault();const form=e.target,due=form.elements.due.value,id=Number(form.dataset.taskId);if(due&&!rtValidDate(due))return alert("Selecione uma data válida.");if(id){const t=rtState.tasks.find(x=>x.id===id);if(!t)return alert("Tarefa não encontrada.");const previous=t.due||"";if(previous!==due){t.due=due;rtLog(t,"Prazo alterado","De "+rtDateLabel(previous)+" para "+rtDateLabel(due));}rtSave();document.getElementById("rt-task-overlay")?.remove();rtDraw();rtOpenPicker(t.id,"delegate");}else{const title=form.elements.title.value.trim();if(!title)return alert("Informe a descrição da tarefa.");const projectId=rtProject||rtState.projects.find(p=>!p.archivedAt)?.id;if(!projectId)return alert("Crie um projeto primeiro.");const t={id:Date.now(),projectId,title:title.slice(0,220),owner:rtCurrentUser?.nome||"Administrador",ownerId:rtCurrentUser?.id||null,ownerEmail:rtCurrentUser?.email||"",status:"a_fazer",due,manager:rtActor(),createdById:rtCurrentUser?.id,note:"",priority:"normal",checklist:[],comments:[]};rtLog(t,"Tarefa criada","Delegada para "+t.owner+"; prazo: "+rtDateLabel(due));rtState.tasks.push(t);rtSave();document.getElementById("rt-task-overlay")?.remove();rtDraw();}});
document.addEventListener("click",e=>{if(e.target?.id==="rt-export-backup"){e.preventDefault();rtExportBackup();}});
