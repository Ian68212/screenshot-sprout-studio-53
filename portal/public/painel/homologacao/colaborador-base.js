"use strict";
const $=id=>document.getElementById(id), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const names={documentos:"Documentos",comunicados:"Comunicados",treinamentos:"Treinamentos",ferramentas:"Ferramentas",pcp:"PCP",tarefas:"Gestão de Tarefas","gestao-empresarial":"Gestão Empresarial",almoxarifado:"Almoxarifado",qualidade:"Setor Teste de Qualidade",rh:"RH",seguranca:"Segurança do Trabalho",aplicativos:"Central de Aplicativos",contatos:"Contatos",suporte:"Suporte / TI"};
let data=[];
const recursoUrl=x=>{try{const u=new URL(String(x.url||""));return u.protocol==="https:"?u.href:null;}catch{return null;}};
const cardRecurso=x=>{const url=recursoUrl(x);return '<article class="item"><div class="placeholder">Rodrinox Pro</div><div class="body"><b>'+esc(x.nome)+'</b><p>'+esc(x.descricao||"")+':</p>'+(url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Abrir recurso ↗</a>':'<span>Sem link disponível</span>')+'</div></article>';};
const logo=document.querySelector(".brand-logo");if(logo){logo.addEventListener("load",()=>{document.querySelector(".brand-fallback").hidden=true;});logo.addEventListener("error",()=>{logo.hidden=true;document.querySelector(".brand-fallback").hidden=false;});}
async function read(endpoint){const r=await fetch("/colaborador/api/"+endpoint,{credentials:"same-origin",method:"GET",headers:{"Accept":"application/json"}});if(r.status===401){location.assign("/colaborador/");throw Error("Sessão expirada");}if(!r.ok)throw Error("Falha de leitura "+r.status);return r.json();}
function openTab(tab){const back=$("details").querySelector("button.back");if(back)back.hidden=tab==="tarefas";$("home").hidden=tab!=="inicio";$("hero").hidden=tab!=="inicio";$("details").hidden=tab==="inicio";document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));if(tab==="treinamentos"&&window.renderMyTrainings){$("sectionTitle").textContent="Treinamentos";$("items").replaceChildren();window.renderMyTrainings($("items"));return;}if(tab!=="inicio"){$("items").classList.remove("contacts-list","ge-area");$("sectionTitle").textContent=names[tab]||tab;const items=data.filter(x=>x.categoria===tab);if(tab==="atendimento"){window.renderCentralAtendimento?.();}else if(tab==="seguranca"){if(window.renderSST)window.renderSST();else $("items").textContent="Não foi possível carregar o módulo SST. Atualize a página.";}else if(tab==="gestao-empresarial"){$("items").classList.add("ge-area");$("items").innerHTML=window.renderGestaoEmpresarial?window.renderGestaoEmpresarial("admin"):'<p class="empty">Módulo indisponível.</p>';}else if(tab==="tarefas"){$("details").style.display="";$("details").style.width="";$("details").style.maxWidth="";$("details").style.minWidth="";$("items").style.display="";$("items").style.width="";$("items").style.maxWidth="";$("items").style.minWidth="";$("items").innerHTML=renderTarefas();rtLoadPeople();rtRefreshBoard();}else if(["documentos","comunicados","treinamentos","ferramentas","pcp","almoxarifado","qualidade","rh","seguranca"].includes(tab)){$("items").innerHTML=items.length?items.map(x=>{const url=recursoUrl(x)||"#";return '<article class="item">'+(/meister\s*task/i.test(String(x.nome||''))?'<div class="brand-meistertask" role="img" aria-label="MeisterTask"><span class="meistertask-mark">M</span><span class="meistertask-word">MeisterTask</span></div>':(x.imagem_url?'<img src="'+esc(x.imagem_url)+'" alt="">':'<div class="placeholder">Rodrinox Pro</div>'))+'<div class="body"><b>'+esc(x.nome)+'</b><p>'+esc(x.descricao||"")+'</p>'+(url!=="#"?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Abrir recurso ↗</a>':'<span>Sem link disponível</span>')+'</div></article>'}).join(""):'<p class="empty">Nenhum item disponível para seu perfil.</p>';}else if(tab==="aplicativos"){$("items").innerHTML='<article class="item"><div class="isic-app-visual" role="img" aria-label="Intelbras iSIC Lite"><div class="isic-app-icon"><svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect x="10" y="17" width="32" height="30" rx="7" fill="none" stroke="currentColor" stroke-width="5"/><path d="M42 27 55 20v24L42 37" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><circle cx="26" cy="32" r="7" fill="none" stroke="currentColor" stroke-width="4"/></svg></div><span class="isic-app-name">iSIC Lite</span></div><div class="body"><b>Intelbras iSIC Lite</b><p>Acesso ao aplicativo de câmeras. A abertura nativa depende do dispositivo.</p><a href="https://play.google.com/store/apps/details?id=com.intelbras.isiclite" target="_blank" rel="noopener noreferrer">Google Play</a></div></article>';}else if(tab==="suporte"){$("items").innerHTML='<article class="item"><div class="body"><b>Suporte / TI</b><p>Para solicitar atendimento, utilize o e-mail oficial de suporte da Rodrinox Pro.</p><p><a href="mailto:suporte@rodrinoxpro.com.br?subject=Solicita%C3%A7%C3%A3o%20de%20suporte%20TI%20-%20Rodrinox%20Pro">Enviar solicitação para suporte@rodrinoxpro.com.br ↗</a></p></div></article>';}else if(tab==="contatos"){mostrarContatos();}else{$("items").innerHTML='<p class="empty">Este módulo ainda não está habilitado para homologação.</p>';}}$("menuToggle").closest(".work").previousElementSibling.classList.remove("open");window.scrollTo(0,0);}
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

document.addEventListener("click",e=>{const b=e.target.closest("[data-tab]");if(b){e.preventDefault();const closeTasks=b.dataset.tab==="tarefas"&&b.closest("nav")&&b.classList.contains("active")&&!$("details").hidden&&!!$("items").querySelector(".tasks-shell");openTab(closeTasks?"inicio":b.dataset.tab);}});
$("menuToggle").addEventListener("click",() =>document.querySelector(".side").classList.toggle("open"));
(async()=>{try{const me=await read("eu");if(window.aplicarPermissoesMenu)await window.aplicarPermissoesMenu();$("user").textContent=me.nome||"Colaborador";$("firstName").textContent=(me.nome||"Colaborador").split(" ")[0];$("adminLink").hidden=me.perfil!=="admin";$("siteLink").hidden=me.perfil!=="admin";const items=await read("ferramentas");data=Array.isArray(items)?items:[];for(const [id,cat] of [["recent","comunicados"],["featured","treinamentos"]]){const arr=data.filter(x=>x.categoria===cat).slice(0,3);$(id).innerHTML=arr.length?arr.map(x=>{const url=recursoUrl(x);const image=x.imagem_url&&(/^https:\/\//i.test(x.imagem_url)||/^\/colaborador\/api\/site\/midias\/\d+\/arquivo$/.test(x.imagem_url))?x.imagem_url:null;const thumb=image?'<img class="resource-thumb" src="'+esc(image)+'" alt="Imagem do curso '+esc(x.nome)+'" loading="lazy">':'';return '<div class="recentItem '+(id==="featured"?"training-item":"")+'">'+thumb+'<div class="resource-info"><strong>'+esc(x.nome)+'</strong>'+(url?' <a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Abrir ↗</a>':' <span>Sem link cadastrado</span>')+'</div></div>';}).join(""):'<p class="empty">Nenhum item disponível ainda.</p>';}window.renderMyTrainings?.($("featured"),true);}catch(e){$("recent").textContent="Não foi possível consultar os recursos.";$("featured").textContent="Verifique sua sessão e tente novamente.";console.error(e);}})();

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
const rtTrashKey="rodrinox-tasks-demo-trash-v1";const rtTrashSave=()=>{};const rtTrashExpiry=2592000000;rtTrash=rtTrash.filter(x=>x&&Number.isFinite(Date.parse(x.deletedAt))&&Date.now()-Date.parse(x.deletedAt)<rtTrashExpiry);rtTrashSave();let rtTrashOpen=false;
function rtTrashView(){return '<section class="tasks-shell"><div class="tasks-heading"><div><h2>Lixeira</h2><p>Itens recuperáveis por até 30 dias neste navegador.</p></div><button type="button" id="rt-trash-close">Voltar às tarefas</button></div><div style="padding:15px">'+(rtTrash.length?rtTrash.map(x=>'<article class="rt-card" style="margin:12px 0"><strong>'+esc(x.type==="project"?"Projeto: "+x.project.name:"Tarefa: "+x.task.title)+'</strong><small>Excluído em '+new Date(x.deletedAt).toLocaleString("pt-BR")+'</small><div style="display:flex;gap:8px;margin-top:10px"><button type="button" class="rt-trash-restore" data-trash-id="'+esc(x.trashId)+'">Restaurar</button><button type="button" class="rt-trash-purge" data-trash-id="'+esc(x.trashId)+'">Excluir definitivamente</button></div></article>').join(""):'<p>Lixeira vazia.</p>')+'</div></section>'}
const rtAttachmentStore="rodrinox-tasks-demo-attachments-v1";
let rtAttachments={};try{rtAttachments=JSON.parse(sessionStorage.getItem(rtAttachmentStore)||"{}")||{};}catch{}
const rtSaveAttachments=()=>{try{sessionStorage.setItem(rtAttachmentStore,JSON.stringify(rtAttachments));}catch{}};
let rtSearch="",rtPriority="all",rtSort="default",rtProjectStatusFilter="todos";
let rtPeople=[],rtPeopleError="",rtPicker=null;
async function rtLoadPeople(){try{const result=await read("tarefas/responsaveis");if(!Array.isArray(result))throw Error("Resposta inválida");rtPeople=result.filter(p=>Number.isSafeInteger(Number(p.id))&&p.nome&&p.email);rtPeopleError="";}catch(e){rtPeople=[];rtPeopleError="Não foi possível carregar os colaboradores cadastrados.";console.error("[tarefas] diretório",e);}rtDraw();}
function rtOpenPicker(taskId,kind){rtPicker={taskId,kind};rtDraw();}
function rtPersonLabel(p){return p.nome+" · "+p.departamento+" · "+p.email;}
let rtHistoryOpen=null;
const rtActor=()=>rtCurrentUser?.nome||"Usuário";
function rtLog(task,event,details=""){(task.history??=[]).push({at:new Date().toISOString(),actor:rtActor(),event,details});}
function rtHistory(task){const history=task.history?.length?task.history:[{at:null,actor:"Demonstração",event:"Tarefa inicial do protótipo",details:"Eventos anteriores não foram registrados."}];return '<details class="rt-history-panel"><summary style="cursor:pointer;font-weight:600">Linha do tempo · Histórico ('+(task.history?.length||0)+')</summary><div style="max-height:280px;overflow:auto">'+history.map(h=>'<div class="rt-history-event"><strong>'+esc(h.event)+'</strong><small>'+esc(h.actor)+' · '+(h.at?new Date(h.at).toLocaleString("pt-BR"):"Sem data")+'</small>'+(h.details?'<p>'+esc(h.details)+'</p>':"")+'</div>').join("")+'</div></details>';}
let rtView="admin",rtProject=0,rtPriorityPickerId=null;
const rtStatus={a_fazer:"A fazer",andamento:"Em andamento",revisao:"Em revisão",concluida:"Concluída"};
let rtRevision=null,rtCurrentUser=null,rtSyncing=false,rtDirty=false,rtSharedReady=false,rtSyncError="",rtBoardMode="all",rtPermissions=null,rtPermissionStamp="";
const rtCan=action=>rtCurrentUser?.perfil==="admin"||rtPermissions?.grants?.[action]===true;
const rtRequire=action=>{if(rtCan(action))return true;alert("Seu perfil não permite esta ação. Solicite a liberação ao administrador.");return false;};
async function rtRefreshBoard(){
 if(rtSyncing||rtDirty||rtDraggingTask!==null)return;
 rtSyncing=true;
 try{const response=await fetch("/colaborador/api/tasks-official/board",{credentials:"same-origin",cache:"no-store"});
 if(!response.ok){const problem=await response.json().catch(()=>({}));throw Error("HTTP "+response.status+(problem.erro?" — "+problem.erro:""));}
 const data=await response.json();if(!data.state||!Array.isArray(data.state.projects)||!Array.isArray(data.state.tasks))throw Error("Resposta inválida");
 const policyStamp=JSON.stringify(data.permissions||{});
 if(rtRevision!==data.revision||!rtSharedReady||policyStamp!==rtPermissionStamp){
 rtState={projects:data.state.projects,tasks:data.state.tasks};rtTrash=data.state.trash||[];
 rtRevision=data.revision;rtCurrentUser=data.user;rtPermissions=data.permissions;rtPermissionStamp=policyStamp;rtSharedReady=true;rtSyncError="";
 rtView=data.user.perfil==="admin"?"admin":"frank";
 rtProject=rtState.projects.some(p=>p.id===rtProject)?rtProject:0;rtDraw();
 }
 }catch(e){console.error("[tarefas] sincronização",e);rtSharedReady=false;rtSyncError=e.message||"Falha desconhecida";rtDraw();}
 finally{rtSyncing=false;}
}
const rtSave=()=>{
 if(!rtSharedReady||rtDirty){alert("Quadro não sincronizado. Aguarde a conexão antes de alterar.");return;}
 rtDirty=true;
 fetch("/colaborador/api/tasks-official/board",{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json","X-Portal":"1"},body:JSON.stringify({revision:rtRevision,state:{projects:rtState.projects,tasks:rtState.tasks,trash:rtTrash}})})
 .then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.erro||"Erro "+r.status);rtRevision=data.revision;})
 .catch(e=>{alert("Alteração não salva: "+e.message+". O quadro será recarregado.");rtRevision=null;})
 .finally(()=>{rtDirty=false;rtRefreshBoard();});
};
setInterval(()=>{if(document.querySelector("#items .tasks-shell"))rtRefreshBoard();},10000);
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
 document.querySelectorAll(".rt-drop-active,.rt-drop-before,.rt-drop-after").forEach(el=>el.classList.remove("rt-drop-active","rt-drop-before","rt-drop-after"));
}
document.addEventListener("dragend",rtClearDrag);
document.addEventListener("dragover",e=>{
 const column=e.target.closest?.(".tasks-column[data-task-status]");
 if(!column||rtDraggingTask===null)return;
 e.preventDefault();
 e.dataTransfer.dropEffect="move";
 column.classList.add("rt-drop-active");
 document.querySelectorAll(".rt-drop-before,.rt-drop-after").forEach(el=>el.classList.remove("rt-drop-before","rt-drop-after"));const target=e.target.closest(".rt-task-card");if(target&&Number(target.dataset.taskId)!==rtDraggingTask){const rect=target.getBoundingClientRect();target.classList.add(e.clientY<rect.top+rect.height/2?"rt-drop-before":"rt-drop-after");}
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
 const status=column.dataset.taskStatus;
 if(!rtCan("tasks.status")||!rtSharedReady||rtDirty||rtSyncing||!Object.hasOwn(rtStatus,status))return;
 const task=rtState.tasks.find(t=>t.id===id);if(!task)return;
 const target=e.target.closest(".rt-task-card");if(target&&Number(target.dataset.taskId)===id)return;
 const previous=task.status;
 if(rtSort!=="default"){rtChangeStatus(id,status);return;}
 const next=rtState.tasks.filter(t=>t.id!==id);
 let index=target?next.findIndex(t=>t.id===Number(target.dataset.taskId)):-1;
 if(index>=0){const rect=target.getBoundingClientRect();if(e.clientY>=rect.top+rect.height/2)index++;}
 else{index=next.length;for(let i=next.length-1;i>=0;i--)if(next[i].status===status){index=i+1;break;}}
 task.status=status;next.splice(index,0,task);rtState.tasks=next;
 if(previous!==status)rtLog(task,"Status alterado",rtStatus[previous]+" → "+rtStatus[status]);
 else rtLog(task,"Ordem alterada","Posição manual no quadro");
 rtSave();rtDraw();
});

function rtDraw(){const root=document.querySelector("#items .tasks-shell");if(root)root.outerHTML=rtTrashOpen?rtTrashView():renderTarefas();}
let rtProjectDialogId=null,rtProjectHistoryId=null;
function rtProjectAudit(p,action,detail){(p.history??=[]).push({at:new Date().toISOString(),actor:rtActor(),action,detail});}
function rtTaskForm(t){document.getElementById("rt-task-overlay")?.remove();const overlay=document.createElement("div");overlay.id="rt-task-overlay";overlay.className="rt-project-overlay";overlay.innerHTML='<form id="rt-task-form" class="rt-project-form" data-task-id="'+(t?.id||0)+'"><div class="rt-form-header"><h3>'+(t?"Editar tarefa":"Nova tarefa")+'</h3><button type="button" class="rt-task-cancel" aria-label="Fechar">✕</button></div>'+(t?'':'<label>Descrição da tarefa<input name="title" required maxlength="220" placeholder="O que precisa ser feito?"></label>')+'<label>Prazo de conclusão (opcional)<input type="date" name="due" value="'+esc(t?.due||"")+'"></label><small>Selecione a data no calendário ou deixe em branco para definir depois.</small><div class="rt-form-actions"><button type="button" class="rt-task-cancel">Cancelar</button><button type="submit">Salvar tarefa</button></div></form>';document.body.appendChild(overlay);overlay.querySelector(t?'[name="due"]':'[name="title"]').focus();}
function rtProjectForm(p){rtProjectDialogId=p?.id||0;const overlay=document.createElement("div");overlay.id="rt-project-overlay";overlay.className="rt-project-overlay";overlay.innerHTML='<form id="rt-project-form" class="rt-project-form"><div class="rt-form-header"><h3>'+(p?"Editar projeto":"Novo projeto")+'</h3><button type="button" id="rt-project-cancel" aria-label="Fechar">✕</button></div><label>Nome do projeto<input name="name" required maxlength="160" value="'+esc(p?.name||"")+'"></label><label>Descrição do projeto<textarea name="description" rows="4" maxlength="2000" placeholder="Objetivo, escopo e informações principais...">'+esc(p?.description||"")+'</textarea></label><div class="rt-form-dates"><label>Data de início<input type="date" name="startDate" value="'+esc(p?.startDate||"")+'"></label><label>Prazo de entrega<input type="date" name="endDate" value="'+esc(p?.endDate||"")+'"></label></div><div class="rt-form-actions"><button type="button" id="rt-project-cancel-bottom">Cancelar</button><button type="submit">Salvar projeto</button></div></form>';document.body.appendChild(overlay);overlay.querySelector('[name="name"]').focus();}
function rtProjectHistory(p){const history=(p.history||[]).slice().reverse();return '<div class="rt-project-history"><strong>Histórico de alterações do projeto</strong>'+(history.length?history.map(h=>'<div class="rt-project-history-item"><strong>'+esc(h.action)+'</strong><small>'+esc(h.actor)+' · '+new Date(h.at).toLocaleString("pt-BR")+'</small><p>'+esc(h.detail)+'</p></div>').join(""):'<small>Nenhuma alteração registrada nesta versão.</small>')+'</div>';}
function rtParticipatingProjects(){return rtState.projects.filter(p=>!p.archivedAt).filter(p=>rtBoardMode==="mine"?rtState.tasks.some(t=>t.projectId===p.id&&Number(t.ownerId)===Number(rtCurrentUser?.id)):rtCurrentUser?.perfil==="admin"||rtState.tasks.some(t=>t.projectId===p.id&&Number(t.ownerId)===Number(rtCurrentUser?.id)));}
function rtValidDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+"T12:00:00"));}
function rtDateLabel(v){if(!rtValidDate(v||""))return "Não definida";const [y,m,d]=v.split("-");return d+"/"+m+"/"+y;}
function rtProjectColor(p){const tasks=rtState.tasks.filter(t=>t.projectId===p.id);if(tasks.length&&tasks.every(t=>t.status==="concluida"))return "concluido";const today=new Date();const localToday=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),String(today.getDate()).padStart(2,"0")].join("-");if(p.endDate&&p.endDate<localToday)return "atrasado";if(p.startDate&&p.startDate>localToday)return "nao-iniciado";return tasks.some(t=>t.status!=="a_fazer")||p.startDate&&p.startDate<=localToday?"andamento":"nao-iniciado";}
const rtColorLabels={"concluido":"Concluído","atrasado":"Atrasado","nao-iniciado":"Não iniciado","andamento":"Em andamento"};
function rtProjectStatus(p){const tasks=rtState.tasks.filter(t=>t.projectId===p.id);if(tasks.length&&tasks.every(t=>t.status==="concluida"))return "concluidos";if(tasks.some(t=>t.status!=="a_fazer"))return "andamento";return "abertos";}
function rtProjectSummary(){const projects=rtParticipatingProjects();const counts={todos:projects.length,abertos:0,andamento:0,concluidos:0};for(const p of projects)counts[rtProjectStatus(p)]++;const cards=[["todos","Total de projetos"],["abertos","Em aberto"],["andamento","Em andamento"],["concluidos","Concluídos"]];return '<section class="rt-summary"><div class="rt-summary-heading"><strong>'+(rtBoardMode==="mine"?"Visão geral dos meus projetos":"Visão geral dos projetos")+'</strong><small>'+(rtBoardMode==="mine"?"Projetos com tarefas atribuídas a "+esc(rtCurrentUser?.nome||"mim"):"Acompanhamento de projetos e tarefas")+'</small></div><div class="rt-summary-grid">'+cards.map(([key,label])=>'<button type="button" class="rt-summary-card'+(rtProjectStatusFilter===key?" is-selected":"")+'" data-status="'+key+'" aria-pressed="'+(rtProjectStatusFilter===key)+'"><small>'+label+'</small><strong>'+counts[key]+'</strong><span>'+ (key==="todos"?"Visualizar todos": "Filtrar projetos")+'</span></button>').join("")+'</div></section>';}
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
const rtTitleActionStyle=document.createElement("style");rtTitleActionStyle.textContent=".rt-task-title{position:relative;padding-right:64px!important}.rt-title-actions{position:absolute;right:5px;top:50%;transform:translateY(-50%);display:inline-flex;gap:3px;opacity:0;pointer-events:none}.rt-task-title:hover .rt-title-actions,.rt-task-title:focus-within .rt-title-actions{opacity:1;pointer-events:auto}.rt-title-actions button{width:24px!important;height:24px;padding:0!important;min-width:0!important;border:0!important;background:transparent!important;color:inherit;cursor:pointer;font-size:15px;line-height:1}.rt-title-actions .rt-delete-task{color:#b42318!important}@media(hover:none){.rt-title-actions{opacity:1;pointer-events:auto}}";document.head.appendChild(rtTitleActionStyle);document.addEventListener("click",e=>{if(e.target.closest(".rt-title-actions button"))e.preventDefault();},true);
const rtStatusColorStyle=document.createElement("style");rtStatusColorStyle.textContent=".tasks-column[data-task-status=\"a_fazer\"]>h3{color:#5799DF!important;border-bottom-color:#5799DF!important}.tasks-column[data-task-status=\"a_fazer\"] .rt-task-card[data-priority]{background:#E5EFFB!important;border-color:#5799DF!important;border-left:4px solid #5799DF!important;color:#174A75!important}.tasks-column[data-task-status=\"a_fazer\"] .rt-task-card[data-priority]>.rt-task-title,.tasks-column[data-task-status=\"a_fazer\"] .rt-task-card[data-priority]>.rt-card{background:#E5EFFB!important;color:#174A75!important}.tasks-column[data-task-status=\"a_fazer\"] .rt-task-card[data-priority]>.rt-task-title{border-bottom-color:#5799DF!important}.tasks-column[data-task-status=\"andamento\"]>h3{color:#E9AC40!important;border-bottom-color:#E9AC40!important}.tasks-column[data-task-status=\"andamento\"] .rt-task-card[data-priority]{background:#FFF1D5!important;border-color:#E9AC40!important;border-left:4px solid #E9AC40!important;color:#855509!important}.tasks-column[data-task-status=\"andamento\"] .rt-task-card[data-priority]>.rt-task-title,.tasks-column[data-task-status=\"andamento\"] .rt-task-card[data-priority]>.rt-card{background:#FFF1D5!important;color:#855509!important}.tasks-column[data-task-status=\"andamento\"] .rt-task-card[data-priority]>.rt-task-title{border-bottom-color:#E9AC40!important}.tasks-column[data-task-status=\"revisao\"]>h3{color:#A78BFA!important;border-bottom-color:#A78BFA!important}.tasks-column[data-task-status=\"revisao\"] .rt-task-card[data-priority]{background:#F0E9FF!important;border-color:#A78BFA!important;border-left:4px solid #A78BFA!important;color:#62409C!important}.tasks-column[data-task-status=\"revisao\"] .rt-task-card[data-priority]>.rt-task-title,.tasks-column[data-task-status=\"revisao\"] .rt-task-card[data-priority]>.rt-card{background:#F0E9FF!important;color:#62409C!important}.tasks-column[data-task-status=\"revisao\"] .rt-task-card[data-priority]>.rt-task-title{border-bottom-color:#A78BFA!important}.tasks-column[data-task-status=\"concluida\"]>h3{color:#42B883!important;border-bottom-color:#42B883!important}.tasks-column[data-task-status=\"concluida\"] .rt-task-card[data-priority]{background:#E0F5E9!important;border-color:#42B883!important;border-left:4px solid #42B883!important;color:#176341!important}.tasks-column[data-task-status=\"concluida\"] .rt-task-card[data-priority]>.rt-task-title,.tasks-column[data-task-status=\"concluida\"] .rt-task-card[data-priority]>.rt-card{background:#E0F5E9!important;color:#176341!important}.tasks-column[data-task-status=\"concluida\"] .rt-task-card[data-priority]>.rt-task-title{border-bottom-color:#42B883!important}.tasks-board .rt-task-card[data-priority=\"urgente\"] .rt-task-priority-label{background:#fee2e2!important;color:#991b1b!important;border-color:#ef4444!important}.tasks-board .rt-task-card[data-priority=\"alta\"] .rt-task-priority-label{background:#fff0ce!important;color:#854d0e!important;border-color:#e9ac40!important}.tasks-board .rt-task-card[data-priority=\"normal\"] .rt-task-priority-label{background:#e5effb!important;color:#174a75!important;border-color:#5799df!important}.tasks-board .rt-task-card[data-priority=\"baixa\"] .rt-task-priority-label{background:#edf2f7!important;color:#475569!important;border-color:#94a3b8!important}";document.head.appendChild(rtStatusColorStyle);
const rtOrderStyle=document.createElement("style");rtOrderStyle.textContent=".tasks-board .rt-task-title .rt-task-priority-label{display:table!important;margin:0 0 5px 0!important;padding:2px 7px!important;border:0!important;border-radius:4px!important;font-size:11px!important;font-weight:500!important}.rt-task-name{display:inline}.rt-drop-before{outline:2px solid #60a5fa!important;outline-offset:2px}.rt-drop-after{box-shadow:0 4px 0 #60a5fa!important}";document.head.appendChild(rtOrderStyle);
const rtCompactLayoutStyle=document.createElement("style");rtCompactLayoutStyle.textContent=".tasks-shell .rt-project-focus{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(150px,230px) auto!important;align-items:center!important;gap:14px!important;padding:10px 14px!important;margin:8px 0!important}.tasks-shell .rt-project-focus h3{margin:2px 0!important;font-size:17px!important;line-height:1.25!important}.tasks-shell .rt-project-focus .rt-project-dates{margin:2px 0!important;gap:8px!important}.tasks-shell .rt-project-focus .rt-project-description-toggle{margin:3px 0 0!important}.tasks-shell .rt-focus-progress{padding:8px 10px!important;min-width:0!important}.tasks-shell .rt-focus-actions{display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;align-items:center!important;justify-content:center!important;gap:6px!important;max-width:none!important}.tasks-shell .rt-focus-actions button{height:30px!important;margin:0!important;padding:0 9px!important;white-space:nowrap!important;font-size:11px!important}.tasks-shell .tasks-heading{margin-bottom:8px!important}.tasks-shell .rt-filterbar{gap:8px!important;margin:6px 0!important}.tasks-shell .rt-filterbar input,.tasks-shell .rt-filterbar select{min-height:30px!important;height:30px!important}.tasks-shell .tasks-stats{margin:6px 0!important;gap:5px!important}.tasks-shell .tasks-board{gap:8px!important;align-items:start!important}.tasks-shell .tasks-column{padding:8px!important;min-width:0!important}.tasks-shell .tasks-column>h3{margin:0 0 6px!important;padding:3px 0 7px!important}.tasks-shell .rt-task-card{margin:0 0 6px!important;overflow:hidden;border-radius:7px!important}.tasks-shell .rt-task-card>.rt-task-title{display:grid!important;grid-template-columns:10px minmax(0,1fr)!important;align-items:start!important;column-gap:5px!important;row-gap:3px!important;padding:6px 8px!important;list-style:none!important;min-height:0!important;line-height:1.3!important}.tasks-shell .rt-task-title::-webkit-details-marker{display:none!important}.tasks-shell .rt-task-title::marker{content:\"\"}.tasks-shell .rt-task-title::before{content:\"▸\";grid-column:1;grid-row:2;font-size:11px}.tasks-shell .rt-task-card[open]>.rt-task-title::before{content:\"▾\"}.tasks-shell .rt-task-title .rt-task-priority-label{grid-column:2;grid-row:1;justify-self:start;margin:0!important;padding:1px 5px!important;font-size:10px!important;line-height:1.25!important}.tasks-shell .rt-task-name{grid-column:2;grid-row:2;overflow-wrap:anywhere;font-size:12px!important;padding-right:0!important}.tasks-shell .rt-title-actions{top:5px!important;transform:none!important;background:inherit;border-radius:4px}.tasks-shell .rt-task-title:has(.rt-title-actions):hover .rt-task-name,.tasks-shell .rt-task-title:focus-within .rt-task-name{padding-right:0!important}@media(max-width:1100px){.tasks-shell .rt-project-focus{grid-template-columns:minmax(0,1fr) minmax(140px,200px)!important}.tasks-shell .rt-focus-actions{grid-column:1/-1;justify-content:flex-start!important}}@media(max-width:600px){.tasks-shell .rt-project-focus{grid-template-columns:1fr!important}.tasks-shell .rt-focus-actions{grid-column:auto}.tasks-shell .rt-task-title .rt-task-priority-label{max-width:calc(100% - 50px)}}";document.head.appendChild(rtCompactLayoutStyle);
const rtCleanBoardHeaderStyle=document.createElement('style');rtCleanBoardHeaderStyle.textContent=".tasks-shell .tasks-heading{padding:4px 0 8px!important;margin:0 0 8px!important}.tasks-shell .tasks-heading h2{font-size:22px!important;margin:0!important;line-height:1.3}.tasks-shell .tasks-toolbar{display:flex!important;flex-wrap:wrap!important;align-items:flex-end!important;gap:8px!important;padding:10px 0!important}.tasks-shell .tasks-toolbar button,.tasks-shell .tasks-toolbar select{height:32px!important;min-height:32px!important;margin:0!important;border-radius:6px!important}.tasks-shell .tasks-toolbar label{margin:0!important}.tasks-shell .tasks-toolbar button{background:#17364f!important;border:1px solid #34536c!important}.tasks-shell .tasks-toolbar button[aria-pressed=true],.tasks-shell #rt-new-task{background:#286a9c!important}.tasks-shell .tasks-column>h3{display:flex!important;align-items:center!important;justify-content:space-between!important;margin:-8px -8px 8px!important;padding:10px 12px!important;border-radius:9px 9px 0 0!important;color:#fff!important;border-bottom:0!important;min-height:36px;box-sizing:border-box}.tasks-shell .tasks-column[data-task-status=\"a_fazer\"]>h3{background:#245b91!important;color:#fff!important}.tasks-shell .tasks-column[data-task-status=\"andamento\"]>h3{background:#956019!important;color:#fff!important}.tasks-shell .tasks-column[data-task-status=\"revisao\"]>h3{background:#7652b0!important;color:#fff!important}.tasks-shell .tasks-column[data-task-status=\"concluida\"]>h3{background:#21805b!important;color:#fff!important}.tasks-shell .tasks-column>h3 small{background:rgba(255,255,255,.16)!important;color:#fff!important;border-color:rgba(255,255,255,.22)!important}.tasks-shell .tasks-column{overflow:hidden!important}";document.head.appendChild(rtCleanBoardHeaderStyle);rtCleanBoardHeaderStyle.textContent+=".rt-board-context{display:flex;align-items:center;gap:10px;margin:10px 0 8px;padding:7px 10px;border-left:3px solid #5799df;background:#10283e;border-radius:5px}.rt-board-context small,.rt-board-context strong{display:block}.rt-board-context small{font-size:10px;color:#a8c3db}.rt-board-context strong{font-size:14px;color:#e7f0fa;overflow-wrap:anywhere}.rt-board-folder{font-size:22px;color:#8eb9e6}";
const rtCleanNavStyle=document.createElement("style");rtCleanNavStyle.textContent="#details button.back[hidden]{display:none!important}";document.head.appendChild(rtCleanNavStyle);
function rtTaskCardHeading(task){
 const priority=Object.hasOwn(rtPriorityLabels,task.priority)?task.priority:"normal";
 return `<details class="rt-task-card" data-task-id="${task.id}" data-priority="${priority}"${rtExpandedCards.has(task.id)?" open":""}><summary class="rt-task-title" draggable="${rtCan("tasks.status")}"><span class="rt-task-priority-label">${rtPriorityLabels[priority]}</span><span class="rt-task-name">${esc(task.title)}</span>${rtCurrentUser?.perfil==="admin"?`<span class="rt-title-actions"><button type="button" class="rt-rename-task" data-id="${task.id}" title="Renomear tarefa" aria-label="Renomear tarefa">✎</button><button type="button" class="rt-delete-task" data-id="${task.id}" title="Excluir tarefa" aria-label="Excluir tarefa">🗑</button></span>`:""}</summary>`;
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
function renderTarefas(){if(rtTrashOpen)return rtTrashView();
 const visible=rtState.tasks.filter(t=>rtState.projects.some(p=>p.id===t.projectId&&!p.archivedAt)).filter(t=>(!rtProject||t.projectId===rtProject)&&(rtBoardMode==="all"?rtCurrentUser?.perfil==="admin"||rtParticipatingProjects().some(p=>p.id===t.projectId):Number(t.ownerId)===Number(rtCurrentUser?.id)));
 const filtered=visible.filter(t=>(!rtSearch||(t.title+" "+(t.note||"")+" "+t.owner).toLowerCase().includes(rtSearch.toLowerCase()))&&(rtPriority==="all"||(t.priority||"normal")===rtPriority));if(rtSort==="due")filtered.sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999"));const total=filtered.length,done=filtered.filter(t=>t.status==="concluida").length;
 return '<section class="tasks-shell"><div class="tasks-heading"><div><h2>Gestão de Tarefas</h2></div></div>'+
 '<div class="tasks-toolbar"><button type="button" id="rt-mode-mine" aria-pressed="'+(rtBoardMode==="mine")+'">Minhas tarefas</button><button type="button" id="rt-mode-all" aria-pressed="'+(rtBoardMode==="all")+'">'+(rtCurrentUser?.perfil==="admin"?"Todos os projetos":"Projetos em que participo")+'</button><label>Visualizar como <select id="rt-view"><option value="admin"'+(rtView==="admin"?" selected":"")+'>Administrador</option><option value="frank"'+(rtView==="frank"?" selected":"")+'>Frank (simulação)</option></select></label><label>Projeto <select id="rt-project"><option value="0">Todos os projetos</option>'+rtState.projects.filter(p=>!p.archivedAt).map(p=>'<option value="'+p.id+'"'+(rtProject===p.id?" selected":"")+'>'+esc(p.name)+'</option>').join("")+'</select></label><button type="button" id="rt-new-project">+ Novo projeto</button><button type="button" id="rt-new-task">+ Nova tarefa</button>'+(rtCurrentUser?.perfil==="admin"?'<button type="button" id="rt-archive-project">Arquivar projeto</button><button type="button" id="rt-archive-view">Projetos arquivados ('+rtState.projects.filter(p=>p.archivedAt).length+')</button>':"")+'<button type="button" id="rt-delete-project">Excluir projeto selecionado</button><button type="button" id="rt-trash-open">Lixeira ('+rtTrash.length+')</button></div>'+
 '<div class="rt-workspace-switch" role="group" aria-label="Visualização"><button type="button" data-rt-workspace="board" aria-pressed="'+(rtWorkspaceView==="board")+'">Quadro</button><button type="button" data-rt-workspace="projects" aria-pressed="'+(rtWorkspaceView==="projects")+'">Projetos</button></div>'+
 (rtWorkspaceView==="projects" ? rtProjectSummary()+rtProjectProgress() :
 rtProjectFocus(rtParticipatingProjects().find(p=>p.id===rtProject))+
 '<div class="rt-filterbar"><label>Buscar <input id="rt-search" placeholder="Título, responsável, descrição..." value="'+esc(rtSearch)+'"></label><label>Prioridade <select id="rt-priority"><option value="all">Todas</option>'+["baixa","normal","alta","urgente"].map(p=>'<option value="'+p+'"'+(rtPriority===p?" selected":"")+'>'+p+'</option>').join("")+'</select></label><label>Ordenação <select id="rt-sort"><option value="default">Padrão</option><option value="due"'+(rtSort==="due"?" selected":"")+'>Prazo mais próximo</option></select></label></div><div class="tasks-stats"><div><small>Tarefas visíveis</small><strong>'+total+'</strong></div><div><small>Pendentes</small><strong>'+filtered.filter(t=>t.status!=="concluida").length+'</strong></div><div><small>Em andamento</small><strong>'+filtered.filter(t=>t.status==="andamento").length+'</strong></div><div><small>Concluídas</small><strong>'+done+'</strong></div></div>'+
 '<div class="rt-board-context" aria-live="polite"><span class="rt-board-folder" aria-hidden="true">▱</span><div><small>'+(rtProject?'Projeto selecionado':'Visualizando')+'</small><strong>'+esc(rtState.projects.find(p=>p.id===rtProject)?.name||(rtBoardMode==="mine"?"Minhas tarefas":rtCurrentUser?.perfil==="admin"?"Todos os projetos":"Projetos em que participo"))+'</strong></div></div>'+ 
 '<div class="tasks-board">'+Object.entries(rtStatus).map(([key,label])=>'<div class="tasks-column" data-task-status="'+key+'"><h3>'+label+' <small>'+filtered.filter(t=>t.status===key).length+'</small></h3>'+filtered.filter(t=>t.status===key).map(t=>rtTaskCardHeading(t)+'<article class="rt-card"><small>'+esc(rtState.projects.find(p=>p.id===t.projectId)?.name||"Projeto")+(rtCurrentUser?.perfil==="admin"?' <button type="button" class="rt-move-project" data-id="'+t.id+'" title="Mover para outro projeto" aria-label="Mover para outro projeto" style="display:inline-block;width:auto;padding:0 5px;background:transparent;border:0;color:inherit">✎</button>':"")+'</small><small>Responsável: '+esc(t.owner)+'</small><div class="rt-task-deadlines"><small>Prazo do projeto: '+rtDateLabel(rtState.projects.find(p=>p.id===t.projectId)?.endDate) .replace("Não definida","—")+'</small><small>Prazo da tarefa: '+rtDateLabel(t.due).replace("Não definida","—")+'</small></div>'+(t.note?'<small>'+esc(t.note)+'</small>':'')+(t.repeat?'<small>Recorrência: '+esc(t.repeat)+'</small>':'')+((t.comments||[]).length?'<details class="rt-comments-details"><summary>Visualizar comentários <span class="rt-comments-count">'+t.comments.length+'</span></summary><div class="rt-comments-list">'+t.comments.map(c=>'<small class="rt-comment">'+esc(c)+'</small>').join("")+'</div></details>':'')+(t.checklist||[]).map((c,i)=>'<label class="rt-check"><input type="checkbox" class="rt-check-toggle" data-id="'+t.id+'" data-index="'+i+'"'+(c.done?" checked":"")+'> '+esc(c.text)+'</label>').join("")+'<div class="rt-attachments"><strong>Anexos e documentos</strong>'+(rtAttachments[t.id]||[]).map((a,i)=>'<div class="rt-attachment-row"><span title="'+esc(a.name)+'">'+esc(a.name)+' · '+Math.round(a.size/1024)+' KB</span><button type="button" class="rt-download" data-id="'+t.id+'" data-index="'+i+'">Baixar</button><button type="button" class="rt-remove-file" data-id="'+t.id+'" data-index="'+i+'">Excluir</button></div>').join("")+'<label class="rt-upload-label">+ Anexar documentos<input class="rt-upload" type="file" data-id="'+t.id+'" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx" multiple></label><small>Demo: até 1 MB por arquivo; anexos temporários desta sessão.</small></div>'+'<label>Status <select class="rt-status" data-id="'+t.id+'">'+Object.entries(rtStatus).map(([v,n])=>'<option value="'+v+'"'+(v===t.status?" selected":"")+'>'+n+'</option>').join("")+'</select></label>'+(rtView==="admin"?'<button type="button" class="rt-delegate" data-id="'+t.id+'">Prazo de conclusão</button><button type="button" class="rt-priority-btn" data-id="'+t.id+'" aria-expanded="'+(rtPriorityPickerId===t.id)+'">Prioridade</button>'+(rtPriorityPickerId===t.id?'<div class="rt-priority-picker" role="group" aria-label="Selecionar prioridade">'+["baixa","normal","alta","urgente"].map(p=>'<button type="button" class="rt-priority-choice rt-choice-'+p+'" data-id="'+t.id+'" data-priority="'+p+'"><span class="rt-choice-dot"></span>'+({baixa:"Baixa",normal:"Normal",alta:"Alta",urgente:"Urgente"}[p])+'</button>').join("")+'</div>':"")+'<button type="button" class="rt-checklist-add" data-id="'+t.id+'">+ Checklist</button><button type="button" class="rt-comment-add" data-id="'+t.id+'">+ Comentário</button><button type="button" class="rt-recurring" data-id="'+t.id+'">Recorrência</button><button type="button" class="rt-handoff" data-id="'+t.id+'">Concluir etapa e encaminhar</button>':'')+(rtPicker?.taskId===t.id?'<div class="rt-person-picker"><strong>'+(rtPicker.kind==="handoff"?"Encaminhar próxima etapa":"Selecionar responsável")+'</strong><label>Colaborador cadastrado <select class="rt-person-select"><option value="">Selecione um colaborador</option>'+rtPeople.map(p=>'<option value="'+p.id+'">'+esc(rtPersonLabel(p))+'</option>').join("")+'</select></label>'+(rtPeopleError?'<small>'+esc(rtPeopleError)+'</small>':"")+(!rtPeople.length&&!rtPeopleError?'<small>Nenhum colaborador ativo encontrado.</small>':"")+'<div class="rt-picker-actions"><button type="button" class="rt-person-confirm" data-id="'+t.id+'"'+(!rtPeople.length?" disabled":"")+'>Confirmar</button><button type="button" class="rt-person-cancel" data-id="'+t.id+'">Cancelar</button></div></div>':"")+(rtCan("tasks.create")?'<button type="button" class="rt-clone-task" data-id="'+t.id+'">Clonar tarefa</button>':"")+rtHistory(t)+'</article></details>').join("")+(filtered.some(t=>t.status===key)?"":'<p class="rt-empty">Nenhuma tarefa</p>')+'</div>').join("")+'</div>')+
 '<p class="tasks-note">'+(rtSharedReady?'Quadro compartilhado no servidor. As tarefas pessoais são filtradas pelo usuário autenticado.':'Sincronização indisponível: '+esc(rtSyncError||'aguardando resposta')+'. Não faça alterações até restabelecer a conexão.')+'</p></section>';
}
document.addEventListener("change",async e=>{
 if(e.target.classList.contains("rt-upload")){const id=Number(e.target.dataset.id);if(!rtState.tasks.some(t=>t.id===id))return;for(const file of Array.from(e.target.files||[])){if(file.size>1024*1024){alert(file.name+": máximo de 1 MB nesta demonstração.");continue;}if(!/\\.(pdf|png|jpe?g|webp|txt|csv|docx?|xlsx?)$/i.test(file.name)){alert("Formato não permitido: "+file.name);continue;}const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error("Falha na leitura"));reader.readAsDataURL(file);});const entry={name:file.name,size:file.size,data};(rtAttachments[id]??=[]).push(entry);}try{rtSaveAttachments();}catch{}rtDraw();}

 if(e.target.id==="rt-search"){rtSearch=e.target.value;rtDraw();}
 if(e.target.id==="rt-priority"){rtPriority=e.target.value;rtDraw();}
 if(e.target.id==="rt-sort"){rtSort=e.target.value;rtDraw();}
 if(e.target.classList.contains("rt-check-toggle")){if(!rtRequire("tasks.checklist")){rtDraw();return;}const t=rtState.tasks.find(x=>x.id===Number(e.target.dataset.id));const c=t?.checklist?.[Number(e.target.dataset.index)];if(c){c.done=e.target.checked;rtLog(t,"Checklist atualizado",(c.done?"Concluiu: ":"Reabriu: ")+c.text);rtSave();rtDraw();}}
 if(e.target.id==="rt-view"){if(rtCurrentUser?.perfil!=="admin")return;rtView=e.target.value;rtProject=0;rtProjectStatusFilter="todos";rtDraw();}
 if(e.target.id==="rt-project"){rtProject=Number(e.target.value);rtProjectStatusFilter="todos";rtWorkspaceView="board";rtDraw();}
 if(e.target.classList.contains("rt-status"))rtChangeStatus(Number(e.target.dataset.id),e.target.value);
});
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.id==="rt-mode-mine"||b.id==="rt-mode-all"){rtBoardMode=b.id==="rt-mode-mine"&&rtBoardMode!=="mine"?"mine":"all";rtProject=0;rtDraw();return;}
  if(b.classList.contains("rt-download")){const a=rtAttachments[Number(b.dataset.id)]?.[Number(b.dataset.index)];if(a){const link=document.createElement("a");link.href=a.data;link.download=a.name;document.body.appendChild(link);link.click();link.remove();}return;}
 if(b.classList.contains("rt-remove-file")){const list=rtAttachments[Number(b.dataset.id)];if(list){list.splice(Number(b.dataset.index),1);rtSaveAttachments();rtDraw();}return;}
 if(b.classList.contains("rt-history-btn")){const id=Number(b.dataset.id);rtHistoryOpen=rtHistoryOpen===id?null:id;rtDraw();return;}
 if(b.classList.contains("rt-handoff")){if(!rtRequire("tasks.assign"))return;rtOpenPicker(Number(b.dataset.id),"handoff");return;}
 if(b.classList.contains("rt-person-cancel")){rtPicker=null;rtDraw();return;}
 if(b.classList.contains("rt-person-confirm")){
   if(!rtSharedReady||rtDirty||rtSyncing)return alert("Aguarde a sincronização antes de delegar.");if(!rtRequire("tasks.assign"))return;
   const t=rtState.tasks.find(x=>x.id===Number(b.dataset.id));if(!t||!rtPicker||rtPicker.taskId!==t.id)return;
   const selector=document.querySelector(".rt-person-select");const person=rtPeople.find(p=>p.id===Number(selector?.value));if(!person)return alert("Selecione um colaborador cadastrado.");
   let note="";if(rtPicker.kind==="handoff"){const response=prompt("Descreva a etapa concluída (opcional):","");if(response===null)return;note=response.trim().slice(0,600);}
   const previous=t.owner;t.owner=person.nome;t.ownerId=person.id;t.ownerEmail=person.email;
   if(rtPicker.kind==="handoff"){t.status="a_fazer";rtLog(t,"Etapa concluída e encaminhada",previous+" → "+person.nome+" ("+person.email+")"+(note?" | Entrega: "+note:""));rtHistoryOpen=t.id;}
   else rtLog(t,"Responsável alterado",previous+" → "+person.nome+" ("+person.email+")");
   rtPicker=null;rtSave();rtDraw();return;
 }
 const task=rtState.tasks.find(t=>t.id===Number(b.dataset.id));
 if(task&&b.classList.contains("rt-clone-task")){rtCloneTask(task);return;}
 if(task&&b.classList.contains("rt-priority-btn")){rtPriorityPickerId=rtPriorityPickerId===task.id?null:task.id;rtDraw();return;}
 if(task&&b.classList.contains("rt-priority-choice")){if(!rtRequire("tasks.priority"))return;const v=b.dataset.priority;if(!["baixa","normal","alta","urgente"].includes(v))return;const previous=task.priority||"normal";if(previous!==v){task.priority=v;rtLog(task,"Prioridade alterada",previous+" → "+v);rtSave();}rtPriorityPickerId=null;rtDraw();return;}
 if(task&&b.classList.contains("rt-checklist-add")){if(!rtRequire("tasks.checklist"))return;const v=prompt("Novo item do checklist:");if(!v?.trim())return;(task.checklist??=[]).push({text:v.trim().slice(0,200),done:false});rtLog(task,"Checklist adicionado",v.trim());rtSave();rtDraw();}
 if(task&&b.classList.contains("rt-comment-add")){if(!rtRequire("tasks.comment"))return;const v=prompt("Comentário:");if(!v?.trim())return;(task.comments??=[]).push(v.trim().slice(0,1000));rtLog(task,"Comentário registrado",v.trim().slice(0,1000));rtSave();rtDraw();}
 if(task&&b.classList.contains("rt-recurring")){if(!rtRequire("tasks.recurrence"))return;const v=prompt("Recorrência: nenhuma, diaria, semanal ou mensal",task.repeat||"nenhuma");if(v===null)return;if(!["nenhuma","diaria","semanal","mensal"].includes(v))return alert("Opção inválida");task.repeat=v;rtLog(task,"Recorrência configurada",v);rtSave();rtDraw();}
 if(b.classList.contains("rt-summary-card")){rtProjectStatusFilter=b.dataset.status;rtProject=0;rtDraw();return;}
 if(b.classList.contains("rt-project-dates-edit")){if(!rtRequire("projects.edit"))return;const p=rtState.projects.find(x=>x.id===Number(b.dataset.project));if(p)rtProjectForm(p);return;}
 if(b.classList.contains("rt-project-history-btn")){const id=Number(b.dataset.project);rtProjectHistoryId=rtProjectHistoryId===id?null:id;rtDraw();return;}
 if(b.dataset.rtWorkspace){
  rtWorkspaceView=b.dataset.rtWorkspace;
  if(rtWorkspaceView==="projects"){rtBoardMode="all";rtProject=0;rtProjectStatusFilter="todos";}
  rtDraw();document.querySelector('[data-rt-workspace="'+rtWorkspaceView+'"]')?.focus();return;
 }
 if(b.classList.contains("rt-focus-all")){rtProject=0;rtProjectStatusFilter="todos";rtDraw();document.getElementById("rt-project")?.focus();return;}
 if(b.classList.contains("rt-progress-select")){
  rtProject=Number(b.dataset.project);rtProjectStatusFilter="todos";rtWorkspaceView="board";
  rtSearch="";rtPriority="all";rtDraw();return;
 }
 if(b.id==="rt-trash-open"){rtTrashOpen=true;rtDraw();return;}
 if(b.id==="rt-trash-close"){rtTrashOpen=false;rtDraw();return;}
 if(b.classList.contains("rt-trash-restore")){if(rtCurrentUser?.perfil!=="admin")return alert("Acesso restrito.");const x=rtTrash.find(v=>v.trashId===b.dataset.trashId);if(!x)return;if(x.type==="project"){if(rtState.projects.some(p=>p.id===x.project.id))return alert("Já existe um projeto com esse identificador.");rtState.projects.push(x.project);rtState.tasks.push(...x.tasks.filter(t=>!rtState.tasks.some(a=>a.id===t.id)));}else{if(!rtState.projects.some(p=>p.id===x.task.projectId))return alert("Restaure primeiro o projeto original.");if(rtState.tasks.some(t=>t.id===x.task.id))return alert("Já existe uma tarefa com esse identificador.");rtState.tasks.push(x.task);}rtTrash=rtTrash.filter(v=>v!==x);rtTrashSave();rtSave();rtDraw();return;}
 if(b.classList.contains("rt-trash-purge")){if(rtCurrentUser?.perfil!=="admin")return alert("Acesso restrito.");const x=rtTrash.find(v=>v.trashId===b.dataset.trashId);if(!x||!confirm("Excluir definitivamente este item da lixeira? Não será possível recuperar."))return;rtTrash=rtTrash.filter(v=>v!==x);rtTrashSave();rtDraw();return;}
 if(b.id==="rt-archive-project"||b.id==="rt-archive-view"||b.classList.contains("rt-unarchive-project")){if(rtCurrentUser?.perfil!=="admin")return;if(b.id==="rt-archive-view"){document.getElementById("rt-archive-dialog")?.remove();const d=document.createElement("dialog");d.id="rt-archive-dialog";d.style.cssText="max-width:700px;width:90%;max-height:80vh;overflow:auto;padding:24px;border-radius:12px";const projects=rtState.projects.filter(p=>p.archivedAt);d.innerHTML='<h3>Projetos arquivados</h3>'+(projects.length?projects.map(p=>'<details><summary>'+esc(p.name)+'</summary><p>'+esc(p.description||"")+'</p><small>Arquivado em '+new Date(p.archivedAt).toLocaleDateString("pt-BR")+'</small>'+rtState.tasks.filter(t=>t.projectId===p.id).map(t=>'<details><summary>'+esc(t.title)+' · '+esc(rtStatus[t.status]||t.status)+'</summary>'+rtHistory(t)+'</details>').join("")+rtProjectHistory(p)+'<button type="button" class="rt-unarchive-project" data-id="'+p.id+'">Desarquivar projeto</button></details>').join(""):'<p>Nenhum projeto arquivado.</p>')+'<button type="button" id="rt-archive-close">Fechar</button>';document.body.append(d);d.querySelector("#rt-archive-close").onclick=()=>d.close();d.addEventListener("close",()=>d.remove());d.showModal();return;}if(!rtSharedReady||rtDirty||rtSyncing)return alert("Aguarde a sincronização.");const restore=b.classList.contains("rt-unarchive-project");const p=rtState.projects.find(p=>p.id===(restore?Number(b.dataset.id):rtProject));if(!p)return alert("Selecione um projeto primeiro.");if(restore){delete p.archivedAt;rtProjectAudit(p,"Projeto desarquivado","Retornou ao quadro ativo");document.getElementById("rt-archive-dialog")?.close();}else{if(p.archivedAt||!confirm("Arquivar o projeto "+p.name+"?"))return;p.archivedAt=new Date().toISOString();rtProjectAudit(p,"Projeto arquivado","Retirado do quadro ativo");rtProject=0;}rtSave();rtDraw();return;}
 if(b.id==="rt-delete-project"){if(rtCurrentUser?.perfil!=="admin")return alert("Exclusão de projetos restrita ao administrador.");const p=rtState.projects.find(x=>x.id===rtProject);if(!p)return alert("Selecione um projeto primeiro.");const tasks=rtState.tasks.filter(t=>t.projectId===p.id);if(!confirm('Mover o projeto "'+p.name+'" e suas '+tasks.length+' tarefas para a lixeira por 30 dias?'))return;rtTrash.push({trashId:String(Date.now())+"-p-"+p.id,type:"project",project:p,tasks,deletedAt:new Date().toISOString()});rtTrashSave();rtState.tasks=rtState.tasks.filter(t=>t.projectId!==p.id);rtState.projects=rtState.projects.filter(x=>x.id!==p.id);rtProject=0;rtSave();rtDraw();return;}
 if(b.classList.contains("rt-move-project")){
 if(rtCurrentUser?.perfil!=="admin"||!rtSharedReady||rtDirty||rtSyncing)return;
 const t=rtState.tasks.find(x=>x.id===Number(b.dataset.id));if(!t)return;
 const destinations=rtState.projects.filter(p=>!p.archivedAt&&p.id!==t.projectId);
 if(!destinations.length)return alert("Nenhum outro projeto ativo disponível.");
 const d=document.createElement("dialog");d.style.cssText="width:min(440px,90vw);padding:24px;border-radius:12px";
 d.innerHTML='<h3>Mover para outro projeto</h3><label>Projeto de destino <select style="width:100%"><option value="">Selecione</option>'+destinations.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join("")+'</select></label><p><button type="button" data-confirm>Transferir tarefa</button> <button type="button" data-cancel>Cancelar</button></p>';
 document.body.append(d);d.addEventListener("close",()=>d.remove());d.querySelector("[data-cancel]").onclick=()=>d.close();d.querySelector("[data-confirm]").onclick=()=>{if(!rtSharedReady||rtDirty||rtSyncing||rtCurrentUser?.perfil!=="admin")return alert("Aguarde a sincronização.");const current=rtState.tasks.find(x=>x.id===t.id);const dest=rtState.projects.find(p=>p.id===Number(d.querySelector("select").value)&&!p.archivedAt);if(!current||!dest||dest.id===current.projectId)return;const old=rtState.projects.find(p=>p.id===current.projectId)?.name||"Projeto";current.projectId=dest.id;rtLog(current,"Projeto alterado",old+" → "+dest.name);d.close();rtSave();rtDraw();};d.showModal();return;
 }
 if(b.classList.contains("rt-rename-task")){if(rtCurrentUser?.perfil!=="admin"||!rtSharedReady||rtDirty||rtSyncing)return;const t=rtState.tasks.find(x=>x.id===Number(b.dataset.id));if(!t)return;const v=prompt("Novo nome da tarefa:",t.title);if(!v?.trim()||v.trim()===t.title)return;const old=t.title;t.title=v.trim().slice(0,220);rtLog(t,"Tarefa renomeada",old+" → "+t.title);rtSave();rtDraw();return;}
 if(b.classList.contains("rt-delete-task")){if(!rtRequire("tasks.delete"))return;if(rtCurrentUser?.perfil!=="admin")return alert("Apenas administradores podem excluir tarefas.");const t=rtState.tasks.find(x=>x.id===Number(b.dataset.id));if(!t||!confirm('Mover a tarefa "'+t.title+'" para a lixeira por 30 dias?'))return;rtTrash.push({trashId:String(Date.now())+"-t-"+t.id,type:"task",task:t,deletedAt:new Date().toISOString()});rtTrashSave();rtState.tasks=rtState.tasks.filter(x=>x.id!==t.id);rtSave();rtDraw();return;}
 if(b.id==="rt-new-project"){if(!rtRequire("projects.create"))return;rtProjectForm(null);return;}
 if(b.id==="rt-new-task"||b.classList.contains("rt-focus-create")){if(!rtRequire("tasks.create"))return;if(!rtState.projects.length)return alert("Crie um projeto primeiro.");rtTaskForm(null);return;}
 if(b.classList.contains("rt-delegate")){if(!rtRequire("tasks.assign"))return;const t=rtState.tasks.find(x=>x.id===Number(b.dataset.id));if(t)rtTaskForm(t);return;}
});

/* Formulário de projeto: histórico local de mudanças de campos */
document.addEventListener("click",e=>{if(e.target.id==="rt-project-cancel"||e.target.id==="rt-project-cancel-bottom"||e.target.id==="rt-project-overlay"){document.getElementById("rt-project-overlay")?.remove();rtProjectDialogId=null;}});
document.addEventListener("submit",e=>{if(e.target.id!=="rt-project-form")return;e.preventDefault();if(!rtRequire(rtProjectDialogId?"projects.edit":"projects.create"))return;const form=e.target;const name=form.elements.name.value.trim(),description=form.elements.description.value.trim(),startDate=form.elements.startDate.value,endDate=form.elements.endDate.value;if(!name)return alert("Informe o nome do projeto.");if(startDate&&endDate&&endDate<startDate)return alert("A entrega não pode ser anterior ao início.");let p=rtProjectDialogId?rtState.projects.find(x=>x.id===rtProjectDialogId):null;if(rtProjectDialogId&&!p)return alert("Projeto não encontrado.");if(!p){p={id:Date.now(),name,description,startDate,endDate,createdBy:rtActor(),createdById:rtCurrentUser?.id,history:[]};rtProjectAudit(p,"Projeto criado","Início: "+rtDateLabel(startDate)+"; entrega: "+rtDateLabel(endDate)+"; descrição: "+(description||"Não informada"));rtState.projects.push(p);rtProject=p.id;}else{for(const [field,label,next] of [["name","Nome",name],["description","Descrição",description],["startDate","Data de início",startDate],["endDate","Prazo de entrega",endDate]]){const old=p[field]||"";if(old!==next){rtProjectAudit(p,label+" alterado",((field==="startDate"||field==="endDate")?rtDateLabel(old):old||"Não informado")+" → "+((field==="startDate"||field==="endDate")?rtDateLabel(next):next||"Não informado"));p[field]=next;}}}rtSave();document.getElementById("rt-project-overlay")?.remove();rtProjectDialogId=null;rtDraw();});

/* Calendário nativo para prazo de criação e edição de tarefas */
document.addEventListener("click",e=>{if(e.target.classList?.contains("rt-task-cancel")||e.target.id==="rt-task-overlay")document.getElementById("rt-task-overlay")?.remove();});
document.addEventListener("submit",e=>{if(e.target.id!=="rt-task-form")return;e.preventDefault();if(!rtRequire(Number(e.target.dataset.taskId)?"tasks.due":"tasks.create"))return;const form=e.target,due=form.elements.due.value,id=Number(form.dataset.taskId);if(due&&!rtValidDate(due))return alert("Selecione uma data válida.");if(id){const t=rtState.tasks.find(x=>x.id===id);if(!t)return alert("Tarefa não encontrada.");const previous=t.due||"";if(previous!==due){t.due=due;rtLog(t,"Prazo alterado","De "+rtDateLabel(previous)+" para "+rtDateLabel(due));}rtSave();document.getElementById("rt-task-overlay")?.remove();rtDraw();rtOpenPicker(t.id,"delegate");}else{const title=form.elements.title.value.trim();if(!title)return alert("Informe a descrição da tarefa.");const projectId=rtProject||rtState.projects.find(p=>!p.archivedAt)?.id;if(!projectId)return alert("Crie um projeto primeiro.");const t={id:Date.now(),projectId,title:title.slice(0,220),owner:rtCurrentUser?.nome||"Administrador",ownerId:rtCurrentUser?.id||null,ownerEmail:rtCurrentUser?.email||"",createdBy:rtActor(),createdById:rtCurrentUser?.id,status:"a_fazer",due,manager:rtActor(),note:"",priority:"normal",checklist:[],comments:[]};rtLog(t,"Tarefa criada","Delegada para "+t.owner+"; prazo: "+rtDateLabel(due));rtState.tasks.push(t);rtSave();document.getElementById("rt-task-overlay")?.remove();rtDraw();}});
