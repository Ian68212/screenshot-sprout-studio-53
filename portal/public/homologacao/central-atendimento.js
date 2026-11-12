"use strict";
(function(){
const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let selected="fila",status=null,records=[],active=null,loading=false,error="",team=null,assignments=[],currentUser=null,lastSync=null,contactsById=new Map();
const rows=p=>Array.isArray(p)?p:Array.isArray(p?.rows)?p.rows:Array.isArray(p?.data)?p.data:Array.isArray(p?.items)?p.items:Array.isArray(p?.results)?p.results:[];
const nameOf=r=>contactsById.get(String(r.contactId||r.contact?.id))?.name||r.contact?.name||r.contact?.internalName||r.contactName||r.contact?.number||r.customer?.name||r.name||r.internalName||r.number||(r.protocol?"Chamado #"+r.protocol:"Chamado "+String(r.id||"").slice(0,8));
async function load(){loading=true;error="";draw();try{const kind=selected==="contatos"?"contacts":"tickets";const res=await fetch("/colaborador/api/atendimento/consultar/"+kind,{credentials:"same-origin",cache:"no-store"});const data=await res.json();if(!res.ok)throw Error(data.erro+(data.codigo?" (HTTP "+data.codigo+")":""));records=rows(data);if(kind==="tickets"){records=records.filter(r=>r.isOpen===true||r.isOpen===1||r.isOpen==="true");try{const cr=await fetch("/colaborador/api/atendimento/consultar/contacts",{credentials:"same-origin",cache:"no-store"});if(cr.ok){for(const c of rows(await cr.json()))contactsById.set(String(c.id),c)}}catch(e){console.warn("Nomes de contatos indisponíveis")}}if(selected==="meus")records=records.filter(r=>assignments.some(a=>String(a.contato_digisac)===String(r.contactId||r.contact?.id||r.id)&&Number(a.usuario_id)===Number(currentUser?.id)));active=null;}catch(e){records=[];error=e.message}finally{loading=false;lastSync=new Date();draw()}}
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
async function saveAssignment(){if(!active||!team)return;const id=selected==="contatos"?active.id:active.contactId||active.contact?.id;if(!id)return;const user=document.getElementById("caAssignUser"),sector=document.getElementById("caAssignSector");const response=await fetch("/colaborador/api/atendimento/rodrinox/atribuicoes/"+encodeURIComponent(id),{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({usuario_id:user.value?Number(user.value):null,setor_id:sector.value?Number(sector.value):null})});const data=await response.json();if(!response.ok){alert(data.erro||"Não foi possível atribuir");return}await loadTeam();openRecord(active.id)}
async function openRecord(id){
  active=records.find(r=>String(r.id)===String(id));draw();if(!active)return;
  const contactId=selected==="contatos"?active.id:active.contactId||active.contact?.id;
  const target=document.getElementById("caMessageBody");if(!target)return;
  if(!contactId){target.textContent="Este chamado não informa o contato associado.";return}
  target.textContent="Carregando histórico...";
  const assignment=assignments.find(a=>String(a.contato_digisac)===String(contactId));
  const tools=document.getElementById("caAssignTools");
  if(tools&&team){tools.innerHTML='<label>Setor <select id="caAssignSector"><option value="">Sem setor</option>'+team.setores.map(x=>'<option value="'+safe(x.id)+'" '+(Number(assignment?.setor_id)===Number(x.id)?"selected":"")+'>'+safe(x.nome)+'</option>').join("")+'</select></label> <label>Responsável <select id="caAssignUser"><option value="">Não atribuído</option>'+team.usuarios.map(x=>'<option value="'+safe(x.id)+'" '+(Number(assignment?.usuario_id)===Number(x.id)?"selected":"")+'>'+safe(x.nome)+'</option>').join("")+'</select></label> <button type="button" id="caSaveAssign">Salvar atribuição</button>';document.getElementById("caSaveAssign").onclick=saveAssignment;
  }
  try{
    const res=await fetch("/colaborador/api/atendimento/consultar/messages?contactId="+encodeURIComponent(contactId),{credentials:"same-origin",cache:"no-store"});
    const data=await res.json();if(!res.ok)throw Error(data.erro||"Consulta indisponível");
    const messages=rows(data).filter(isMessage).slice(-40);
    target.innerHTML=messages.length?messages.map(m=>{
      const body=messageText(m),type=messageType(m),sender=m.user?.name||m.contact?.name||m.origin||"Mensagem";
      const content=body||("[Conteúdo "+(type||"multimídia")+" não disponível nesta integração]");
      return '<div class="ca-msg"><small>'+safe(sender)+' · '+safe(messageTime(m))+'</small><p>'+safe(content)+'</p></div>';
    }).join(""):'Nenhuma mensagem de texto disponível para este contato. Registros internos e eventos de sistema foram ocultados.';
  }catch(e){target.textContent=e.message}
}

const tabs=[["fila","Fila"],["meus","Meus chats"],["contatos","Contatos"],["meta","WhatsApp próprio"]];
function draw(){
if(selected==="meta"){window.renderMetaCentral?.();return}
const root=document.getElementById("items");if(!root||!["Central de Atendimento","atendimento"].includes(document.getElementById("sectionTitle")?.textContent))return;
root.classList.add("ca-root");
root.innerHTML='<div class="ca-head"><div><h3>Central de Atendimento</h3><div class="ca-sub">Atendimento corporativo · Rodrinox Pro</div></div><span class="ca-state" id="caConnection">Verificando conexão…</span></div>'+
'<div class="ca-layout"><aside class="ca-left"><div class="ca-tabs">'+tabs.map(([id,label])=>'<button type="button" data-ca-tab="'+id+'" class="'+(selected===id?"active":"")+'">'+label+'</button>').join("")+'</div><button type="button" id="caRefresh" class="ca-refresh">↻ Atualizar DigiSac</button><input class="ca-search" placeholder="Pesquisar atendimento..." aria-label="Pesquisar atendimento" disabled><div class="ca-list">'+(loading?'<div class="ca-empty">Consultando DigiSac...</div>':error?'<div class="ca-empty">'+safe(error)+'</div>':records.length?records.map(r=>'<button type="button" class="ca-record" data-ca-id="'+safe(r.id)+'"><b>'+safe(nameOf(r))+'</b><small>'+safe(r.protocol?"Protocolo "+r.protocol:r.department?.name||r.number||"Atendimento") +'</small></button>').join("") :'<div class="ca-empty">'+(selected==="meus"?"Nenhum atendimento atribuído a você na Rodrinox. Consulte a aba Fila ou solicite uma atribuição.":selected==="fila"?"Nenhum chamado aberto retornado pela API. A separação entre fila e chats depende dos dados de atribuição da DigiSac.":"Nenhum contato retornado pela API.")+'</div>')+'</div></aside><section class="ca-conversation"><header><strong>'+safe(active?nameOf(active):"Selecione um atendimento")+'</strong><span class="ca-meta">Mensagens, histórico, responsável e setor</span><div id="caAssignTools" class="ca-assign"></div></header><div class="ca-messages"><div id="caMessageBody"><div style="font-size:34px;margin-bottom:10px">▤</div>Selecione um contato ou chamado para consultar as mensagens.</div></div><div class="ca-compose"><textarea disabled placeholder="A resposta será habilitada quando a API estiver conectada e o atendimento for selecionado." aria-label="Mensagem"></textarea><button disabled type="button">Enviar</button></div></section></div>'+
'<div class="ca-banner"><b>Homologação segura:</b> nenhuma mensagem será enviada enquanto a conexão não estiver validada. O WhatsApp e as filas atuais continuam funcionando na plataforma de origem.</div>'+
'<section class="ca-panel"><h4>Preparação da integração</h4><div class="ca-steps"><span class="ca-step ready">✓ Interface Rodrinox</span><span class="ca-step">Conexão API</span><span class="ca-step">Filas e permissões</span><span class="ca-step">Envio de mensagens</span></div><p class="ca-meta" id="caDetails">Aguardando verificação do servidor.</p></section>';
document.getElementById("caRefresh")?.addEventListener("click",async()=>{await loadTeam();await load()});
root.querySelectorAll("[data-ca-tab]").forEach(b=>b.addEventListener("click",()=>{selected=b.dataset.caTab;if(selected==="meta")draw();else load()}));
root.querySelectorAll("[data-ca-id]").forEach(b=>b.addEventListener("click",()=>openRecord(b.dataset.caId)));
if(status){document.getElementById("caConnection").textContent=status.configurada?"Conexão API · consulta de leitura disponível":"Integração não configurada";document.getElementById("caDetails").textContent=status.configurada?"Consulta de leitura habilitada para administrador. Envio e transferência de chamados permanecem bloqueados.":"Para conectar, configure as credenciais da API somente no servidor, sem colocá-las no navegador ou no repositório."}
}
setInterval(()=>{const root=document.getElementById("items");if(root?.querySelector(".ca-layout")&&!loading&&!active&&status?.configurada)loadTeam().then(load)},20000);
window.renderCentralAtendimento=()=>{selected="fila";status=null;records=[];active=null;contactsById.clear();draw();fetch("/colaborador/api/atendimento/status",{credentials:"same-origin",cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("Não foi possível verificar a integração");return r.json()}).then(s=>{status=s;loadTeam().then(load)}).catch(()=>{status={configurada:false};draw()})};
})();