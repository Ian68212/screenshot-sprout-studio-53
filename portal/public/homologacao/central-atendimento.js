"use strict";
(function(){
const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function signedMessageMarkup(text) {
 const signature = /^\*([^*:\r\n]+:)\*(?=\r?\n|$)/.exec(text);
 return signature ? "<strong>"+safe(signature[1])+"</strong>"+safe(text.slice(signature[0].length)) : safe(text);
}
let stagedFiles=[];let showFiles=()=>{};let activeServiceId=null;let attachmentSending=false;
let voiceRecorder=null,voiceStream=null,voiceChunks=[],voiceStarted=0;
let selected="meus",status=null,records=[],active=null,loading=false,error="",team=null,assignments=[],currentUser=null,lastSync=null,contactsById=new Map(),digiUserId=null,digiMatchStatus="",ticketDiagnostics="",searchTerm="";
const rows=p=>Array.isArray(p)?p:Array.isArray(p?.rows)?p.rows:Array.isArray(p?.data)?p.data:Array.isArray(p?.items)?p.items:Array.isArray(p?.results)?p.results:[];
const nameOf=r=>{const c=contactsById.get(String(r.contactId||r.contact?.id))||r.contact||{};return c.name||c.internalName||r.contactName||c.number||r.customer?.name||r.name||r.internalName||r.number||("Chamado #"+(r.protocol||String(r.id||"").slice(0,8)))};
const contactOf=r=>contactsById.get(String(r.contactId||r.contact?.id||r.id))||r.contact||r;
const phoneOf=r=>{const p=contactOf(r);return String(p.number||p.data?.number||r.number||"");};
const photoOf=r=>{const p=contactOf(r),a=p.avatar;const raw=typeof a==="string"?a:a?.url||a?.downloadUrl||a?.publicUrl||a?.file?.url;const signed=mediaUrl(raw);if(signed)return new URL(signed).hostname.endsWith(".objectstorage.sa-vinhedo-1.oraclecloud.com")?"/colaborador/api/atendimento/midia?url="+encodeURIComponent(signed):signed;const id=String(a?.fileId||a?.file?.id||a?.id||p.avatarId||"");return /^[a-f0-9-]{36}$/i.test(id)?"/colaborador/api/atendimento/arquivo/"+encodeURIComponent(id):"";};
const initials=r=>nameOf(r).trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join("")||"?";
function avatar(r){const url=photoOf(r);return '<span class="ca-contact-avatar" style="position:relative;display:grid;place-items:center;width:44px;height:44px;flex:0 0 44px;border-radius:50%;overflow:hidden;background:#dbeafe;color:#164a73;font-weight:700"><span>'+safe(initials(r))+'</span>'+(url?'<img class="ca-contact-photo" src="'+safe(url)+'" alt="" loading="lazy" referrerpolicy="no-referrer" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">':'')+'</span>';}
const previews=new Map();let contactsLoadedAt=0;
function recordMarkup(r){const p=contactOf(r),id=String(r.contactId||r.contact?.id||r.id),last=r.lastMessage||p.lastMessage||previews.get(id),t=last&&typeof last==="object"?messageText(last):typeof last==="string"?last:"",date=last&&typeof last==="object"?(last.sentAt||last.createdAt||last.timestamp):null,n=Number(r.unreadCount??p.unreadCount??r.unreadMessagesCount??p.unreadMessagesCount),when=date&&!isNaN(new Date(date))?new Date(date).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"";return '<button type="button" class="ca-record" data-ca-id="'+safe(r.id)+'" style="display:grid !important;grid-template-columns:44px minmax(0,1fr) auto !important;align-items:center !important;gap:10px;text-align:left;width:100%;height:auto !important;min-height:76px;flex-shrink:0;padding:10px 8px;box-sizing:border-box;overflow:hidden">'+avatar(r)+'<span style="min-width:0;display:grid !important;grid-template-columns:minmax(0,1fr);gap:3px;overflow:hidden"><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+safe(nameOf(r))+'</b><small>'+safe(phoneOf(r)||r.department?.name||"")+'</small>'+(t?'<small style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+safe(t)+'</small>':'')+'</span><span style="display:grid;justify-items:end;gap:6px">'+(when?'<small>'+safe(when)+'</small>':'')+(Number.isFinite(n)&&n>0?'<span style="background:#087e65;color:white;border-radius:20px;padding:2px 7px;font-size:11px">'+safe(n)+'</span>':'')+'</span></button>';}
async function resolveDigiUser(){
 digiUserId=null;digiMatchStatus="";
 if(status?.identidadeCorporativa){digiMatchStatus="Atendimento com identidade corporativa.";return}
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
async function load(){loading=true;error="";ticketDiagnostics="";draw();try{const kind=selected==="contatos"?"contacts":"tickets";const res=await fetch("/colaborador/api/atendimento/consultar/"+kind,{credentials:"same-origin",cache:"no-store"});const data=await res.json();if(!res.ok)throw Error(data.erro+(data.codigo?" (HTTP "+data.codigo+")":""));records=rows(data);if(kind==="contacts"){for(const c of records)contactsById.set(String(c.id),c);contactsLoadedAt=Date.now();}if(kind==="tickets"){records=records.filter(r=>r.isOpen===true||r.isOpen===1||r.isOpen==="true");try{if(Date.now()-contactsLoadedAt>120000){const cr=await fetch("/colaborador/api/atendimento/consultar/contacts",{credentials:"same-origin",cache:"no-store"});if(cr.ok){for(const c of rows(await cr.json()))contactsById.set(String(c.id),c);contactsLoadedAt=Date.now();}}}catch(e){console.warn("Nomes de contatos indisponíveis")}}if(kind==="tickets"&&status?.identidadeCorporativa){records=records.filter(r=>r.rodrinoxFila===selected)}else if(selected==="fila"){records=records.filter(r=>!([r.userId,r.assignedUserId,r.attendantId,r.operatorId,r.agentId,r.responsibleId,r.assignedToId,r.user?.id,r.assignedUser?.id,r.currentTicketTransfer?.userId].some(Boolean))&&!assignments.some(a=>String(a.contato_digisac)===String(r.contactId||r.contact?.id||r.id)&&a.usuario_id))}if(selected==="meus"&&!status?.identidadeCorporativa){const all=records;const keys=["userId","assignedUserId","attendantId","operatorId","agentId","responsibleId","assignedToId","currentUserId"];const nested=["user","assignedUser","attendant","operator","agent","responsible","assignedTo","currentTicketTransfer"];const ids=r=>[...keys.map(k=>r[k]),...nested.flatMap(k=>[r[k]?.id,r[k]?.userId,r[k]?.assignedUserId])].filter(v=>v!==null&&v!==undefined&&v!=="").map(String);records=all.filter(r=>(digiUserId!==null&&ids(r).includes(digiUserId))||assignments.some(a=>String(a.contato_digisac)===String(r.contactId||r.contact?.id||r.id)&&Number(a.usuario_id)===Number(currentUser?.id)));const fields=[...new Set(all.slice(0,20).flatMap(r=>Object.keys(r).filter(k=>/user|agent|attend|operat|respons|assign|transfer/i.test(k))))];ticketDiagnostics="Chamados abertos: "+all.length+" · correspondências: "+records.length+" · campos: "+(fields.join(", ")||"não identificados");}active=records.find(r=>String(r.id)===String(active?.id))||null;}catch(e){records=[];error=e.message}finally{loading=false;lastSync=new Date();draw();if(active)openRecord(active.id,false)}}
const messageText=m=>{
  const candidates=[m.text,m.body,m.content?.text,m.content?.body,m.data?.text,m.data?.body,m.message?.text,m.message?.body];
  const v=candidates.find(x=>typeof x==="string"&&x.trim());
  return v||"";
};
const messageType=m=>String(m.type||m.event||m.kind||"").toLowerCase();
const isMessage=m=>{
  const type=messageType(m);
  if(["ticket","user","contact","call_log","department","transfer","status","system"].includes(type))return false;
  return Boolean(messageText(m))||["message","chat","text","audio","image","video","file","document"].includes(type)||Boolean(m.fileId||m.file?.id||m.file?.url);
};
const mediaUrl=value=>{try{const u=new URL(String(value||""));return u.protocol==="https:"&&(/(^|\.)digisac\.app$/.test(u.hostname)||/(^|\.)objectstorage\.[a-z0-9-]+\.oraclecloud\.com$/.test(u.hostname))?u.href:""}catch{return ""}};
const mediaMarkup=m=>{
 const f=m.file||m.data?.file||m.attachment||m.data?.attachment||m.files?.[0]||{};
 const file=Array.isArray(f)?f[0]||{}:f;
 const raw=file.url||file.downloadUrl||file.publicUrl||file.uri||file.fileUrl||file.path||m.fileUrl||m.mediaUrl||m.url||m.thumbnail?.url||m.preview?.url;
 const fileId=String(m.fileId||file.id||"");
 const signed=mediaUrl(raw);
 const isOracle=signed&&new URL(signed).hostname.endsWith(".objectstorage.sa-vinhedo-1.oraclecloud.com");
 const url=isOracle?"/colaborador/api/atendimento/midia?url="+encodeURIComponent(signed):(signed||(/^[a-f0-9-]{36}$/i.test(fileId)?"/colaborador/api/atendimento/arquivo/"+encodeURIComponent(fileId):""));
 const name=String(file.name||file.originalName||file.filename||m.fileName||m.filename||"Arquivo");
 const mime=String(file.mimetype||file.mimeType||file.type||m.mimetype||"").toLowerCase();
 const type=messageType(m);
 const isImage=mime.startsWith("image/")||type==="image"||/\.(png|jpe?g|webp|gif)(\?|$)/i.test(name)||/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
 if(!url)return m.fileId||file.id||["image","document","file","audio","video"].includes(type)?'<span class="ca-media-missing">📎 '+safe(name==="Arquivo"?"Arquivo anexado":name)+'</span>':"";
 if(isImage){const fallback="";return '<a href="'+safe(fallback||url)+'" target="_blank" rel="noopener noreferrer" title="Abrir imagem"><img src="'+safe(url)+'" data-digisac-fallback="'+safe(fallback&&fallback!==url?fallback:"")+'" alt="'+safe(name)+'" loading="lazy" style="display:block;max-width:min(100%,320px);max-height:320px;object-fit:contain;border-radius:9px;margin-top:6px"></a>';}
 return '<a href="'+safe(url)+'" target="_blank" rel="noopener noreferrer" style="display:inline-flex;gap:8px;align-items:center;margin-top:6px;padding:9px;border:1px solid #c6d9e7;border-radius:8px">📄 '+safe(name)+'</a>';
};
document.addEventListener("error",event=>{const img=event.target;if(!(img instanceof HTMLImageElement)||!img.hasAttribute("data-digisac-fallback"))return;const fallback=img.getAttribute("data-digisac-fallback");img.removeAttribute("data-digisac-fallback");if(fallback&&img.src!==fallback)img.src=fallback;},true);
const messageTime=m=>{const v=m.sentAt||m.createdAt||m.timestamp||m.date;if(!v)return "";const d=new Date(v);return Number.isNaN(d.getTime())?"":d.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})};
async function loadTeam(){try{const [a,b]=await Promise.all([fetch("/colaborador/api/atendimento/rodrinox/atribuicoes",{credentials:"same-origin"}),fetch("/colaborador/api/atendimento/rodrinox/equipe",{credentials:"same-origin"})]);if(a.ok){const d=await a.json();assignments=d.atribuicoes||[];currentUser=d.usuario;}if(b.ok)team=await b.json()}catch(e){console.warn("Equipe indisponível")}}
async function saveAssignment(){if(!active||!team)return;const id=selected==="contatos"?active.id:active.contactId||active.contact?.id;if(!id)return;const user=document.getElementById("caAssignUser"),sector=document.getElementById("caAssignSector");const response=await fetch("/colaborador/api/atendimento/rodrinox/atribuicoes/"+encodeURIComponent(id),{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json","X-Portal":"1"},body:JSON.stringify({usuario_id:user.value?Number(user.value):null,setor_id:sector.value?Number(sector.value):null})});const data=await response.json();if(!response.ok){alert(data.erro||"Não foi possível atribuir");return}await loadTeam();openRecord(active.id)}
let historyBusy=false;
let sentPending=[];
const msgKey=m=>String(m.id||"")||[messageText(m),m.createdAt||m.sentAt||""].join("|");
async function openRecord(id,redraw=true){
  if(redraw){active=records.find(r=>String(r.id)===String(id));activeServiceId=null;mobileDetails=true;draw();}if(!active)return;
  if(historyBusy)return;historyBusy=true;
  const contactId=selected==="contatos"?active.id:active.contactId||active.contact?.id;
  const target=document.getElementById("caMessageBody");if(!target)return;
  if(!contactId){target.textContent="Este chamado não informa o contato associado.";return}
  if(redraw)target.textContent="Carregando histórico...";
  try{
    const res=await fetch("/colaborador/api/atendimento/consultar/messages?contactId="+encodeURIComponent(contactId),{credentials:"same-origin",cache:"no-store"});
    const data=await res.json();if(!res.ok)throw Error(data.erro||"Consulta indisponível");
    const messages=rows(data).filter(isMessage).sort((a,b)=>new Date(a.sentAt||a.createdAt||a.timestamp||0)-new Date(b.sentAt||b.createdAt||b.timestamp||0)).slice(-100);
    if(messages.length){previews.set(String(contactId),messages[messages.length-1]);if(previews.size>500)previews.delete(previews.keys().next().value);const old=[...document.querySelectorAll(".ca-record")].find(b=>b.dataset.caId===String(id));if(old&&active&&String(active.id)===String(id)){const temp=document.createElement("div");temp.innerHTML=recordMarkup(active);const fresh=temp.firstElementChild;fresh.hidden=old.hidden;fresh.onclick=()=>openRecord(id);fresh.querySelector("img")?.addEventListener("error",e=>e.target.remove(),{once:true});old.replaceWith(fresh);}}activeServiceId=messages.findLast(m=>m.serviceId)?.serviceId||active?.serviceId||active?.service?.id||null;
    sentPending=sentPending.filter(p=>p.contactId!==String(contactId)||(!messages.some(m=>(p.id&&String(m.id)===p.id)||(messageText(m)===p.text&&Math.abs(new Date(m.createdAt||m.sentAt||0).getTime()-p.time)<120000))&&Date.now()-p.time<120000));
    target.innerHTML=messages.length?messages.map(m=>{
      const body=messageText(m),type=messageType(m),sender=m.user?.name||m.contact?.name||m.origin||"Mensagem";
      const media=mediaMarkup(m);const content=body||(!media?"[Mensagem sem texto]":"");
      const sent=m.origin==='user'||m.isFromMe===true||m.fromMe===true||m.direction==='outbound';
      return '<div class="ca-msg '+(sent?'ca-msg-out':'ca-msg-in')+'"><small>'+safe(sender)+' · '+safe(messageTime(m))+'</small><p>'+(sent?signedMessageMarkup(content):safe(content))+'</p>'+media+'</div>';
    }).join(""):'Nenhuma mensagem disponível para este contato.';
    const pending=sentPending.filter(p=>p.contactId===String(contactId));
    if(pending.length)target.innerHTML+=pending.map(p=>'<div class="ca-msg ca-msg-out"><small>Enviada · aguardando atualização do histórico</small><p>'+signedMessageMarkup(p.text)+'</p></div>').join('');
    const scroll=target.closest('.ca-messages');if(scroll&&redraw)scroll.scrollTop=scroll.scrollHeight;
  }catch(e){target.textContent="Falha ao atualizar o histórico: "+e.message}
  finally{historyBusy=false}
}

async function sendAttachments(contactId,caption,textarea,button){
 if(attachmentSending||!stagedFiles.length)return;
 attachmentSending=true;
 button.disabled=true;button.textContent="Enviando arquivo...";
 try{
  let count=0;
  for(const file of [...stagedFiles]){
   const data=new FormData();data.append("contactId",contactId);if(digiUserId)data.append("userId",digiUserId);if(activeServiceId)data.append("serviceId",activeServiceId);data.append("arquivo",file);if(!count&&caption)data.append("text",caption);
   const response=await fetch("/colaborador/api/atendimento/enviar-anexo",{method:"POST",credentials:"same-origin",headers:{"X-Portal":"1"},body:data});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.enviado)throw Error((result.erro||"Envio não confirmado")+(result.etapa?" Etapa: "+result.etapa+".":"")+(result.codigo?" (HTTP "+result.codigo+")":"")+(result.detalhe?" Detalhe: "+result.detalhe:""));
   stagedFiles.splice(stagedFiles.indexOf(file),1);count++;showFiles();
  }
  textarea.value="";await openRecord(active.id,false);

 }catch(err){alert("Não foi possível confirmar o envio: "+err.message+" Confira a DigiSac antes de tentar novamente para evitar duplicidade.")}
 finally{attachmentSending=false;button.disabled=false;button.textContent="Enviar";if(stagedFiles.length)showFiles()}
}

async function sendMessage(){
if(status?.identidadeCorporativa&&selected!=="meus"){alert("Assuma o atendimento antes de responder.");return;}
 const textarea=document.getElementById("caComposeText"),button=document.getElementById("caSend");
 if(!textarea||!button)return;
 if(!active){alert("Selecione uma conversa antes de enviar.");return}
 if(!status?.identidadeCorporativa&&!digiUserId){alert("Atendente DigiSac não identificado. Verifique o cadastro do usuário.");return}
 const contactId=selected==="contatos"?active.id:active.contactId||active.contact?.id;
 const message=textarea.value.trim();
 if(!contactId){alert("Contato DigiSac não identificado neste chamado.");return}
 if(stagedFiles.length){await sendAttachments(contactId,message,textarea,button);return}
 if(!contactId||!message)return;

 button.disabled=true;button.textContent="Enviando...";
 try{
  const response=await fetch("/colaborador/api/atendimento/enviar",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-Portal":"1"},body:JSON.stringify({contactId,userId:digiUserId,text:message})});
  const result=await response.json();
  if(!response.ok||!result.enviado)throw Error((result.erro||"Envio não confirmado")+(result.codigo?" (HTTP "+result.codigo+")":""));
  textarea.value="";
  sentPending.push({contactId:String(contactId),text:result.text??message,id:result.id?String(result.id):null,time:Date.now()});
  await openRecord(active.id,false);
  const scroll=document.querySelector(".ca-messages");if(scroll)scroll.scrollTop=scroll.scrollHeight;
 }catch(err){alert(err.message+" Verifique a DigiSac antes de reenviar, para evitar duplicidade.")}
 finally{const b=document.getElementById("caSend");if(b){b.textContent="Enviar";b.disabled=false}}
}

function actionModal(title,content,confirmLabel,handler){document.getElementById("ca-action-modal")?.remove();const overlay=document.createElement("div");overlay.id="ca-action-modal";overlay.className="ca-modal-backdrop";overlay.innerHTML='<section class="ca-modal" role="dialog" aria-modal="true" aria-labelledby="ca-modal-title"><header><strong id="ca-modal-title">'+safe(title)+'</strong><button type="button" class="ca-modal-close" aria-label="Fechar">×</button></header><div class="ca-modal-content">'+content+'</div><footer><button type="button" class="ca-modal-cancel">Cancelar</button><button type="button" class="ca-modal-confirm">'+safe(confirmLabel)+'</button></footer><p class="ca-modal-error" aria-live="polite"></p></section>';document.body.append(overlay);const close=()=>overlay.remove();overlay.querySelectorAll(".ca-modal-close,.ca-modal-cancel").forEach(b=>b.addEventListener("click",close));overlay.addEventListener("click",e=>{if(e.target===overlay)close()});overlay.querySelector(".ca-modal-confirm").addEventListener("click",async()=>{const button=overlay.querySelector(".ca-modal-confirm"),error=overlay.querySelector(".ca-modal-error");button.disabled=true;button.textContent="Processando...";error.textContent="";try{await handler(overlay);close()}catch(e){error.textContent=e.message||"Não foi possível concluir a operação.";button.disabled=false;button.textContent=confirmLabel}});return overlay}
async function digiJson(url,options={}){const response=await fetch(url,{credentials:"same-origin",cache:"no-store",...options}),data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.erro||"Operação recusada pela DigiSac (HTTP "+response.status+").");return data}
function selectedContactId(){return selected==="contatos"?active?.id:active?.contactId||active?.contact?.id||null}
function candidatosTransferencia(usuarios) {
  return '<fieldset class="ca-transfer-people"><legend>Atendente (opcional)</legend><div class="ca-transfer-list">'+
    '<label class="ca-transfer-person"><input type="radio" name="caTransferPerson" value="" checked><span>Deixar na fila do departamento</span></label>'+
    usuarios.map(usuario=>{
      const nome=usuario.name||"Colaborador";
      const foto=typeof usuario.foto_url==="string" && usuario.foto_url.startsWith("/colaborador/api/perfil/foto/") ? usuario.foto_url : "";
      const detalhes=[usuario.cargo,usuario.setor].filter(Boolean).join(" · ");
      return '<label class="ca-transfer-person"><input type="radio" name="caTransferPerson" value="'+safe(usuario.id)+'">'+
        '<span class="ca-transfer-avatar" aria-hidden="true">'+safe(nome.trim().charAt(0).toUpperCase())+
        (foto?'<img src="'+safe(foto)+'" alt="" loading="lazy">':'')+'</span><span><strong>'+safe(nome)+'</strong>'+
        (detalhes?'<small>'+safe(detalhes)+'</small>':'')+'</span></label>';
    }).join("")+'</div></fieldset>';
}

async function openTransfer(){const contactId=selectedContactId();if(!active||!contactId)throw Error("Selecione um atendimento aberto.");const modoCorporativo=status?.identidadeCorporativa;const [depData,userData]=await Promise.all([digiJson("/colaborador/api/atendimento/consultar/departments"),digiJson(modoCorporativo?"/colaborador/api/atendimento/atendentes":"/colaborador/api/atendimento/consultar/users")]),departments=rows(depData),users=rows(userData);if(!departments.length)throw Error("A DigiSac não retornou departamentos disponíveis.");const assumirNoPortal=(selected==="contatos"||selected==="fila")&&status?.identidadeCorporativa;const content='<label>Departamento de destino<select id="caTransferDepartment" required><option value="">Selecione o departamento</option>'+departments.map(d=>'<option value="'+safe(d.id)+'">'+safe(d.name||d.description||"Departamento")+'</option>').join("")+'</select></label>'+(assumirNoPortal?'':modoCorporativo?candidatosTransferencia(users):'<label>Atendente (opcional)<select id="caTransferUser"><option value="">Deixar na fila do departamento</option>'+users.map(u=>'<option value="'+safe(u.id)+'" '+(digiUserId!==null&&String(u.id)===String(digiUserId)?"selected":"")+'>'+safe((digiUserId!==null&&String(u.id)===String(digiUserId)?"Você — ":"")+(u.name||u.email||"Atendente"))+'</option>').join("")+'</select></label>')+'<label>Comentário interno (opcional)<textarea id="caTransferComment" maxlength="500" placeholder="Motivo ou orientação para o próximo atendente"></textarea></label>';actionModal(assumirNoPortal||selected==="contatos"?"Assumir atendimento":"Transferir conversa",content,assumirNoPortal||selected==="contatos"?"Assumir para mim":"Confirmar transferência",async modal=>{const departmentId=modal.querySelector("#caTransferDepartment").value,userId=modal.querySelector(modoCorporativo?"[name=caTransferPerson]:checked":"#caTransferUser")?.value,comments=modal.querySelector("#caTransferComment").value;if(!departmentId)throw Error("Selecione o departamento de destino.");if(selected==="contatos"&&!assumirNoPortal&&digiUserId===null)throw Error("Não foi possível identificar seu usuário na DigiSac. Confira se seu e-mail corporativo está cadastrado na DigiSac antes de assumir o atendimento.");await digiJson("/colaborador/api/atendimento/transferir",{method:"POST",headers:{"Content-Type":"application/json","X-Portal":"1"},body:JSON.stringify({contactId,departmentId,...(modoCorporativo?{portalUserId:userId||null}:{userId:userId||null}),assumir:Boolean(assumirNoPortal),...(digiUserId?{byUserId:digiUserId}:{}),comments})});if(assumirNoPortal||selected==="contatos"){selected="meus";await loadTeam();await load();const ticket=records.find(r=>String(r.contactId||r.contact?.id||"")===String(contactId));if(ticket){active=ticket;draw();await openRecord(ticket.id,false)}else{active=null;draw();alert("Transferido na DigiSac, mas o chamado ainda não apareceu em Meus Chats. Atualize a lista em instantes.")}}else{await loadTeam();await load()}})}
async function openClose(){
 const contactId=selectedContactId();
 if(!active||!contactId)throw Error("Selecione um atendimento aberto para finalizar.");
 let topics=[];
 try{
  const topicData=await digiJson("/colaborador/api/atendimento/consultar/ticket-topics");
  topics=rows(topicData);
 }catch(e){
  console.warn("Assuntos de encerramento indisponíveis; permitindo encerramento sem assunto.",e);
 }
 const validTopics=topics.filter(t=>t&&t.id!==null&&t.id!==undefined);
 const topicField=validTopics.length?'<label>Assunto do chamado (opcional)<select id="caCloseTopic"><option value="">Sem assunto</option>'+validTopics.map(t=>'<option value="'+safe(t.id)+'">'+safe(t.name||t.title||"Assunto")+'</option>').join("")+'</select></label>':'<p class="ca-meta">Nenhum assunto cadastrado. O DigiSAC permite fechar o chamado sem assunto.</p>';
 const content=topicField+'<label>Resumo do atendimento (opcional)<textarea id="caCloseComment" maxlength="500" placeholder="Resumo do atendimento"></textarea></label><p class="ca-modal-warning">O atendimento será encerrado na DigiSac e deixará de aparecer entre os chamados abertos.</p>';
 actionModal("Finalizar atendimento",content,"Fechar chamado",async modal=>{
  const topicId=modal.querySelector("#caCloseTopic")?.value||"";
  const payload={contactId,...(topicId?{ticketTopicIds:[topicId]}:{}),...(digiUserId?{byUserId:digiUserId}:{}),comments:modal.querySelector("#caCloseComment").value};
  await digiJson("/colaborador/api/atendimento/finalizar",{method:"POST",headers:{"Content-Type":"application/json","X-Portal":"1"},body:JSON.stringify(payload)});
  active=null;
  await load();
 });
}

const icon = path => '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
const micIcon = icon('<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-3 0h6"/>');
const clipIcon = icon('<path d="M8 13v-7a4 4 0 0 1 8 0v12a6 6 0 0 1-12 0V8m4 5v5a2 2 0 0 0 4 0V7"/>');
const transferIcon = icon('<path d="M4 8h15l-4-4m5 12H5l4 4"/>');
const closeIcon = icon('<path d="m5 12 4 4L19 6"/>');
const stopIcon = icon('<rect x="6" y="6" width="12" height="12" rx="2"/>');
const tabs=[["fila","Fila"],["meus","Meus chats"],["contatos","Contatos"]];
let mobileDetails=false;
const mobileView=()=>window.matchMedia("(max-width:760px)").matches;
function draw(){
const root=document.getElementById("items");if(!root||!["Central de Atendimento","atendimento"].includes(document.getElementById("sectionTitle")?.textContent))return;
root.classList.add("ca-root");
document.getElementById("sectionTitle").textContent="Central de Atendimento";
root.classList.toggle("ca-mobile-chat",mobileView()&&mobileDetails&&Boolean(active));
root.innerHTML='<div class="ca-mobile-top"><button type="button" id="caMobileBack" aria-label="Voltar">‹</button><strong>'+safe(mobileDetails&&active?nameOf(active):"Rodrinox Pro") +'</strong><div class="ca-mobile-ticket-actions" '+(mobileDetails&&active?'':'hidden')+'><button type="button" id="caMobileTransfer" aria-label="Transferir chamado" title="Transferir chamado">'+transferIcon+'</button><button type="button" id="caMobileClose" aria-label="Encerrar chamado" title="Encerrar chamado">'+closeIcon+'</button></div><button type="button" id="caMobileInfo" aria-label="Abrir menu">⋮</button><div class="ca-mobile-menu" id="caMobileMenu" hidden><button type="button" id="caMobilePlatform">Voltar à plataforma</button><button type="button" id="caMobileInternal">Chat interno</button></div></div>'+
'<div class="ca-layout"><aside class="ca-left"><div class="ca-sidebar-title"><strong>Conversas</strong><span>Rodrinox Pro</span></div><div class="ca-tabs">'+tabs.map(([id,label])=>'<button type="button" data-ca-tab="'+id+'" class="'+(selected===id?"active":"")+'">'+label+'</button>').join("")+'</div><input class="ca-search" placeholder="Pesquisar por nome, número ou protocolo..." aria-label="Pesquisar atendimento"><div class="ca-list">'+(loading?'<div class="ca-empty">Carregando conversas…</div>':error?'<div class="ca-empty">'+safe(error)+'</div>':records.length?records.map(recordMarkup).join("") :'<div class="ca-empty">'+(selected==="meus"?(digiMatchStatus||"Nenhum atendimento atribuído ao seu usuário.")+" Consulte a aba Fila ou solicite uma atribuição.":selected==="fila"?"Nenhum atendimento na fila.":"Nenhum contato encontrado.")+'</div>')+'</div></aside><section class="ca-conversation"><header>'+(active?'<button type="button" id="caPhotoZoom" aria-label="Ampliar foto do contato" style="background:none;border:0;padding:0;cursor:pointer">'+avatar(active)+'</button>':"")+'<strong>'+safe(active?nameOf(active):"Selecione um atendimento")+'</strong><span class="ca-ticket-meta">'+(active?(active.protocol?'Protocolo '+safe(active.protocol)+' · ':'') +safe(phoneOf(active)||'WhatsApp'):'')+'</span><div class="ca-ticket-actions"><button type="button" id="caTransfer" aria-label="'+(selected==="contatos"?"Assumir atendimento":"Transferir conversa")+'">'+transferIcon+'</button><button type="button" id="caClose" aria-label="Finalizar atendimento">'+closeIcon+'</button></div></header><div class="ca-messages"><div id="caMessageBody"><div style="font-size:34px;margin-bottom:10px">▤</div>Selecione um contato ou chamado para consultar as mensagens.</div></div><div id="caDropZone" class="ca-compose" style="position:relative"><input id="caAttachmentInput" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" multiple hidden><button id="caAttach" class="ca-icon-button" type="button" title="Anexar arquivos" aria-label="Anexar arquivos">'+clipIcon+'</button><textarea id="caComposeText" '+(active&&selected!=="contatos"&&(!status?.identidadeCorporativa||selected==="meus")?"":"disabled")+' placeholder="Digite uma mensagem" aria-label="Mensagem"></textarea><button id="caRecordVoice" class="ca-icon-button" type="button" title="Gravar áudio" aria-label="Gravar áudio">'+micIcon+'</button><button id="caSend" '+(active&&selected!=="contatos"&&(!status?.identidadeCorporativa||selected==="meus")?"":"disabled")+' type="button">Enviar</button><div id="caAttachmentPreview" style="display:none;position:absolute;bottom:100%;left:0;right:0;background:var(--ca-panel,#fff);color:#17304b;border:1px solid #adc5d8;padding:12px;border-radius:10px;box-shadow:0 5px 18px #0002;z-index:3"></div></div></section></div>'+
'<nav class="ca-mobile-bottom" aria-label="Navegação de atendimento"><button data-ca-mobile-tab="meus" class="'+(selected==="meus"?"active":"")+'">♧<span>Chats</span></button><button data-ca-mobile-tab="fila" class="'+(selected==="fila"?"active":"")+'">▣<span>Fila</span></button><button data-ca-mobile-tab="contatos" class="'+(selected==="contatos"?"active":"")+'">♙<span>Contatos</span></button></nav>';
root.querySelectorAll(".ca-contact-photo").forEach(img=>{img.addEventListener("error",()=>img.remove(),{once:true});if(img.complete&&!img.naturalWidth)img.remove();});document.getElementById("caPhotoZoom")?.addEventListener("click",()=>{const url=active&&photoOf(active);if(!url)return;const d=document.createElement("dialog");const img=document.createElement("img"),b=document.createElement("button");img.src=url;img.alt=nameOf(active);img.style.cssText="max-width:80vw;max-height:75vh;display:block";b.textContent="Fechar";b.onclick=()=>d.close();d.append(img,b);document.body.append(d);d.onclose=()=>d.remove();d.showModal();});document.querySelector(".ca-search")?.addEventListener("input",e=>{searchTerm=e.target.value.toLowerCase().trim();root.querySelectorAll(".ca-record").forEach(b=>{const r=records.find(x=>String(x.id)===b.dataset.caId);b.hidden=!!r&&!([nameOf(r),phoneOf(r),r.protocol,r.number,r.contact?.number,r.contactId].some(v=>String(v||"").toLowerCase().includes(searchTerm)))});});
// Revalida explicitamente o estado dos controles apos cada renderizacao.
// As acoes dependem do contato real do chamado, nao do mapeamento de e-mail.
const actionTarget = selectedContactId();
if(status?.identidadeCorporativa&&selected!=="meus"){for(const id of ["caAttach","caRecordVoice","caAttachmentInput"]) {const el=document.getElementById(id);if(el)el.disabled=true;}const input=document.getElementById("caComposeText");if(input)input.placeholder="Assuma o atendimento para responder";if(active&&selected==="fila"){const b=document.getElementById("caTransfer");if(b){b.innerHTML="Assumir atendimento";b.setAttribute("aria-label","Assumir atendimento");}}}
const canRunTicketActions = Boolean(active && selected !== "meta" && actionTarget);
for (const id of ["caTransfer","caClose"]) {
  const button = document.getElementById(id);
  if (button) {
    const allowed = id === "caClose" && selected === "contatos" ? false : canRunTicketActions;
    button.disabled = !allowed;
    button.setAttribute("aria-disabled", String(!allowed));
    button.title = allowed ? (selected === "contatos" && id === "caTransfer" ? "Assumir este atendimento e trazê-lo para Meus Chats." : button.getAttribute("aria-label")) : (id === "caClose" && selected === "contatos" ? "Abra o chamado em Meus Chats ou Fila para finalizar." : "Selecione um contato ou chamado válido.");
  }
}
async function toggleVoiceRecording(){
 const button=document.getElementById("caRecordVoice");
 if(voiceRecorder&&voiceRecorder.state==="recording"){voiceRecorder.stop();return}
 if(!active||selected==="contatos"){alert("Abra um chamado em Meus chats ou Fila antes de gravar.");return}
 if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){alert("Este aplicativo não disponibiliza gravação de áudio. Atualize o aplicativo ou use o navegador Chrome.");return}
 try{
  voiceStream=await navigator.mediaDevices.getUserMedia({audio:true});
  const mime=["audio/webm;codecs=opus","audio/mp4","audio/ogg;codecs=opus"].find(x=>MediaRecorder.isTypeSupported(x));
  voiceRecorder=new MediaRecorder(voiceStream,mime?{mimeType:mime}:undefined);
  voiceChunks=[];voiceStarted=Date.now();
  voiceRecorder.ondataavailable=e=>{if(e.data.size)voiceChunks.push(e.data)};
  voiceRecorder.onstop=()=>{
   const stream=voiceStream;voiceStream=null;stream?.getTracks().forEach(t=>t.stop());
   if(button){button.innerHTML=micIcon;button.title="Gravar áudio"}
   if(!voiceChunks.length)return;
   const type=voiceRecorder.mimeType||"audio/webm",ext=type.includes("mp4")?"m4a":type.includes("ogg")?"ogg":"webm";
   const blob=new Blob(voiceChunks,{type});voiceChunks=[];
   if(blob.size>15*1024*1024){alert("Áudio acima do limite de 15 MB.");return}
   const duration=Math.round((Date.now()-voiceStarted)/1000);
   if(!confirm("Enviar áudio gravado ("+duration+" segundos) para o cliente?"))return;
   stagedFiles.push(new File([blob],"audio-"+Date.now()+"."+ext,{type}));
   showFiles();sendMessage();
  };
  voiceRecorder.start();
  if(button){button.innerHTML=stopIcon;button.title="Parar gravação e revisar envio"}
 }catch(e){voiceStream?.getTracks().forEach(t=>t.stop());voiceStream=null;alert("Não foi possível acessar o microfone. Verifique a permissão do aplicativo nas configurações do Android.")}
}
const attachInput=document.getElementById("caAttachmentInput"),dropZone=document.getElementById("caDropZone"),preview=document.getElementById("caAttachmentPreview");
showFiles=()=>{if(!preview)return;preview.style.display=stagedFiles.length?"block":"none";preview.innerHTML=stagedFiles.length?'<span style="font-size:12px">Enviando '+stagedFiles.length+' arquivo(s)…</span>':'';};
const addFiles=files=>{if(!active||selected==="contatos"){alert("Selecione um chamado em Meus chats ou Fila antes de anexar.");return}const allowed=/^(image\/(png|jpeg|webp|gif)|application\/pdf|text\/(plain|csv)|application\/(msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet))$/i;for(const f of files){if(f.size>15*1024*1024){alert("Arquivo acima do limite provisório de 15 MB: "+f.name);continue}if(!allowed.test(f.type)&&!(/\.(docx?|xlsx?|pdf|txt|csv|png|jpe?g|webp|gif)$/i.test(f.name))){alert("Tipo de arquivo não permitido: "+f.name);continue}stagedFiles.push(f)}showFiles();if(stagedFiles.length&&!attachmentSending)sendMessage()};
document.getElementById("caAttach")?.addEventListener("click",()=>attachInput?.click());
document.getElementById("caRecordVoice")?.addEventListener("click",toggleVoiceRecording);
attachInput?.addEventListener("change",()=>{addFiles(attachInput.files||[]);attachInput.value=""});
dropZone?.addEventListener("dragover",e=>{if(!e.dataTransfer?.types.includes("Files"))return;e.preventDefault();dropZone.style.outline="2px dashed #2995d3"});
dropZone?.addEventListener("dragleave",()=>{dropZone.style.outline=""});
dropZone?.addEventListener("drop",e=>{e.preventDefault();dropZone.style.outline="";addFiles(e.dataTransfer?.files||[])});
const conversationDrop=document.querySelector(".ca-conversation");
conversationDrop?.addEventListener("dragover",e=>{if(!e.dataTransfer?.types.includes("Files"))return;e.preventDefault();dropZone.style.outline="2px dashed #2995d3"});
conversationDrop?.addEventListener("dragleave",e=>{if(!conversationDrop.contains(e.relatedTarget))dropZone.style.outline=""});
conversationDrop?.addEventListener("drop",e=>{if(!e.dataTransfer?.files?.length)return;e.preventDefault();dropZone.style.outline="";if(!dropZone.contains(e.target))addFiles(e.dataTransfer.files)});

document.getElementById("caMobileBack")?.addEventListener("click",()=>{if(mobileDetails){mobileDetails=false;active=null;draw()}else{if(!navigatePortalSection("inicio",/^(início|inicio|voltar ao início|voltar ao inicio)$/i))window.history.back()}});
document.getElementById("caMobileTransfer")?.addEventListener("click",()=>{const b=document.getElementById("caTransfer");if(b&&!b.disabled)b.click();else alert("Selecione um chamado válido para transferir.")});
document.getElementById("caMobileClose")?.addEventListener("click",()=>{const b=document.getElementById("caClose");if(b&&!b.disabled)b.click();else alert("Abra um chamado em Meus chats ou Fila para encerrá-lo.")});
document.getElementById("caMobileInfo")?.addEventListener("click",()=>{const menu=document.getElementById("caMobileMenu");if(menu)menu.hidden=!menu.hidden});
function navigatePortalSection(section,pattern){
 const preferred=(section==="inicio"?document.querySelector('#menu [data-tab="inicio"]'):null)||document.querySelector('[data-section="'+section+'"],[data-section="'+section.toLowerCase()+'"]');
 const candidates=[...document.querySelectorAll("a,button,[role=button]")].filter(e=>!e.closest("#items")&&pattern.test((e.textContent||"").trim()));
 const target=preferred||candidates[0];
 if(target){target.click();return true}
 return false;
}
document.getElementById("caMobilePlatform")?.addEventListener("click",()=>{document.getElementById("caMobileMenu").hidden=true;if(!navigatePortalSection("inicio",/^(início|inicio|voltar ao início|voltar ao inicio)$/i))window.location.assign("/colaborador/painel/oficial/")});
document.getElementById("caMobileInternal")?.addEventListener("click",()=>{document.getElementById("caMobileMenu").hidden=true;if(!navigatePortalSection("chat-interno",/^chat interno$/i))alert("Não foi possível localizar o Chat interno. Volte à plataforma e abra o Chat interno pelo menu.")});
root.querySelectorAll("[data-ca-mobile-tab]").forEach(b=>b.addEventListener("click",()=>{selected=b.dataset.caMobileTab;mobileDetails=false;active=null;load()}));
document.getElementById("caSend")?.addEventListener("click",sendMessage);
document.getElementById("caTransfer")?.addEventListener("click",()=>openTransfer().catch(e=>alert(e.message)));
document.getElementById("caClose")?.addEventListener("click",()=>openClose().catch(e=>alert(e.message)));
document.getElementById("caComposeText")?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();sendMessage()}});
root.querySelectorAll("[data-ca-tab]").forEach(b=>b.addEventListener("click",()=>{selected=b.dataset.caTab;mobileDetails=false;active=null;load()}));
root.querySelectorAll("[data-ca-id]").forEach(b=>b.addEventListener("click",()=>openRecord(b.dataset.caId)));

}
setInterval(()=>{const root=document.getElementById("items");if(!root?.querySelector(".ca-layout")||!status?.configurada)return;if(active)openRecord(active.id,false);else if(!loading)loadTeam().then(load)},12000);
window.renderCentralAtendimento=()=>{mobileDetails=false;selected="meus";status=null;records=[];active=null;contactsById.clear();previews.clear();contactsLoadedAt=0;draw();fetch("/colaborador/api/atendimento/status",{credentials:"same-origin",cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("Não foi possível verificar a integração");return r.json()}).then(s=>{status=s;Promise.all([loadTeam(),resolveDigiUser()]).then(load)}).catch(()=>{status={configurada:false};draw()})};
})();