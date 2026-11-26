
const api="/colaborador/api/email-corporativo";let caixas=[],current=null,folder="INBOX",items=[],selected=null,folders=[];const messageCache=new Map(),listCache=new Map(),pendingDetails=new Map();let readerRequest=0;const bulkSelected=new Set();let bulkBusy=false;
const folderLabel=p=>{const path=String(p?.path||"");const use=String(p?.specialUse||"").toLowerCase();const key=path.toLowerCase().split(/[./]/).pop();if(use==="\\inbox"||key==="inbox")return "Caixa de entrada";if(use==="\\sent"||key==="sent")return "Enviados";if(use==="\\drafts"||key==="drafts")return "Rascunhos";if(use==="\\junk"||key==="junk"||key==="spam")return "Spam";if(use==="\\trash"||key==="trash")return "Lixeira";return p?.name||path};
const el=id=>document.getElementById(id);const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));const fmt=d=>d?new Date(d).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):"";
async function call(path,opts={}){const headers={...(opts.headers||{})};if(opts.method&&opts.method!=="GET")headers["X-Portal"]="1";const r=await fetch(api+path,{credentials:"same-origin",cache:"no-store",...opts,headers});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.erro||"Falha ao comunicar com o servidor.");return data}
function toast(t){el("toast").textContent=t;el("toast").classList.add("show");setTimeout(()=>el("toast").classList.remove("show"),4000)}
function modal(id,on){el(id).classList.toggle("show",on)}
function setStatus(ok){el("connection").textContent=ok?"Conectado":"Desconectado";el("connection").className="status"+(ok?" ok":"")}
async function init(){try{const d=await call("/minhas");caixas=d.caixas||[];if(!caixas.length){el("messages").innerHTML='<div class="empty"><strong>Nenhuma caixa disponível</strong>Seu usuário ainda não possui uma caixa vinculada.</div>';return}current=caixas[0];renderAccount();if(current.conectado){await loadFolders();inboxSeen.set(current.id+":INBOX",new Set((listCache.get(current.id+":INBOX")?.mensagens||[]).map(m=>String(m.uid))));startInboxSync()}else{setStatus(false);renderFolders();renderNotConnected()}}catch(e){toast(e.message);el("messages").textContent=e.message}}
function renderAccount(){el("accountLabel").textContent=current.endereco;el("sideEmail").textContent=current.endereco;el("sideType").textContent=current.tipo==="compartilhada"?"Caixa compartilhada":"Conta individual";el("fromAddress").value=current.endereco;setStatus(!!current.conectado)}
function renderNotConnected(){el("folderTitle").textContent="Caixa de entrada";el("total").textContent="";el("messages").innerHTML='<div class="empty"><strong>Conecte sua caixa para sincronizar</strong>Depois de conectar, suas mensagens reais aparecerão aqui, sem sair do portal.<br><br><button class="btn primary" id="connectNow">Conectar caixa</button></div>';el("reader").innerHTML='<div class="empty"><strong>Bem-vindo ao E-mail Rodrinox Pro</strong>Leitura, envio e sincronização ficam disponíveis após autenticar esta caixa.</div>';el("connectNow")?.addEventListener("click",openConnect)}
function specialFolder(use,fallback){return folders.find(f=>f.specialUse===use)?.path||folders.find(f=>f.path?.toLowerCase()===fallback.toLowerCase())?.path||fallback}
function syncEmbeddedFolders() {
  const picker = el("embeddedFolder");
  if (picker.hidden) return;
  picker.replaceChildren(...Array.from(el("folders").querySelectorAll("[data-folder]"), button =>
    new Option(button.textContent.replace(/^▸ /, ""), button.dataset.folder)
  ));
  picker.value = folder;
}
if (document.body.classList.contains("portal-embedded")) {
  el("embeddedCompose").hidden = false;
  el("embeddedCompose").onclick = () => el("compose").click();
  el("embeddedFolder").hidden = false;
  el("embeddedFolder").onchange = event => {
    if (!current?.conectado) {event.target.value = folder; return;}
    folder = event.target.value;
    document.body.classList.remove("mobile-reading");
    void loadMessages(false);
  };
}
function renderFolders(){const root=el("folders");root.replaceChildren();const defaults=[["INBOX","Caixa de entrada"],[specialFolder("\\Sent","Sent"),"Enviados"],[specialFolder("\\Drafts","Drafts"),"Rascunhos"],[specialFolder("\\Junk","Junk"),"Spam"],[specialFolder("\\Trash","Trash"),"Lixeira"]];const known=new Set();function add(path,name,extra=false){if(!path||known.has(path.toLowerCase()))return;known.add(path.toLowerCase());const b=document.createElement("button");b.className="folder"+(folder===path?" active":"");b.textContent=(extra?"▸ ":"")+name;b.onclick=()=>{if(folder===path)return;folder=path;void loadMessages(false)};b.dataset.folder=path;root.append(b)}for(const [path,name] of defaults)add(path,name);const standard=new Set(["\\Inbox","\\Sent","\\Drafts","\\Junk","\\Trash","\\Archive","\\All","\\Flagged"]);const custom=folders.filter(f=>f.path&&!known.has(f.path.toLowerCase())&&!standard.has(f.specialUse));if(custom.length){const heading=document.createElement("div");heading.className="folder-heading";heading.textContent="PASTAS";heading.style.cssText="padding:14px 10px 6px;font-size:11px;letter-spacing:.08em;opacity:.75";root.append(heading);for(const f of custom)add(f.path,f.name||f.path,true)}syncEmbeddedFolders()}

