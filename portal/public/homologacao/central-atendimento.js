"use strict";
(function(){
const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let selected="meus",status=null,records=[],active=null,loading=false,error="",team=null,assignments=[],currentUser=null,lastSync=null,contactsById=new Map(),digiUserId=null,digiMatchStatus="",ticketDiagnostics="",searchTerm="";
const rows=p=>Array.isArray(p)?p:Array.isArray(p?.rows)?p.rows:Array.isArray(p?.data)?p.data:Array.isArray(p?.items)?p.items:Array.isArray(p?.results)?p.results:[];
const nameOf=r=>{const c=contactsById.get(String(r.contactId||r.contact?.id))||r.contact||{};return c.name||c.internalName||r.contactName||c.number||r.customer?.name||r.name||r.internalName||r.number||("Chamado #"+(r.protocol||String(r.id||"").slice(0,8)))};
async function resolveDigiUser(){
 digiUserId=null;digiMatchStatus="";
 try{
  const [meRes,usersRes]=await Promise.all([
   fetch("/colaborador/api/eu",{credentials:"same-origin",cache:"no-store"}),
   fetch("/colaborador/api/atendimento/consultar/users",{credentials:"same-origin",cache:"no-store"})
  ]);
  if(!meRes.ok||!usersRes.ok){digiMatchStatus="Não foi possível consultar os usuários da DigiSac.";return}
  const me=await meRes.json(),users=rows(await usersRes.json());
  const email=String(me.email||"").trim().toLowerCase();
  const matches=users.filter(u=>String(u.email||"").trim().toLowerCase()===email);
  if(matches.length===1){digiUserId=String(matches[0].id);digiMatchStatus="Atendente DigiSac identificado pelo e-mail."}
  else digiMatchStatus=matches.length?"Há cadastros duplicados para este e-mail na DigiSac.":"Seu e-mail não foi encontrado entre os usuários consultados da DigiSac.";
 }catch(e){digiMatchStatus="Não foi possível identificar seu usuário na DigiSac."}
}
async function load(){loading=true;error="";ticketDiagnostics="";draw();try{const kind=selected==="contatos"?"contacts":"tickets";const res=await fetch("/colaborador/api/atendimento/consultar/"+kind,{credentials:"same-origin",cache:"no-store"});const data=await res.json();if(!res.ok)throw Error(data.erro+(data.codigo?" (HTTP "+data.codigo+")":""));records=rows(data);if(kind==="tickets"){records=records.filter(r=>r.isOpen===true||r.isOpen===1||r.isOpen==="true");try{const cr=await fetch("/colaborador/api/atendimento/consultar/contacts",{credentials:"same-origin",cache:"no-store"});if(cr.ok){for(const c of rows(await cr.json()))contactsById.set(String(c.id),c)}}catch(e){console.warn("Nomes de contatos indisponíveis")}}if(selected==="fila"){records=records.filter(r=>!([r.userId,r.assignedUserId,r.attendantId,r.operatorId,r.agentId,r.responsibleId,r.assignedToId,r.user?.id,r.assignedUser?.id,r.currentTicketTransfer?.userId].some(Boolean))&&!assignments.some(a=>String(a.contato_digisac)===String(r.contactId||r.contact?.id||r.id)&&a.usuario_id))}if(selected==="meus"){const all=records;const keys=["userId","assignedUserId","attendantId","operatorId","agentId","responsibleId","assignedToId","currentUserId"];const nested=["user","assignedUser","attendant","operator","agent","responsible","assignedTo","currentTicketTransfer"];const ids=r=>[...keys.map(k=>r[k]),...nested.flatMap(k=>[r[k]?.id,r[k]?.userId,r[k]?.assignedUserId])].filter(v=>v!==null&&v!==undefined&&v!=="").map(String);records=all.filter(r=>(digiUserId!==null&&ids(r).includes(digiUserId))||assignments.some(a=>String(a.contato_digisac)===String(r.contactId||r.contact?.id||r.id)&&Number(a.usuario_id)===Number(currentUser?.id)));const fields=[...new Set(all.slice(0,20).flatMap(r=>Object.keys(r).filter(k=>/user|agent|attend|operat|respons|assign|transfer/i.test(k))))];ticketDiagnostics="Chamados abertos: "+all.length+" · correspondências: "+records.length+" · campos: "+(fields.join(", ")||"não identificados");}active=records.find(r=>String(r.id)===String(active?.id))||null;}catch(e){records=[];error=e.message}finally{loading=false;lastSync=new Date();draw();if(active)openRecord(active.id,false)}}
const messageText=m=>{
  const candidates=[m.text,m.body,m.content?.text,m.content?.body,m.data?.text,m.data?.body,m.message?.text,m.message?.body];
  const v=candidates.find(x=>typeof x==="string"&&x.trim());
  return v||"";
};
const messageType=m=>String(m.type||m.event||m.kind||"").toLowerCase();
const isMessage=m=>{
  const type=messageType(m);
  if(["ticket","user","contact","call_log","department","transfer","document","status","system"].includes(type))return false;
  return Boolean(messageText(m))||["message","chat","text","audio","image","video","file"].includes(type);
};
const messageTime=m=>{const v=m.sentAt||m.createdAt||m.timestamp||m.date;if(!v)return "";const d=new Date(v);return Number.isNaN(d.getTime())?"":d.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})};
async function loadTeam(){try{const [a,b]=await Promise.all([fetch("/colaborador/api/atendimento/rodrinox/atribuicoes",{credentials:"same-origin"}),fetch("/colaborador/api/atendimento/rodrinox/equipe",{credentials:"same-origin"})]);if(a.ok){const d=await a.json();assignments=d.atribuicoes||[];currentUser=d.usuario;}if(b.ok)team=await b.json()}catch(e){console.warn("Equipe indisponível")}}
async function saveAssignment(){if(!active||!team)return;const id=selected==="contatos"?active.id:active.contactId||active.contact?.id;if(!id)return;const user=document.getElementById("caAssignUser"),sector=document.getElementById("caAssignSector");const response=await fetch("/colaborador/api/atendimento/rodrinox/atribuicoes/"+encodeURIComponent(id),{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json","X-Portal":"1"},body:JSON.stringify({usuario_id:user.value?Number(user.value):null,setor_id:sector.value?Number(sector.value):null})});const data=await response.json();if(!response.ok){alert(data.erro||"Não foi possível atribuir");return}await loadTeam();openRecord(active.id)}
let historyBusy=false;
let sentPending=[];
const msgKey=m=>String(m.id||"")||[messageText(m),m.createdAt||m.sentAt||""].join("|");
async function openRecord(id,redraw=true){
  if(redraw){active=records.find(r=>String(r.id)===String(id));draw();}if(!active)return;
  if(historyBusy)return;historyBusy=true;
  const contactId=selected==="contatos"?active.id:active.contactId||active.contact?.id;
  const target=document.getElementById("caMessageBody");if(!target)return;
  if(!contactId){target.textContent="Este chamado não informa o contato associado.";return}
  if(redraw)target.textContent="Carregando histórico...";
  const assignment=assignments.find(a=>String(a.contato_digisac)===String(contactId));
  const tools=document.getElementById("caAssignTools");
  if(tools&&team){tools.innerHTML='<label>Setor <select id="caAssignSector"><option value="">Sem setor</option>'+team.setores.map(x=>'<option value="'+safe(x.id)+'" '+(Number(assignment?.setor_id)===Number(x.id)?"selected":"")+'>'+safe(x.nome)+'</option>').join("")+'</select></label> <label>Responsável <select id="caAssignUser"><option value="">Não atribuído</option>'+team.usuarios.map(x=>'<option value="'+safe(x.id)+'" '+(Number(assignment?.usuario_id)===Number(x.id)?"selected":"")+'>'+safe(x.nome)+'</option>').join("")+'</select></label> <button type="button" id="caSaveAssign">Salvar atribuição</button>';document.getElementById("caSaveAssign").onclick=saveAssignment;
  }
  try{
    const res=await fetch("/colaborador/api/atendimento/consultar/messages?contactId="+encodeURIComponent(contactId),{credentials:"same-origin",cache:"no-store"});
    const data=await res.json();if(!res.ok)throw Error(data.erro||"Consulta indisponível");
    const messages=rows(data).filter(isMessage).sort((a,b)=>new Date(a.sentAt||a.createdAt||a.timestamp||0)-new Date(b.sentAt||b.createdAt||b.timestamp||0)).slice(-100);
    sentPending=sentPending.filter(p=>p.contactId!==String(contactId)||(!messages.some(m=>(p.id&&String(m.id)===p.id)||(messageText(m)===p.text&&Math.abs(new Date(m.createdAt||m.sentAt||0).getTime()-p.time)<120000))&&Date.now()-p.time<120000));
    target.innerHTML=messages.length?messages.map(m=>{
      const body=messageText(m),type=messageType(m),sender=m.user?.name||m.contact?.name||m.origin||"Mensagem";
      const content=body||("[Conteúdo "+(type||"multimídia")+" não disponível nesta integração]");
      const sent=m.origin==='user'||m.isFromMe===true||m.fromMe===true||m.direction==='outbound';
      return '<div class="ca-msg '+(sent?'ca-msg-out':'ca-msg-in')+'"><small>'+safe(sender)+' · '+safe(messageTime(m))+'</small><p>'+safe(content)+'</p></div>';
    }).join(""):'Nenhuma mensagem disponível para este contato.';
    const pending=sentPending.filter(p=>p.contactId===String(contactId));
    if(pending.length)target.innerHTML+=pending.map(p=>'<div class="ca-msg ca-msg-out"><small>Enviada · aguardando atualização do histórico</small><p>'+safe(p.text)+'</p></div>').join('');
    const scroll=target.closest('.ca-messages');if(scroll&&redraw)scroll.scrollTop=scroll.scrollHeight;
  }catch(e){target.textContent="Falha ao atualizar o histórico: "+e.message}
  finally{historyBusy=false}
}

async function sendMessage(){
 const textarea=document.getElementById("caComposeText"),button=document.getElementById("caSend");
 if(!textarea||!button||!active||!digiUserId)return;
 const contactId=selected==="contatos"?active.id:active.contactId||active.contact?.id;
 const message=textarea.value.trim();
 if(!contactId||!message)return;

 button.disabled=true;button.textContent="Enviando...";
 try{
  const response=await fetch("/colaborador/api/atendimento/enviar",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-Portal":"1"},body:JSON.stringify({contactId,userId:digiUserId,text:message})});
  const result=await response.json();
  if(!response.ok||!result.enviado)throw Error((result.erro||"Envio não confirmado")+(result.codigo?" (HTTP "+result.codigo+")":""));
  textarea.value="";
  sentPending.push({contactId:String(contactId),text:message,id:result.id?String(result.id):null,time:Date.now()});
  await openRecord(active.id,false);
  const scroll=document.querySelector(".ca-messages");if(scroll)scroll.scrollTop=scroll.scrollHeight;
 }catch(err){alert(err.message+" Verifique a DigiSac antes de reenviar, para evitar duplicidade.")}
 finally{const b=document.getElementById("caSend");if(b){b.textContent="Enviar";b.disabled=false}}
}

function actionModal(title,content,confirmLabel,handler){document.getElementById("ca-action-modal")?.remove();const overlay=document.createElement("div");overlay.id="ca-action-modal";overlay.className="ca-modal-backdrop";overlay.innerHTML='<section class="ca-modal" role="dialog" aria-modal="true" aria-labelledby="ca-modal-title"><header><strong id="ca-modal-title">'+safe(title)+'</strong><button type="button" class="ca-modal-close" aria-label="Fechar">×</button></header><div class="ca-modal-content">'+content+'</div><footer><button type="button" class="ca-modal-cancel">Cancelar</button><button type="button" class="ca-modal-confirm">'+safe(confirmLabel)+'</button></footer><p class="ca-modal-error" aria-live="polite"></p></section>';document.body.append(overlay);const close=()=>overlay.remove();overlay.querySelectorAll(".ca-modal-close,.ca-modal-cancel").forEach(b=>b.addEventListener("click",close));overlay.addEventListener("click",e=>{if(e.target===overlay)close()});overlay.querySelector(".ca-modal-confirm").addEventListener("click",async()=>{const button=overlay.querySelector(".ca-modal-confirm"),error=overlay.querySelector(".ca-modal-error");button.disabled=true;button.textContent="Processando...";error.textContent="";try{await handler(overlay);close()}catch(e){error.textContent=e.message||"Não foi possível concluir a operação.";button.disabled=false;button.textContent=confirmLabel}});return overlay}
async function digiJson(url,options={}){const response=await fetch(url,{credentials:"same-origin",cache:"no-store",...options}),data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.erro||"Operação recusada pela DigiSac (HTTP "+response.status+").");return data}
function selectedContactId(){return selected==="contatos"?active?.id:active?.contactId||active?.contact?.id||null}
async function openTransfer(){const contactId=selectedContactId();if(!active||!contactId)throw Error("Selecione um atendimento aberto.");const [depData,userData]=await Promise.all([digiJson("/colaborador/api/atendimento/consultar/departments"),digiJson("/colaborador/api/atendimento/consultar/users")]),departments=rows(depData),users=rows(userData);if(!departments.length)throw Error("A DigiSac não retornou departamentos disponíveis.");const content='<label>Departamento de destino<select id="caTransferDepartment" required><option value="">Selecione o departamento</option>'+departments.map(d=>'<option value="'+safe(d.id)+'">'+safe(d.name||d.description||"Departamento")+'</option>').join("")+'</select></label><label>Atendente (opcional)<select id="caTransferUser"><option value="">Deixar na fila do departamento</option>'+users.map(u=>'<option value="'+safe(u.id)+'" '+(digiUserId!==null&&String(u.id)===String(digiUserId)?"selected":"")+'>'+safe((digiUserId!==null&&String(u.id)===String(digiUserId)?"Você — ":"")+(u.name||u.email||"Atendente"))+'</option>').join("")+'</select></label><label>Comentário interno (opcional)<textarea id="caTransferComment" maxlength="500" placeholder="Motivo ou orientação para o próximo atendente"></textarea></label>';actionModal(selected==="contatos"?"Assumir atendimento":"Transferir conversa",content,selected==="contatos"?"Assumir para mim":"Confirmar transferência",async modal=>{const departmentId=modal.querySelector("#caTransferDepartment").value,userId=modal.querySelector("#caTransferUser").value,comments=modal.querySelector("#caTransferComment").value;if(!departmentId)throw Error("Selecione o departamento de destino.");await digiJson("/colaborador/api/atendimento/transferir",{method:"POST",headers:{"Content-Type":"application/json","X-Portal":"1"},body:JSON.stringify({contactId,departmentId,userId:userId||null,...(digiUserId?{byUserId:digiUserId}:{}),comments})});if(selected==="contatos"){selected="meus";await loadTeam();await load();const ticket=records.find(r=>String(r.contactId||r.contact?.id||"")===String(contactId));if(ticket){active=ticket;draw();await openRecord(ticket.id,false)}else{active=null;draw();alert("Transferido na DigiSac, mas o chamado ainda não apareceu em Meus Chats. Atualize a lista em instantes.")}}else{await loadTeam();await load()}})
async function openTags(){const contactId=selectedContactId();if(!active||!contactId)throw Error("Selecione uma conversa para gerenciar as etiquetas.");const [tagsData,contactData]=await Promise.all([digiJson("/colaborador/api/atendimento/consultar/tags"),digiJson("/colaborador/api/atendimento/contato/"+encodeURIComponent(contactId))]),tags=rows(tagsData),contact=contactData?.data||contactData?.contact||contactData;const current=Array.isArray(contact?.tags)?contact.tags.map(t=>String(t.id)):Array.isArray(contact?.tagIds)?contact.tagIds.map(String):[];if(!tags.length)throw Error("A DigiSac não retornou etiquetas cadastradas.");const content='<p>Selecione as etiquetas que devem ficar vinculadas a este contato. As já existentes aparecem marcadas.</p><div class="ca-tag-options">'+tags.map(t=>'<label><input type="checkbox" value="'+safe(t.id)+'" '+(current.includes(String(t.id))?"checked":"")+'><span>'+safe(t.label||t.name||t.title||"Etiqueta")+'</span></label>').join("")+'</div>';actionModal("Adicionar etiqueta",content,"Salvar etiquetas",async modal=>{const tagIds=[...modal.querySelectorAll(".ca-tag-options input:checked")].map(x=>x.value);await digiJson("/colaborador/api/atendimento/etiquetas",{method:"POST",headers:{"Content-Type":"application/json","X-Portal":"1"},body:JSON.stringify({contactId,tagIds})});await openRecord(active.id,false)})}
async function openClose(){const contactId=selectedContactId();if(!active||!contactId)throw Error("Selecione um atendimento aberto para finalizar.");const topicData=await digiJson("/colaborador/api/atendimento/consultar/ticket-topics"),topics=rows(topicData);if(!topics.length)throw Error("Cadastre ao menos um assunto de encerramento na DigiSac antes de finalizar.");const content='<label>Assunto do encerramento<select id="caCloseTopic" required><option value="">Selecione o assunto</option>'+topics.map(t=>'<option value="'+safe(t.id)+'">'+safe(t.name||t.title||"Assunto")+'</option>').join("")+'</select></label><label>Observação (opcional)<textarea id="caCloseComment" maxlength="500" placeholder="Resumo do atendimento"></textarea></label><p class="ca-modal-warning">O atendimento será encerrado na DigiSac e deixará de aparecer entre os chamados abertos.</p>';actionModal("Finalizar atendimento",content,"Finalizar chamado",async modal=>{const topicId=modal.querySelector("#caCloseTopic").value;if(!topicId)throw Error("Selecione o assunto do encerramento.");await digiJson("/colaborador/api/atendimento/finalizar",{method:"POST",headers:{"Content-Type":"application/json","X-Portal":"1"},body:JSON.stringify({contactId,ticketTopicIds:[topicId],...(digiUserId?{byUserId:digiUserId}:{}),comments:modal.querySelector("#caCloseComment").value})});active=null;await load()})}

const tabs=[["fila","Fila"],["meus","Meus chats"],["contatos","Contatos"],["meta","WhatsApp próprio"]];
function draw(){
if(selected==="meta"){window.renderMetaCentral?.();return}
const root=document.getElementById("items");if(!root||!["Central de Atendimento","atendimento"].includes(document.getElementById("sectionTitle")?.textContent))return;
root.classList.add("ca-root");
root.innerHTML='<div class="ca-head"><div><h3>Central de Atendimento</h3><div class="ca-sub">Atendimento corporativo · Rodrinox Pro</div></div><span class="ca-state" id="caConnection">Verificando conexão…</span></div>'+
'<div class="ca-layout"><aside class="ca-left"><div class="ca-sidebar-title"><strong>Conversas</strong><span>DigiSac</span></div><div class="ca-tabs">'+tabs.map(([id,label])=>'<button type="button" data-ca-tab="'+id+'" class="'+(selected===id?"active":"")+'">'+label+'</button>').join("")+'</div><button type="button" id="caRefresh" class="ca-refresh">↻ Atualizar DigiSac</button><input class="ca-search" placeholder="Pesquisar por nome, número ou protocolo..." aria-label="Pesquisar atendimento"><div class="ca-list">'+(loading?'<div class="ca-empty">Consultando DigiSac...</div>':error?'<div class="ca-empty">'+safe(error)+'</div>':records.length?records.map(r=>'<button type="button" class="ca-record" data-ca-id="'+safe(r.id)+'"><b>'+safe(nameOf(r))+'</b><small>'+safe(r.protocol?"Protocolo "+r.protocol:r.department?.name||r.number||"Atendimento") +'</small></button>').join("") :'<div class="ca-empty">'+(selected==="meus"?(digiMatchStatus||"Nenhum atendimento atribuído ao seu usuário.")+" Consulte a aba Fila ou solicite uma atribuição.":selected==="fila"?"Nenhum chamado aberto retornado pela API. A separação entre fila e chats depende dos dados de atribuição da DigiSac.":"Nenhum contato retornado pela API.")+'</div>')+'</div></aside><section class="ca-conversation"><header><strong>'+safe(active?nameOf(active):"Selecione um atendimento")+'</strong><span class="ca-meta">Mensagens, histórico, responsável e setor</span><div id="caAssignTools" class="ca-assign"></div></header><div class="ca-messages"><div id="caMessageBody"><div style="font-size:34px;margin-bottom:10px">▤</div>Selecione um contato ou chamado para consultar as mensagens.</div></div><div class="ca-compose"><textarea id="caComposeText" '+(active&&selected!=="contatos"?"":"disabled")+' placeholder="Selecione um chamado em Meus chats ou Fila para responder..." aria-label="Mensagem"></textarea><button id="caSend" '+(active&&selected!=="contatos"?"":"disabled")+' type="button">Enviar</button></div></section><aside class="ca-contact"><h4>Dados do contato</h4><div class="ca-avatar">☏</div><strong>'+safe(active?nameOf(active):'Selecione uma conversa')+'</strong><p>WhatsApp · DigiSac</p><hr><h4>Atendimento</h4><p>Setor e responsável: consulte o cabeçalho da conversa.</p><button type="button" id="caTransfer" '+(active&&selected!=="contatos"?"":"disabled")+' >⇄ Transferir conversa</button><button type="button" id="caTags" '+(active?"":"disabled")+' >◇ Adicionar etiqueta</button><button type="button" id="caClose" '+(active&&selected!=="contatos"?"":"disabled")+' >✓ Finalizar atendimento</button><hr><h4>Informações do chamado</h4><p>Protocolo: '+safe(active?.protocol||'—')+'</p><p>Origem: WhatsApp</p></aside></div>'+
'<div class="ca-banner"><b>Integração DigiSac:</b> mensagens enviadas pela API existente. Transferência e encerramento dependem de suporte e autorização da API.</div>'+
'<section class="ca-panel"><h4>Preparação da integração</h4><div class="ca-steps"><span class="ca-step ready">✓ Interface Rodrinox</span><span class="ca-step">Conexão API</span><span class="ca-step">Filas e permissões</span><span class="ca-step">Envio de mensagens</span></div><p class="ca-meta" id="caDetails">Aguardando verificação do servidor.</p></section>';
document.querySelector(".ca-search")?.addEventListener("input",e=>{searchTerm=e.target.value.toLowerCase().trim();root.querySelectorAll(".ca-record").forEach(b=>{const r=records.find(x=>String(x.id)===b.dataset.caId);b.hidden=!!r&&!([nameOf(r),r.protocol,r.number,r.contact?.number,r.contactId].some(v=>String(v||"").toLowerCase().includes(searchTerm)))});});
// Revalida explicitamente o estado dos controles apos cada renderizacao.
// As acoes dependem do contato real do chamado, nao do mapeamento de e-mail.
const actionTarget = selectedContactId();
const canRunTicketActions = Boolean(active && selected !== "contatos" && selected !== "meta" && actionTarget);
for (const id of ["caTransfer","caTags","caClose"]) {
  const button = document.getElementById(id);
  if (button) {
    button.disabled = !canRunTicketActions;
    button.setAttribute("aria-disabled", String(!canRunTicketActions));
    button.title = canRunTicketActions ? "" : "Selecione um chamado aberto para habilitar esta acao.";
  }
}
document.getElementById("caSend")?.addEventListener("click",sendMessage);
document.getElementById("caTransfer")?.addEventListener("click",()=>openTransfer().catch(e=>alert(e.message)));
document.getElementById("caTags")?.addEventListener("click",()=>openTags().catch(e=>alert(e.message)));
document.getElementById("caClose")?.addEventListener("click",()=>openClose().catch(e=>alert(e.message)));
document.getElementById("caComposeText")?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();sendMessage()}});
document.getElementById("caRefresh")?.addEventListener("click",async()=>{await loadTeam();await resolveDigiUser();await load()});
root.querySelectorAll("[data-ca-tab]").forEach(b=>b.addEventListener("click",()=>{selected=b.dataset.caTab;if(selected==="meta")draw();else load()}));
root.querySelectorAll("[data-ca-id]").forEach(b=>b.addEventListener("click",()=>openRecord(b.dataset.caId)));
if(status){document.getElementById("caConnection").textContent=status.configurada?"Conexão API · consulta de leitura disponível":"Integração não configurada";document.getElementById("caDetails").textContent=status.configurada?"Consulta de leitura habilitada para administrador. Envio de texto disponível para administrador com chamado aberto selecionado; transferência permanece bloqueada.":"Para conectar, configure as credenciais da API somente no servidor, sem colocá-las no navegador ou no repositório."}
}
setInterval(()=>{const root=document.getElementById("items");if(!root?.querySelector(".ca-layout")||!status?.configurada)return;if(active)openRecord(active.id,false);else if(!loading)loadTeam().then(load)},12000);
window.renderCentralAtendimento=()=>{selected="meus";status=null;records=[];active=null;contactsById.clear();draw();fetch("/colaborador/api/atendimento/status",{credentials:"same-origin",cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("Não foi possível verificar a integração");return r.json()}).then(s=>{status=s;Promise.all([loadTeam(),resolveDigiUser()]).then(load)}).catch(()=>{status={configurada:false};draw()})};
})();