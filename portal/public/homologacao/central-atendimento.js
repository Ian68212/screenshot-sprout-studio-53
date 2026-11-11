"use strict";
(function(){
const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let selected="fila",status=null,records=[],active=null,loading=false,error="";
const rows=p=>Array.isArray(p)?p:Array.isArray(p?.rows)?p.rows:Array.isArray(p?.data)?p.data:Array.isArray(p?.items)?p.items:Array.isArray(p?.results)?p.results:[];
const nameOf=r=>r.name||r.internalName||r.contact?.name||r.data?.name||r.number||r.id||"Sem identificação";
async function load(){loading=true;error="";draw();try{const kind=selected==="contatos"?"contacts":"tickets";const res=await fetch("/colaborador/api/atendimento/consultar/"+kind,{credentials:"same-origin",cache:"no-store"});const data=await res.json();if(!res.ok)throw Error(data.erro+(data.codigo?" (HTTP "+data.codigo+")":""));records=rows(data);if(selected==="meus")records=records.filter(r=>r.userId||r.user?.id);active=null;}catch(e){records=[];error=e.message}finally{loading=false;draw()}}
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
async function openRecord(id){
  active=records.find(r=>String(r.id)===String(id));draw();if(!active)return;
  const contactId=selected==="contatos"?active.id:active.contactId||active.contact?.id;
  const target=document.getElementById("caMessageBody");if(!target)return;
  if(!contactId){target.textContent="Este chamado não informa o contato associado.";return}
  target.textContent="Carregando histórico...";
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

const tabs=[["fila","Fila"],["meus","Meus chats"],["contatos","Contatos"]];
function draw(){
const root=document.getElementById("items");if(!root||!["Central de Atendimento","atendimento"].includes(document.getElementById("sectionTitle")?.textContent))return;
root.classList.add("ca-root");
root.innerHTML='<div class="ca-head"><div><h3>Central de Atendimento</h3><div class="ca-sub">Atendimento corporativo · Rodrinox Pro</div></div><span class="ca-state" id="caConnection">Verificando conexão…</span></div>'+
'<div class="ca-layout"><aside class="ca-left"><div class="ca-tabs">'+tabs.map(([id,label])=>'<button type="button" data-ca-tab="'+id+'" class="'+(selected===id?"active":"")+'">'+label+'</button>').join("")+'</div><input class="ca-search" placeholder="Pesquisar atendimento..." aria-label="Pesquisar atendimento" disabled><div class="ca-list">'+(loading?'<div class="ca-empty">Consultando DigiSac...</div>':error?'<div class="ca-empty">'+safe(error)+'</div>':records.length?records.map(r=>'<button type="button" class="ca-record" data-ca-id="'+safe(r.id)+'"><b>'+safe(nameOf(r))+'</b><small>'+safe(r.protocol?"Protocolo "+r.protocol:r.department?.name||r.number||"Atendimento") +'</small></button>').join(""):'<div class="ca-empty">Nenhum registro retornado.</div>')+'</div></aside><section class="ca-conversation"><header><strong>'+safe(active?nameOf(active):"Selecione um atendimento")+'</strong><span class="ca-meta">Mensagens, histórico, responsável e setor</span></header><div class="ca-messages"><div id="caMessageBody"><div style="font-size:34px;margin-bottom:10px">▤</div>Selecione um contato ou chamado para consultar as mensagens.</div></div><div class="ca-compose"><textarea disabled placeholder="A resposta será habilitada quando a API estiver conectada e o atendimento for selecionado." aria-label="Mensagem"></textarea><button disabled type="button">Enviar</button></div></section></div>'+
'<div class="ca-banner"><b>Homologação segura:</b> nenhuma mensagem será enviada enquanto a conexão não estiver validada. O WhatsApp e as filas atuais continuam funcionando na plataforma de origem.</div>'+
'<section class="ca-panel"><h4>Preparação da integração</h4><div class="ca-steps"><span class="ca-step ready">✓ Interface Rodrinox</span><span class="ca-step">Conexão API</span><span class="ca-step">Filas e permissões</span><span class="ca-step">Envio de mensagens</span></div><p class="ca-meta" id="caDetails">Aguardando verificação do servidor.</p></section>';
root.querySelectorAll("[data-ca-tab]").forEach(b=>b.addEventListener("click",()=>{selected=b.dataset.caTab;load()}));
root.querySelectorAll("[data-ca-id]").forEach(b=>b.addEventListener("click",()=>openRecord(b.dataset.caId)));
if(status){document.getElementById("caConnection").textContent=status.configurada?"Conexão API · consulta de leitura disponível":"Integração não configurada";document.getElementById("caDetails").textContent=status.configurada?"Consulta de leitura habilitada para administrador. Envio e transferência de chamados permanecem bloqueados.":"Para conectar, configure as credenciais da API somente no servidor, sem colocá-las no navegador ou no repositório."}
}
window.renderCentralAtendimento=()=>{selected="fila";status=null;records=[];active=null;draw();fetch("/colaborador/api/atendimento/status",{credentials:"same-origin",cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("Não foi possível verificar a integração");return r.json()}).then(s=>{status=s;load()}).catch(()=>{status={configurada:false};draw()})};
})();