async function loadFolders(){const accountId=current.id;renderFolders();const messagesPromise=loadMessages();try{const d=await call("/"+accountId+"/pastas");if(current?.id!==accountId)return;folders=d.pastas||[];if(folder==="Sent")folder=specialFolder("\\Sent","Sent");renderFolders()}catch(e){console.warn("Pastas indisponíveis; mantendo pastas padrão.",e)}await messagesPromise}
async function loadMessages(force=false){const accountId=current.id,folderPath=folder,cacheKey=accountId+":"+folderPath;readerRequest++;selected=null;bulkSelected.clear();updateBulkToolbar();el("reader").innerHTML='<div class="empty">Selecione uma mensagem para ler.</div>';try{el("folderTitle").textContent=folderLabel(folders.find(f=>f.path===folder)||{path:folder});const cached=listCache.get(cacheKey);if(cached&&!force){items=cached.mensagens;el("total").textContent=cached.total+" mensagens";renderFolders();renderMessages()}else{items=[];el("total").textContent="";el("messages").innerHTML='<div class="empty">Carregando mensagens...</div>';renderFolders()}const d=await call("/"+accountId+"/mensagens?pasta="+encodeURIComponent(folderPath)+(force?"&refresh=1":""));if(current?.id!==accountId||folder!==folderPath)return;items=d.mensagens||[];listCache.set(cacheKey,{mensagens:items,total:d.total||0});if(listCache.size>25)listCache.delete(listCache.keys().next().value);el("total").textContent=(d.total||0)+" mensagens";renderFolders();renderMessages();}catch(e){toast(e.message)}}
// Sincronização automática enquanto a aba está ativa; a primeira leitura estabelece a referência.
let syncBusy=false,syncTimer=null;const inboxSeen=new Map();
async function syncInbox(){
 if(syncBusy||!current?.conectado||document.hidden)return;
 const accountId=current.id,key=accountId+":INBOX";syncBusy=true;
 try{
  const d=await call("/"+accountId+"/mensagens?pasta=INBOX&refresh=1");
  if(current?.id!==accountId)return;
  const incoming=d.mensagens||[],previous=inboxSeen.get(key);
  const next=new Set(incoming.map(m=>String(m.uid)));
  inboxSeen.set(key,next);
  listCache.set(key,{mensagens:incoming,total:d.total||0});
  if(folder==="INBOX"){
   items=incoming;el("total").textContent=(d.total||0)+" mensagens";
   renderMessages();
  }
  if(previous){
   const added=incoming.filter(m=>!previous.has(String(m.uid)));
   if(added.length){
    toast(added.length===1?"Novo e-mail recebido de "+(added[0].de||added[0].email):added.length+" novos e-mails recebidos");
    if("Notification" in window&&Notification.permission==="granted"){
     const n=new Notification("Rodrinox Pro · Novo e-mail",{body:added.length===1?(added[0].assunto||"Sem assunto"):added.length+" mensagens novas",tag:"rodrinox-email-"+accountId});
     n.onclick=()=>{window.focus();folder="INBOX";void loadMessages(false);n.close()};
    }
   }
  }
 }catch(e){console.warn("Sincronização automática de e-mails:",e.message)}finally{syncBusy=false}
}
function startInboxSync(){
 if(syncTimer)clearInterval(syncTimer);
 syncTimer=setInterval(()=>{void syncInbox()},10000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)void syncInbox()});
}
// Não pré-carregar mensagens: o endpoint de leitura marca a mensagem como lida no IMAP.
async function setMailReadState(m,read){const accountId=current.id,folderPath=folder,previous=m.naoLida;try{await call("/"+accountId+"/mensagens/"+m.uid+"/flags",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({pasta:folderPath,lida:read})});m.naoLida=!read;const key=accountId+":"+folderPath;const cached=listCache.get(key);if(cached){const entry=cached.mensagens.find(x=>x.uid===m.uid);if(entry)entry.naoLida=!read}renderMessages()}catch(e){m.naoLida=previous;renderMessages();toast(e.message)}}
function updateBulkToolbar(){let bar=el("bulkToolbar");if(!bar){bar=document.createElement("div");bar.id="bulkToolbar";bar.className="bulk-toolbar";bar.innerHTML='<label class="bulk-all"><input type="checkbox" id="bulkAll"> Selecionar todos</label><strong id="bulkCount">0 selecionados</strong><button type="button" class="btn" id="bulkMove">Mover para pasta</button><button type="button" class="btn" id="bulkTrash">Mover para lixeira</button><button type="button" class="btn" id="bulkClear">Limpar</button>';el("messages").parentNode.insertBefore(bar,el("messages"));el("bulkAll").onchange=e=>{const term=el("search").value.toLowerCase();for(const m of items.filter(m=>(m.assunto+" "+m.de+" "+m.email).toLowerCase().includes(term))){if(e.target.checked)bulkSelected.add(String(m.uid));else bulkSelected.delete(String(m.uid))}renderMessages()};el("bulkClear").onclick=()=>{bulkSelected.clear();renderMessages()};el("bulkTrash").onclick=()=>void executeBulk("excluir");el("bulkMove").onclick=()=>showBulkFolders()}const n=bulkSelected.size;el("bulkCount").textContent=n+" selecionado"+(n===1?"":"s");el("bulkMove").disabled=el("bulkTrash").disabled=el("bulkClear").disabled=bulkBusy||!n;el("bulkAll").disabled=bulkBusy;bar.classList.toggle("has-selection",n>0);const term=el("search").value.toLowerCase(),visible=items.filter(m=>(m.assunto+" "+m.de+" "+m.email).toLowerCase().includes(term));el("bulkAll").checked=visible.length>0&&visible.every(m=>bulkSelected.has(String(m.uid)));el("bulkAll").indeterminate=visible.some(m=>bulkSelected.has(String(m.uid)))&&!el("bulkAll").checked}
function showBulkFolders(){if(!bulkSelected.size)return;const destinos=folders.filter(p=>p.path&&p.path!==folder&&!p.flags?.includes("\\\\Noselect"));if(!destinos.length){toast("Nenhuma outra pasta disponível.");return}const menu=document.createElement("div");menu.className="bulk-folder-menu";menu.innerHTML='<strong>Mover mensagens para</strong><input type="search" placeholder="Pesquisar pasta..." aria-label="Pesquisar pastas"><div class="bulk-folder-options"></div><button type="button" class="btn">Cancelar</button>';document.body.append(menu);menu.querySelector("button").onclick=()=>menu.remove();const search=menu.querySelector("input"),options=menu.querySelector(".bulk-folder-options");function draw(){options.replaceChildren();for(const p of destinos.filter(p=>folderLabel(p).toLowerCase().includes(search.value.toLowerCase()))){const b=document.createElement("button");b.type="button";b.className="btn";b.textContent=folderLabel(p);b.onclick=()=>{menu.remove();void executeBulk("mover",p.path)};options.append(b)}}search.oninput=draw;draw();search.focus()}
async function executeBulk(action,destino){if(bulkBusy||!bulkSelected.size)return;const uids=[...bulkSelected];if(action==="excluir"&&!confirm("Mover "+uids.length+" mensagem(ns) para a Lixeira?"))return;const accountId=current.id,source=folder;bulkBusy=true;updateBulkToolbar();let done=0,failed=0;for(const uid of uids){try{await call("/"+accountId+"/mensagens/"+encodeURIComponent(uid)+"/"+action,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action==="mover"?{pasta:source,destino}:{pasta:source})});done++;bulkSelected.delete(uid);messageCache.delete(accountId+":"+source+":"+uid);items=items.filter(m=>String(m.uid)!==uid)}catch(e){failed++;console.warn("Operação em lote:",uid,e.message)}}bulkBusy=false;listCache.delete(accountId+":"+source);if(destino)listCache.delete(accountId+":"+destino);if(done){selected=null;el("reader").innerHTML='<div class="empty">'+done+' mensagem(ns) processada(s).</div>'}renderMessages();toast(done+" mensagem(ns) "+(action==="mover"?"movida(s).":"enviada(s) à Lixeira.")+(failed?" "+failed+" falha(s).":""));if(done)void loadMessages(true)}
function renderMessages(){const root=el("messages"),term=el("search").value.toLowerCase();root.replaceChildren();updateBulkToolbar();const visible=items.filter(m=>(m.assunto+" "+m.de+" "+m.email).toLowerCase().includes(term));if(!visible.length){root.innerHTML='<div class="empty"><strong>Nenhuma mensagem encontrada</strong>Esta pasta não possui mensagens ou sua pesquisa não encontrou resultados.</div>';return}for(const m of visible){const row=document.createElement("div");row.className="mail-row"+(bulkSelected.has(String(m.uid))?" bulk-checked":"");const check=document.createElement("input");check.type="checkbox";check.className="mail-select";check.checked=bulkSelected.has(String(m.uid));check.setAttribute("aria-label","Selecionar e-mail: "+(m.assunto||"Sem assunto"));check.onclick=e=>e.stopPropagation();check.onchange=()=>{if(check.checked)bulkSelected.add(String(m.uid));else bulkSelected.delete(String(m.uid));row.classList.toggle("bulk-checked",check.checked);updateBulkToolbar()};row.append(check);const b=document.createElement("button");b.className="mail"+(m.naoLida?" unread":"")+(selected===m.uid?" active":"");b.innerHTML='<div class="line"><span class="sender">'+esc(m.de||m.email)+'</span><time>'+esc(fmt(m.data))+'</time></div><div class="subject">'+(m.favorita?"★ ":"")+esc(m.assunto)+'</div><div class="preview">'+esc(m.email)+'</div>';b.onclick=()=>openMessage(m);const status=document.createElement("button");status.type="button";status.className="mail-read-status"+(m.naoLida?" is-unread":"");status.textContent=m.naoLida?"Não lido":"Lido";status.title=m.naoLida?"Marcar como lido":"Marcar como não lido";status.setAttribute("aria-label",status.title+": "+(m.assunto||"Sem assunto"));status.onclick=()=>void setMailReadState(m,m.naoLida);row.append(b,status);root.append(row)}}
function renderMessageBody(message) {
  const body = el("bodyText");
  if (!message.html?.trim()) {
    body.textContent = message.texto?.trim() ? message.texto : "Esta mensagem não contém texto para exibição.";
    return;
  }

  const frame = document.createElement("iframe");
  // Keep the sender's HTML isolated from the portal and block remote resources.
  frame.setAttribute("sandbox", "allow-popups allow-popups-to-escape-sandbox");
  frame.referrerPolicy = "no-referrer";
  frame.title = "Conteúdo do e-mail";
  const policy = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'";
  const template = document.createElement("template");
  template.innerHTML = message.html;
  const content = template.content;
  content.querySelectorAll("meta, base, script, iframe, object, embed, form, link").forEach(node => node.remove());
  for (const link of content.querySelectorAll("a[href]")) {
    if (!/^(https?:|mailto:)/i.test(link.getAttribute("href").trim())) {
      link.removeAttribute("href");
      continue;
    }
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  frame.srcdoc = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta http-equiv="Content-Security-Policy" content="' + policy + '">' +
    '<style>body{font:15px/1.6 Arial,sans-serif;color:#172b40;background:#fff;margin:0;padding:16px;overflow-wrap:anywhere}img{max-width:100%;height:auto}pre{white-space:pre-wrap}</style>' +
    '<body>' + template.innerHTML;
  body.replaceChildren(frame);
  body.classList.add("html-message");
}

async function openMessage(m){selected=m.uid;renderMessages();const request=++readerRequest,cacheKey=current.id+":"+folder+":"+m.uid;let x=messageCache.get(cacheKey);if(!x)el("reader").innerHTML='<div class="empty">Carregando mensagem...</div>';try{if(!x){const pending=pendingDetails.get(cacheKey);const d=await (pending||call("/"+current.id+"/mensagens/"+m.uid+"?pasta="+encodeURIComponent(folder)));pendingDetails.delete(cacheKey);if(request!==readerRequest)return;x=d.mensagem;messageCache.set(cacheKey,x);if(messageCache.size>35)messageCache.delete(messageCache.keys().next().value)}el("reader").innerHTML='<div class="readerhead"><h2>'+esc(x.assunto||"Sem assunto")+'</h2><div class="meta">De: '+esc(x.de)+'<br>Para: '+esc(x.para)+(x.cc?'<br>Cc: '+esc(x.cc):'')+'<br>Data: '+esc(fmt(x.data))+'</div><div class="readeractions"><button class="btn" id="reply">↶ Responder</button><button class="btn" id="forward">↪ Encaminhar</button><button class="btn" id="readerReadState">Marcar como não lido</button><button class="btn" id="favorite">☆ Favoritar</button><button class="btn" id="moveMail">Mover para pasta</button><button class="btn" id="deleteMail">Mover para lixeira</button></div></div><div class="body" id="bodyText"></div><div class="attachments" id="attachments"></div>';renderMessageBody(x);const readState=el("readerReadState");readState.textContent=m.naoLida?"Marcar como lido":"Marcar como não lido";readState.onclick=async()=>{readState.disabled=true;await setMailReadState(m,m.naoLida);readState.textContent=m.naoLida?"Marcar como lido":"Marcar como não lido";readState.disabled=false};el("favorite").textContent=m.favorita?"★ Remover favorito":"☆ Favoritar";el("favorite").onclick=async()=>{try{await call("/"+current.id+"/mensagens/"+m.uid+"/flags",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({pasta:folder,favorita:!m.favorita})});m.favorita=!m.favorita;el("favorite").textContent=m.favorita?"★ Remover favorito":"☆ Favoritar";renderMessages()}catch(e){toast(e.message)}};el("moveMail").onclick=async()=>{const destinos=folders.filter(p=>p.path&&p.path!==folder&&!p.flags?.includes("\\Noselect"));if(!destinos.length){toast("Nenhuma outra pasta disponível.");return}const menu=document.createElement("div");menu.style.cssText="position:fixed;z-index:10000;top:22%;left:50%;transform:translateX(-50%);width:min(340px,90vw);max-height:60vh;overflow:auto;padding:16px;border:1px solid #57728d;border-radius:12px;background:#102b45;box-shadow:0 16px 60px #0009;color:white";menu.innerHTML='<strong>Mover para</strong><input aria-label="Pesquisar pastas" placeholder="Pesquisar pasta..." style="display:block;width:100%;box-sizing:border-box;margin:12px 0;padding:10px;background:#fff;color:#111;border-radius:6px"><div class="folder-options"></div><button type="button" class="btn cancel-move" style="margin-top:10px">Cancelar</button>';document.body.append(menu);const search=menu.querySelector("input"),options=menu.querySelector(".folder-options");menu.querySelector(".cancel-move").onclick=()=>menu.remove();const draw=()=>{options.replaceChildren();for(const p of destinos.filter(p=>folderLabel(p).toLowerCase().includes(search.value.toLowerCase()))){const b=document.createElement("button");b.type="button";b.className="btn";b.style.cssText="display:block;width:100%;text-align:left;margin:4px 0";b.textContent=folderLabel(p);b.onclick=async()=>{b.disabled=true;try{const source=folder;await call("/"+current.id+"/mensagens/"+m.uid+"/mover",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pasta:source,destino:p.path})});menu.remove();messageCache.delete(current.id+":"+source+":"+m.uid);listCache.delete(current.id+":"+source);listCache.delete(current.id+":"+p.path);selected=null;el("reader").innerHTML='<div class="empty">Mensagem movida para '+esc(folderLabel(p))+'.</div>';items=items.filter(i=>i.uid!==m.uid);renderMessages();toast("Mensagem movida para "+folderLabel(p));void loadMessages(true)}catch(e){toast(e.message);b.disabled=false}};options.append(b)}};search.oninput=draw;draw();search.focus()};el("deleteMail").onclick=async()=>{if(!confirm("Mover esta mensagem para a Lixeira?"))return;try{await call("/"+current.id+"/mensagens/"+m.uid+"/excluir",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pasta:folder})});toast("Mensagem movida para a Lixeira.");selected=null;el("reader").innerHTML='<div class="empty">Mensagem removida da pasta.</div>';await loadMessages()}catch(e){toast(e.message)}};const att=el("attachments");if(x.anexos?.some(a=>!a.incorporado)){att.innerHTML='<div class="section">Anexos</div>'+x.anexos.filter(a=>!a.incorporado).map((a)=>'<a class="hint attachmentLink" href="'+api+'/'+current.id+'/mensagens/'+m.uid+'/anexos/'+(a.indice??x.anexos.indexOf(a))+'?pasta='+encodeURIComponent(folder)+'" target="_blank" rel="noopener">📎 '+esc(a.nome||"Anexo")+' · '+Math.ceil((a.tamanho||0)/1024)+' KB · Baixar</a>').join("")}el("reply").onclick=()=>{el("to").value=x.de.match(/<([^>]+)>/)?.[1]||m.email;el("subject").value=/^re:/i.test(x.assunto)?"": "Re: "+x.assunto;el("messageText").value="\n\n— Mensagem original —\n"+x.texto;modal("composeModal",true)};el("forward").onclick=()=>{el("subject").value="Enc: "+x.assunto;el("messageText").value="\n\n— Mensagem encaminhada —\nDe: "+x.de+"\n"+x.texto;modal("composeModal",true)};if(m.naoLida){readState.disabled=true;await setMailReadState(m,true);readState.textContent=m.naoLida?"Marcar como lido":"Marcar como não lido";readState.disabled=false}}catch(e){toast(e.message)}}
function openConnect(){if(!current)return;el("connectAddress").value=current.endereco;el("mailPassword").value="";modal("connectModal",true)}
el("settings").onclick=openConnect;el("refresh").onclick=()=>{messageCache.clear();listCache.clear();return current?.conectado?loadMessages(true):init()};el("compose").onclick=()=>{if(!current?.conectado){openConnect();return}el("to").value="";el("cc").value="";el("bcc").value="";el("subject").value="";el("messageText").innerHTML="";el("attachmentsInput").value="";el("attachmentHint").textContent="Você pode anexar documentos e imagens à mensagem.";modal("composeModal",true)};el("search").oninput=renderMessages;
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>modal(b.dataset.close,false));
el("connectForm").onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await call("/"+current.id+"/conectar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({senha:el("mailPassword").value})});current.conectado=true;modal("connectModal",false);renderAccount();toast("Caixa conectada com sucesso.");await loadFolders();startInboxSync()}catch(err){toast(err.message)}finally{b.disabled=false}};
el("composeForm").onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{const html=el("messageText").innerHTML,text=el("messageText").innerText.trim();const data=new FormData();data.append("para",el("to").value);data.append("cc",el("cc").value);data.append("cco",el("bcc").value);data.append("assunto",el("subject").value);data.append("texto",text);data.append("html",html);for(const file of el("attachmentsInput").files)data.append("anexos",file);const result=await call("/"+current.id+"/enviar",{method:"POST",body:data});modal("composeModal",false);toast(result.savedToSent?"Mensagem enviada e salva em Enviados.":"Mensagem enviada; cópia em Enviados não confirmada.");folder=result.sentFolder||specialFolder("\\Sent","Sent");listCache.delete(current.id+":"+folder);await loadMessages(true)}catch(err){toast(err.message)}finally{b.disabled=false}};document.querySelectorAll("[data-cmd]").forEach(b=>b.onclick=()=>{el("messageText").focus();document.execCommand(b.dataset.cmd,false,null)});el("attachmentsInput").onchange=()=>{const files=[...el("attachmentsInput").files];if(files.length>5||files.some(x=>x.size>10*1024*1024)){el("attachmentsInput").value="";el("attachmentHint").textContent="Limite: até 5 arquivos de 10 MB cada.";return}el("attachmentHint").textContent=files.length?files.length+" arquivo(s) selecionado(s).":"Nenhum anexo selecionado.";};
init();

