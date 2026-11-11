"use strict";
const $=id=>document.getElementById(id), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const names={documentos:"Documentos",comunicados:"Comunicados",treinamentos:"Treinamentos",ferramentas:"Ferramentas",pcp:"PCP",tarefas:"Gestão de Tarefas",almoxarifado:"Almoxarifado",qualidade:"Setor Teste de Qualidade",rh:"RH",seguranca:"Segurança do Trabalho",aplicativos:"Central de Aplicativos",contatos:"Contatos",suporte:"Suporte / TI"};
let data=[];
const recursoUrl=x=>{try{const u=new URL(String(x.url||""));return u.protocol==="https:"?u.href:null;}catch{return null;}};
const cardRecurso=x=>{const url=recursoUrl(x);return '<article class="item"><div class="placeholder">Rodrinox Pro</div><div class="body"><b>'+esc(x.nome)+'</b><p>'+esc(x.descricao||"")+':</p>'+(url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Abrir recurso ↗</a>':'<span>Sem link disponível</span>')+'</div></article>';};
const logo=document.querySelector(".brand-logo");if(logo){logo.addEventListener("load",()=>{document.querySelector(".brand-fallback").hidden=true;});logo.addEventListener("error",()=>{logo.hidden=true;document.querySelector(".brand-fallback").hidden=false;});}
async function read(endpoint){const r=await fetch("/colaborador/api/"+endpoint,{credentials:"same-origin",method:"GET",headers:{"Accept":"application/json"}});if(r.status===401){location.assign("/colaborador/");throw Error("Sessão expirada");}if(!r.ok)throw Error("Falha de leitura "+r.status);return r.json();}
function openTab(tab){$("home").hidden=tab!=="inicio";$("hero").hidden=tab!=="inicio";$("details").hidden=tab==="inicio";document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));if(tab!=="inicio"){$("items").classList.remove("contacts-list");$("sectionTitle").textContent=names[tab]||tab;const items=data.filter(x=>x.categoria===tab);if(tab==="tarefas"){$("items").innerHTML=renderTarefas();rtLoadPeople();}else if(["documentos","comunicados","treinamentos","ferramentas","pcp","almoxarifado","qualidade","rh","seguranca"].includes(tab)){$("items").innerHTML=items.length?items.map(x=>{const url=recursoUrl(x)||"#";return '<article class="item">'+(/meister\s*task/i.test(String(x.nome||''))?'<div class="brand-meistertask" role="img" aria-label="MeisterTask"><span class="meistertask-mark">M</span><span class="meistertask-word">MeisterTask</span></div>':(x.imagem_url?'<img src="'+esc(x.imagem_url)+'" alt="">':'<div class="placeholder">Rodrinox Pro</div>'))+'<div class="body"><b>'+esc(x.nome)+'</b><p>'+esc(x.descricao||"")+'</p>'+(url!=="#"?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Abrir recurso ↗</a>':'<span>Sem link disponível</span>')+'</div></article>'}).join(""):'<p class="empty">Nenhum item disponível para seu perfil.</p>';}else if(tab==="aplicativos"){$("items").innerHTML='<article class="item"><div class="isic-app-visual" role="img" aria-label="Intelbras iSIC Lite"><div class="isic-app-icon"><svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect x="10" y="17" width="32" height="30" rx="7" fill="none" stroke="currentColor" stroke-width="5"/><path d="M42 27 55 20v24L42 37" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><circle cx="26" cy="32" r="7" fill="none" stroke="currentColor" stroke-width="4"/></svg></div><span class="isic-app-name">iSIC Lite</span></div><div class="body"><b>Intelbras iSIC Lite</b><p>Acesso ao aplicativo de câmeras. A abertura nativa depende do dispositivo.</p><a href="https://play.google.com/store/apps/details?id=com.intelbras.isiclite" target="_blank" rel="noopener noreferrer">Google Play</a></div></article>';}else if(tab==="suporte"){$("items").innerHTML='<article class="item"><div class="body"><b>Suporte / TI</b><p>Para solicitar atendimento, utilize o e-mail oficial de suporte da Rodrinox Pro.</p><p><a href="mailto:suporte@rodrinoxpro.com.br?subject=Solicita%C3%A7%C3%A3o%20de%20suporte%20TI%20-%20Rodrinox%20Pro">Enviar solicitação para suporte@rodrinoxpro.com.br ↗</a></p></div></article>';}else if(tab==="contatos"){mostrarContatos();}else{$("items").innerHTML='<p class="empty">Este módulo ainda não está habilitado para homologação.</p>';}}$("menuToggle").closest(".work").previousElementSibling.classList.remove("open");window.scrollTo(0,0);}
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


/* Rodrinox Tasks: protótipo interativo de homologação, com dados locais deste navegador.
   NÃO representa persistência multiusuário nem substitui a API protegida do servidor. */
const rtStoreKey="rodrinox-tasks-demo-v1";
const rtSeed={projects:[{id:1,name:"PCP — Projeto piloto"}],tasks:[
{id:1,projectId:1,title:"Conferir materiais da OP-1024",owner:"Frank",status:"a_fazer",due:"",manager:"Administrador",note:""},
{id:2,projectId:1,title:"Atualizar relatório de produção",owner:"Frank",status:"andamento",due:"",manager:"Administrador",note:""},
{id:3,projectId:1,title:"Validar documentação técnica",owner:"Administrador",status:"revisao",due:"",manager:"Administrador",note:""}]};
let rtState;
try{const stored=JSON.parse(localStorage.getItem(rtStoreKey)||"null");rtState=stored&&Array.isArray(stored.projects)&&Array.isArray(stored.tasks)?stored:structuredClone(rtSeed);}catch{rtState=structuredClone(rtSeed);}
const rtAttachmentStore="rodrinox-tasks-demo-attachments-v1";
let rtAttachments={};try{rtAttachments=JSON.parse(sessionStorage.getItem(rtAttachmentStore)||"{}")||{};}catch{}
const rtSaveAttachments=()=>{try{sessionStorage.setItem(rtAttachmentStore,JSON.stringify(rtAttachments));}catch{}};
let rtSearch="",rtPriority="all",rtSort="default";
let rtPeople=[],rtPeopleError="",rtPicker=null;
async function rtLoadPeople(){try{const result=await read("tarefas/responsaveis");if(!Array.isArray(result))throw Error("Resposta inválida");rtPeople=result.filter(p=>Number.isSafeInteger(Number(p.id))&&p.nome&&p.email);rtPeopleError="";}catch(e){rtPeople=[];rtPeopleError="Não foi possível carregar os colaboradores cadastrados.";console.error("[tarefas] diretório",e);}rtDraw();}
function rtOpenPicker(taskId,kind){rtPicker={taskId,kind};rtDraw();}
function rtPersonLabel(p){return p.nome+" · "+p.departamento+" · "+p.email;}
let rtHistoryOpen=null;
const rtActor=()=>rtView==="frank"?"Frank (simulação)":"Administrador (simulação)";
function rtLog(task,event,details=""){(task.history??=[]).push({at:new Date().toISOString(),actor:rtActor(),event,details});}
function rtHistory(task){const history=task.history?.length?task.history:[{at:null,actor:"Demonstração",event:"Tarefa inicial do protótipo",details:"Eventos anteriores não foram registrados."}];return '<div class="rt-history-panel"><h4>Linha do tempo</h4>'+history.map(h=>'<div class="rt-history-event"><strong>'+esc(h.event)+'</strong><small>'+esc(h.actor)+' · '+(h.at?new Date(h.at).toLocaleString("pt-BR"):"Sem data")+'</small>'+(h.details?'<p>'+esc(h.details)+'</p>':"")+'</div>').join("")+'</div>';}
let rtView="admin",rtProject=0;
const rtStatus={a_fazer:"A fazer",andamento:"Em andamento",revisao:"Em revisão",concluida:"Concluída"};
const rtSave=()=>{try{localStorage.setItem(rtStoreKey,JSON.stringify(rtState));}catch{}};
function rtDraw(){const root=document.querySelector("#items .tasks-shell");if(root)root.outerHTML=renderTarefas();}
function renderTarefas(){
 const visible=rtState.tasks.filter(t=>(!rtProject||t.projectId===rtProject)&&(rtView!=="frank"||t.owner==="Frank"));
 const filtered=visible.filter(t=>(!rtSearch||(t.title+" "+(t.note||"")+" "+t.owner).toLowerCase().includes(rtSearch.toLowerCase()))&&(rtPriority==="all"||(t.priority||"normal")===rtPriority));if(rtSort==="due")filtered.sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999"));const total=filtered.length,done=filtered.filter(t=>t.status==="concluida").length;
 return '<section class="tasks-shell"><div class="tasks-heading"><div><span class="tasks-eyebrow">RODRINOX TASKS · HOMOLOGAÇÃO</span><h2>Gestão de Tarefas</h2><p>Delegue, acompanhe e receba as tarefas concluídas.</p></div><span class="tasks-connection">Modo demonstração · dados locais</span></div>'+
 '<div class="tasks-toolbar"><label>Visualizar como <select id="rt-view"><option value="admin"'+(rtView==="admin"?" selected":"")+'>Administrador</option><option value="frank"'+(rtView==="frank"?" selected":"")+'>Frank (simulação)</option></select></label><label>Projeto <select id="rt-project"><option value="0">Todos os projetos</option>'+rtState.projects.map(p=>'<option value="'+p.id+'"'+(rtProject===p.id?" selected":"")+'>'+esc(p.name)+'</option>').join("")+'</select></label><button type="button" id="rt-new-project">+ Novo projeto</button><button type="button" id="rt-new-task">+ Nova tarefa</button></div>'+
 '<div class="rt-filterbar"><label>Buscar <input id="rt-search" placeholder="Título, responsável, descrição..." value="'+esc(rtSearch)+'"></label><label>Prioridade <select id="rt-priority"><option value="all">Todas</option>'+["baixa","normal","alta","urgente"].map(p=>'<option value="'+p+'"'+(rtPriority===p?" selected":"")+'>'+p+'</option>').join("")+'</select></label><label>Ordenação <select id="rt-sort"><option value="default">Padrão</option><option value="due"'+(rtSort==="due"?" selected":"")+'>Prazo mais próximo</option></select></label></div><div class="tasks-stats"><div><small>Tarefas visíveis</small><strong>'+total+'</strong></div><div><small>Pendentes</small><strong>'+filtered.filter(t=>t.status!=="concluida").length+'</strong></div><div><small>Em andamento</small><strong>'+filtered.filter(t=>t.status==="andamento").length+'</strong></div><div><small>Concluídas</small><strong>'+done+'</strong></div></div>'+
 '<div class="tasks-board">'+Object.entries(rtStatus).map(([key,label])=>'<div class="tasks-column"><h3>'+label+' <small>'+filtered.filter(t=>t.status===key).length+'</small></h3>'+filtered.filter(t=>t.status===key).map(t=>'<article class="rt-card"><strong>'+esc(t.title)+'</strong><small>'+esc(rtState.projects.find(p=>p.id===t.projectId)?.name||"Projeto")+'</small><small>Responsável: '+esc(t.owner)+'</small>'+(t.due?'<small>Prazo: '+esc(t.due)+'</small>':'')+(t.note?'<small>'+esc(t.note)+'</small>':'')+(t.repeat?'<small>Recorrência: '+esc(t.repeat)+'</small>':'')+(t.comments||[]).map(c=>'<small class="rt-comment">Comentário: '+esc(c)+'</small>').join("")+(t.checklist||[]).map((c,i)=>'<label class="rt-check"><input type="checkbox" class="rt-check-toggle" data-id="'+t.id+'" data-index="'+i+'"'+(c.done?" checked":"")+'> '+esc(c.text)+'</label>').join("")+'<div class="rt-attachments"><strong>Anexos e documentos</strong>'+(rtAttachments[t.id]||[]).map((a,i)=>'<div class="rt-attachment-row"><span title="'+esc(a.name)+'">'+esc(a.name)+' · '+Math.round(a.size/1024)+' KB</span><button type="button" class="rt-download" data-id="'+t.id+'" data-index="'+i+'">Baixar</button><button type="button" class="rt-remove-file" data-id="'+t.id+'" data-index="'+i+'">Excluir</button></div>').join("")+'<label class="rt-upload-label">+ Anexar documentos<input class="rt-upload" type="file" data-id="'+t.id+'" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx" multiple></label><small>Demo: até 1 MB por arquivo; anexos temporários desta sessão.</small></div>'+'<label>Status <select class="rt-status" data-id="'+t.id+'">'+Object.entries(rtStatus).map(([v,n])=>'<option value="'+v+'"'+(v===t.status?" selected":"")+'>'+n+'</option>').join("")+'</select></label>'+(rtView==="admin"?'<button type="button" class="rt-delegate" data-id="'+t.id+'">Delegar / editar</button><button type="button" class="rt-priority-btn" data-id="'+t.id+'">Prioridade</button><button type="button" class="rt-checklist-add" data-id="'+t.id+'">+ Checklist</button><button type="button" class="rt-comment-add" data-id="'+t.id+'">+ Comentário</button><button type="button" class="rt-recurring" data-id="'+t.id+'">Recorrência</button><button type="button" class="rt-history-btn" data-id="'+t.id+'">Histórico ('+(t.history?.length||0)+')</button><button type="button" class="rt-handoff" data-id="'+t.id+'">Concluir etapa e encaminhar</button>':'')+(rtPicker?.taskId===t.id?'<div class="rt-person-picker"><strong>'+(rtPicker.kind==="handoff"?"Encaminhar próxima etapa":"Selecionar responsável")+'</strong><label>Colaborador cadastrado <select class="rt-person-select"><option value="">Selecione um colaborador</option>'+rtPeople.map(p=>'<option value="'+p.id+'">'+esc(rtPersonLabel(p))+'</option>').join("")+'</select></label>'+(rtPeopleError?'<small>'+esc(rtPeopleError)+'</small>':"")+(!rtPeople.length&&!rtPeopleError?'<small>Nenhum colaborador ativo encontrado.</small>':"")+'<div class="rt-picker-actions"><button type="button" class="rt-person-confirm" data-id="'+t.id+'"'+(!rtPeople.length?" disabled":"")+'>Confirmar</button><button type="button" class="rt-person-cancel" data-id="'+t.id+'">Cancelar</button></div></div>':"")+(rtHistoryOpen===t.id?rtHistory(t):"")+'</article>').join("")+(filtered.some(t=>t.status===key)?"":'<p class="rt-empty">Nenhuma tarefa</p>')+'</div>').join("")+'</div>'+
 '<p class="tasks-note">Demonstração no navegador: alterações não são compartilhadas entre colaboradores. A versão definitiva usará o banco de dados, autenticação e permissões do Portal Rodrinox.</p></section>';
}
document.addEventListener("change",async e=>{
 if(e.target.classList.contains("rt-upload")){const id=Number(e.target.dataset.id);if(!rtState.tasks.some(t=>t.id===id))return;for(const file of Array.from(e.target.files||[])){if(file.size>1024*1024){alert(file.name+": máximo de 1 MB nesta demonstração.");continue;}if(!/\\.(pdf|png|jpe?g|webp|txt|csv|docx?|xlsx?)$/i.test(file.name)){alert("Formato não permitido: "+file.name);continue;}const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error("Falha na leitura"));reader.readAsDataURL(file);});const entry={name:file.name,size:file.size,data};(rtAttachments[id]??=[]).push(entry);}try{rtSaveAttachments();}catch{}rtDraw();}

 if(e.target.id==="rt-search"){rtSearch=e.target.value;rtDraw();}
 if(e.target.id==="rt-priority"){rtPriority=e.target.value;rtDraw();}
 if(e.target.id==="rt-sort"){rtSort=e.target.value;rtDraw();}
 if(e.target.classList.contains("rt-check-toggle")){const t=rtState.tasks.find(x=>x.id===Number(e.target.dataset.id));const c=t?.checklist?.[Number(e.target.dataset.index)];if(c){c.done=e.target.checked;rtLog(t,"Checklist atualizado",(c.done?"Concluiu: ":"Reabriu: ")+c.text);rtSave();rtDraw();}}
 if(e.target.id==="rt-view"){rtView=e.target.value;rtDraw();}
 if(e.target.id==="rt-project"){rtProject=Number(e.target.value);rtDraw();}
 if(e.target.classList.contains("rt-status")){const t=rtState.tasks.find(t=>t.id===Number(e.target.dataset.id));if(t){const previous=t.status;t.status=e.target.value;if(previous!==t.status)rtLog(t,"Status alterado",rtStatus[previous]+" → "+rtStatus[t.status]);rtSave();rtDraw();}}
});
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.classList.contains("rt-download")){const a=rtAttachments[Number(b.dataset.id)]?.[Number(b.dataset.index)];if(a){const link=document.createElement("a");link.href=a.data;link.download=a.name;document.body.appendChild(link);link.click();link.remove();}return;}
 if(b.classList.contains("rt-remove-file")){const list=rtAttachments[Number(b.dataset.id)];if(list){list.splice(Number(b.dataset.index),1);rtSaveAttachments();rtDraw();}return;}
 if(b.classList.contains("rt-history-btn")){const id=Number(b.dataset.id);rtHistoryOpen=rtHistoryOpen===id?null:id;rtDraw();return;}
 if(b.classList.contains("rt-handoff")){rtOpenPicker(Number(b.dataset.id),"handoff");return;}
 if(b.classList.contains("rt-person-cancel")){rtPicker=null;rtDraw();return;}
 if(b.classList.contains("rt-person-confirm")){
   const t=rtState.tasks.find(x=>x.id===Number(b.dataset.id));if(!t||!rtPicker||rtPicker.taskId!==t.id)return;
   const selector=document.querySelector(".rt-person-select");const person=rtPeople.find(p=>p.id===Number(selector?.value));if(!person)return alert("Selecione um colaborador cadastrado.");
   let note="";if(rtPicker.kind==="handoff"){const response=prompt("Descreva a etapa concluída (opcional):","");if(response===null)return;note=response.trim().slice(0,600);}
   const previous=t.owner;t.owner=person.nome;t.ownerId=person.id;t.ownerEmail=person.email;
   if(rtPicker.kind==="handoff"){t.status="a_fazer";rtLog(t,"Etapa concluída e encaminhada",previous+" → "+person.nome+" ("+person.email+")"+(note?" | Entrega: "+note:""));rtHistoryOpen=t.id;}
   else rtLog(t,"Responsável alterado",previous+" → "+person.nome+" ("+person.email+")");
   rtPicker=null;rtSave();rtDraw();return;
 }
 const task=rtState.tasks.find(t=>t.id===Number(b.dataset.id));
 if(task&&b.classList.contains("rt-priority-btn")){const v=prompt("Prioridade: baixa, normal, alta ou urgente",task.priority||"normal");if(v===null)return;if(!["baixa","normal","alta","urgente"].includes(v))return alert("Prioridade inválida");const previous=task.priority||"normal";task.priority=v;rtLog(task,"Prioridade alterada",previous+" → "+v);rtSave();rtDraw();}
 if(task&&b.classList.contains("rt-checklist-add")){const v=prompt("Novo item do checklist:");if(!v?.trim())return;(task.checklist??=[]).push({text:v.trim().slice(0,200),done:false});rtLog(task,"Checklist adicionado",v.trim());rtSave();rtDraw();}
 if(task&&b.classList.contains("rt-comment-add")){const v=prompt("Comentário:");if(!v?.trim())return;(task.comments??=[]).push(v.trim().slice(0,1000));rtLog(task,"Comentário registrado",v.trim().slice(0,1000));rtSave();rtDraw();}
 if(task&&b.classList.contains("rt-recurring")){const v=prompt("Recorrência: nenhuma, diaria, semanal ou mensal",task.repeat||"nenhuma");if(v===null)return;if(!["nenhuma","diaria","semanal","mensal"].includes(v))return alert("Opção inválida");task.repeat=v;rtLog(task,"Recorrência configurada",v);rtSave();rtDraw();}
 if(b.id==="rt-new-project"){const name=prompt("Nome do novo projeto:");if(!name?.trim())return;const project={id:Date.now(),name:name.trim().slice(0,160),createdBy:rtActor()};rtState.projects.push(project);rtProject=project.id;rtSave();rtDraw();}
 if(b.id==="rt-new-task"){if(!rtState.projects.length)return alert("Crie um projeto primeiro.");const title=prompt("Descrição da tarefa:");if(!title?.trim())return;const projectId=rtProject||rtState.projects[0].id;const t={id:Date.now(),projectId,title:title.trim().slice(0,220),owner:rtView==="frank"?"Frank":"Administrador",status:"a_fazer",due:"",manager:rtActor(),note:"",priority:"normal",checklist:[],comments:[]};rtLog(t,"Tarefa criada","Delegada para "+t.owner);rtState.tasks.push(t);rtSave();rtDraw();}
 if(b.classList.contains("rt-delegate")){const t=rtState.tasks.find(x=>x.id===Number(b.dataset.id));if(!t)return;const due=prompt("Prazo (AAAA-MM-DD, opcional):",t.due||"");if(due===null)return;if(due&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(due))return alert("Use AAAA-MM-DD.");t.due=due;rtLog(t,"Dados da tarefa editados","Prazo: "+(due||"não definido"));rtSave();rtOpenPicker(t.id,"delegate");}
});