(()=>{const mobile=()=>matchMedia("(max-width:720px)").matches;
const close=()=>{document.body.classList.remove("mobile-nav-open");document.getElementById("mobileMenuToggle")?.setAttribute("aria-expanded","false")};
document.getElementById("mobileMenuToggle").onclick=()=>{const on=document.body.classList.toggle("mobile-nav-open");document.getElementById("mobileMenuToggle").setAttribute("aria-expanded",String(on))};
document.getElementById("mobileOverlay").onclick=close;
document.getElementById("folders").addEventListener("click",e=>{if(mobile()&&e.target.closest(".folder")){close();document.body.classList.remove("mobile-reading")}},true);
document.getElementById("messages").addEventListener("click",e=>{if(mobile()&&e.target.closest(".mail"))document.body.classList.add("mobile-reading")},true);
const reader=document.getElementById("reader");const back=document.createElement("button");back.className="mobile-back";back.textContent="‹ Voltar às mensagens";back.onclick=()=>document.body.classList.remove("mobile-reading");
new MutationObserver(()=>{if(mobile()&&!reader.contains(back))reader.prepend(back)}).observe(reader,{childList:true});
reader.prepend(back);
document.getElementById("mobileCompose").onclick=()=>document.getElementById("compose").click();
document.getElementById("mobilePortal").onclick=()=>document.querySelector("[data-portal-return]")?.click();
document.getElementById("mobileAttendance").onclick=()=>document.body.classList.toggle("mobile-attendance-open");
document.getElementById("mobileCloseAttendance").onclick=()=>document.body.classList.remove("mobile-attendance-open");
const folderAside=document.querySelector(".folders");
const navLink=document.createElement("button");navLink.className="mobile-nav-link";navLink.textContent="⌂ Voltar ao portal";navLink.onclick=()=>document.querySelector("[data-portal-return]")?.click();folderAside.append(navLink);
const attendanceLink=document.createElement("button");attendanceLink.className="mobile-nav-link";attendanceLink.textContent="☏ Atendimento";attendanceLink.onclick=()=>{close();document.body.classList.add("mobile-attendance-open")};folderAside.append(attendanceLink);
function findWidget(needle){
 const candidates=[...document.querySelectorAll("button,a,[role=button]")].filter(e=>e.textContent?.trim().toLowerCase().includes(needle)&&!e.closest("#mobileAttendanceSheet,.folders"));
 for(const e of candidates){let node=e;for(let i=0;i<6&&node&&node!==document.body;i++,node=node.parentElement){if(getComputedStyle(node).position==="fixed")return {button:e,wrapper:node}}}
 return null;
}
const widgets={whatsapp:null,chat:null};
function adjustWidgets(){
 if(!mobile())return;
 for(const [key,needle] of [["whatsapp","central de atendimento"],["chat","chat interno"]]){
  const w=findWidget(needle);
  if(w){widgets[key]=w;w.wrapper.classList.add("mobile-widget-hidden")}
 }
}
function openWidget(key){
 document.body.classList.remove("mobile-attendance-open");
 const w=widgets[key];
 if(w?.button?.isConnected){w.button.click();return}
 adjustWidgets();widgets[key]?.button?.click();
}
document.getElementById("mobileOpenWhatsapp").onclick=()=>openWidget("whatsapp");
document.getElementById("mobileOpenChat").onclick=()=>openWidget("chat");
const widgetObserver=new MutationObserver(()=>{widgetObserver.disconnect();adjustWidgets();widgetObserver.observe(document.body,{childList:true,subtree:true})});
widgetObserver.observe(document.body,{childList:true,subtree:true});
adjustWidgets();
window.addEventListener("resize",()=>{if(!mobile()){close();document.body.classList.remove("mobile-reading")}});
})();
