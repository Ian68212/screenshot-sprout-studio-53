"use strict";
const $=id=>document.getElementById(id);
const app=document.querySelector(".app");
if(new URLSearchParams(location.search).has("janela")){document.documentElement.classList.add("rp-embedded");const back=document.querySelector(".back");if(back){back.textContent="← Minimizar";back.href="#";back.addEventListener("click",e=>{e.preventDefault();if(window.parent!==window){window.parent.postMessage({type:"rodrinox-chat-minimize"},location.origin)}else{location.assign(me?.perfil==="admin"?"/colaborador/painel/oficial/":"/colaborador/oficial/")}})}}
let me=null,selected=null,people=[],lastSignature="",previousUnread=null;
async function api(path,options={}){
 const r=await fetch("/colaborador/api/chat-interno"+path,{credentials:"same-origin",cache:"no-store",...options});
 if(r.status===401){location.href="/colaborador/";throw Error("Sessão encerrada");}
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(j.erro||"Erro de conexão ("+r.status+")");
 return j;
}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function when(value){if(!value)return "";const d=new Date(value);return Number.isNaN(d.getTime())?"":d.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});}
function initials(name){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase();}
function drawPeople(){
 const search=$("search").value.toLocaleLowerCase("pt-BR");
 const area=$("people");area.replaceChildren();
 const found=people.filter(p=>p.nome.toLocaleLowerCase("pt-BR").includes(search));
 if(!found.length)area.append(el("div","empty","Nenhum colaborador encontrado."));
 for(const p of found){
  const b=el("button","person"+(p.id===selected?" active":""));
  b.type="button";const avatar=el("span","avatar",initials(p.nome));if(p.foto_url){avatar.textContent="";const img=el("img");img.src=p.foto_url;img.alt="";img.loading="lazy";img.onerror=()=>{avatar.textContent=initials(p.nome)};avatar.append(img);}b.append(avatar);
  const body=el("span","person-body"),title=el("span","person-name");
  title.append(el("span","",p.nome),el("span","presence "+(Number(p.online)===1?"online":"offline"),Number(p.online)===1?"Online":"Offline"));
  if(Number(p.nao_lidas)>0)title.append(el("span","count",String(p.nao_lidas)));
  body.append(title,el("small","",p.ultima||p.setor||"Iniciar conversa"));
  b.append(body);b.addEventListener("click",()=>openChat(p.id));area.append(b);
 }
}
async function refreshPeople(){
 const data=await api("/conversas");
 people=data.conversas;
 const total=people.reduce((sum,p)=>sum+Number(p.nao_lidas||0),0);
 $("badge").textContent=total?"("+total+" novas)":"";
 document.title=(total?"("+total+") ":"")+"Chat Interno | Rodrinox Pro";
 if(previousUnread!==null && total>previousUnread && document.hidden && "Notification" in window && Notification.permission==="granted"){
  new Notification("Rodrinox Pro • Chat interno",{body:"Você recebeu uma nova mensagem.",tag:"rodrinox-chat"});
 }
 previousUnread=total;
 drawPeople();updatePeerPresence();
}
function updatePeerPresence(){
 const p=people.find(x=>Number(x.id)===Number(selected));
 const node=$("peerPresence");if(!node)return;
 node.className="peer-presence "+(Number(p?.online)===1?"online":"offline");
 node.textContent=Number(p?.online)===1?"● Online":"○ Offline";
}
async function heartbeat(){if(document.visibilityState!=="visible")return;try{await api("/presenca",{method:"POST",headers:{"X-Portal":"1"}})}catch(_){} }
async function openChat(id){
 selected=id;lastSignature="";app.classList.add("chat-open");drawPeople();updatePeerPresence();
 const p=people.find(x=>x.id===id);$("peer").textContent=p?.nome||"Colaborador";
 const photo=$("peerPhoto");if(photo){photo.replaceChildren();if(p?.foto_url){const img=el("img");img.src=p.foto_url;img.alt="";photo.append(img);}else photo.textContent=initials(p?.nome||"Colaborador");}
 $("startCall").disabled=false;$("message").disabled=false;$("send").disabled=false;$("attach").disabled=false;$("recordVoice").disabled=false;$("message").focus();
 await refreshMessages(true);
}
async function refreshMessages(force=false){
 if(!selected)return;
 const id=selected,data=await api("/mensagens/"+id);if(id!==selected)return;
 const signature=data.mensagens.map(x=>x.id+":"+(x.lido_em?"1":"0")).join("|");
 if(!force && signature===lastSignature)return;
 lastSignature=signature;
 const area=$("messages"),nearBottom=area.scrollHeight-area.scrollTop-area.clientHeight<120;
 area.replaceChildren();
 if(!data.mensagens.length)area.append(el("div","empty","Comece a conversa com uma mensagem."));
 for(const m of data.mensagens){
  const mine=Number(m.remetente_id)===Number(me.id);
  const bubble=el("div","bubble"+(mine?" mine":""),m.anexo_nome?"":m.texto);
  if(m.anexo_nome){
    const link=el("a","attachment-link","📎 "+m.anexo_nome);
    link.href="/colaborador/api/chat-interno/anexos/"+encodeURIComponent(m.id);
    link.title="Baixar documento privado";
    link.setAttribute("download",m.anexo_nome);
    if(String(m.anexo_mime||"").startsWith("audio/")){link.textContent="🎤 Mensagem de voz";const player=el("audio");player.controls=true;player.preload="none";player.src=link.href;bubble.append(player);}else bubble.append(link,el("span","attachment-size",Math.ceil(Number(m.anexo_tamanho||0)/1024)+" KB • Baixar arquivo"));
  }
  bubble.append(el("small","",when(m.criado_em)+(mine?(m.lido_em?"  ✓✓":"  ✓"):"")));
  area.append(bubble);
 }
 if(force||nearBottom)area.scrollTop=area.scrollHeight;
}
$("composer").addEventListener("submit",async e=>{
 e.preventDefault();const text=$("message").value.trim();if(!selected||!text)return;
 $("send").disabled=true;$("state").textContent="Enviando...";
 try{
  await api("/mensagens",{method:"POST",headers:{"Content-Type":"application/json","X-Portal":"1"},body:JSON.stringify({destinatario_id:selected,texto:text})});
  $("message").value="";await refreshMessages(true);await refreshPeople();$("state").textContent="";
 }catch(err){$("state").textContent=err.message;}
 finally{$("send").disabled=false;}
});
let uploadingAttachment=false;
async function sendAttachment(file){
 if(!file||!selected)return;
 if(uploadingAttachment){$("state").textContent="Aguarde o envio atual.";return;}
 const maxSize=2*1024*1024*1024;
 if(file.size>maxSize){$("state").textContent="Limite de 2 GB por arquivo";return;}
 if(!file.size){$("state").textContent="Arquivo vazio ou pasta não suportada.";return;}
 const recipient=selected;
 uploadingAttachment=true;$("attach").disabled=true;
 const progress=$("uploadProgress"),bar=$("uploadBar");
 progress.hidden=false;bar.value=0;
 try{
  const init=await api("/uploads/iniciar",{method:"POST",headers:{"Content-Type":"application/json","X-Portal":"1"},
   body:JSON.stringify({destinatario_id:recipient,nome:file.name,mime:file.type||"application/octet-stream",tamanho:file.size})});
  let offset=init.offset||0,attempts=0;
  while(offset<file.size){
   const end=Math.min(offset+init.chunkSize,file.size);
   const part=file.slice(offset,end);
   $("state").textContent="Enviando "+Math.floor(100*offset/file.size)+"%";
   try{
    const response=await fetch("/colaborador/api/chat-interno/uploads/"+encodeURIComponent(init.uploadId)+"/bloco",{
     method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/octet-stream","X-Upload-Offset":String(offset),"X-Portal":"1"},body:part
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
     if(response.status===409&&Number.isFinite(data.offset)){offset=data.offset;continue;}
     throw Error(data.erro||"Falha no envio ("+response.status+")");
    }
    if(data.offset<=offset&&!data.complete)throw Error("Envio não avançou");
    offset=data.offset;attempts=0;bar.value=Math.round(100*offset/file.size);
    if(data.complete)break;
   }catch(error){
    if(++attempts>3)throw error;
    const status=await api("/uploads/"+encodeURIComponent(init.uploadId));
    offset=status.offset;
   }
  }
  if(selected===recipient){await refreshMessages(true);await refreshPeople();}
  $("state").textContent="Documento enviado";
 }catch(err){$("state").textContent="Falha no envio: "+err.message;}
 finally{uploadingAttachment=false;$("file").value="";$("attach").disabled=!selected;progress.hidden=true;}
}
let voiceRecorder=null,voiceChunks=[],voiceBlob=null,voiceUrl=null,voiceStream=null,voiceRecipient=null;
const voiceButton=$("recordVoice"),voicePreview=$("voicePreview");
function voiceCleanup(){
 if(voiceStream){voiceStream.getTracks().forEach(t=>t.stop());voiceStream=null}
 if(voiceUrl){URL.revokeObjectURL(voiceUrl);voiceUrl=null}
 voiceBlob=null;voiceChunks=[];voicePreview.hidden=true;voiceButton.textContent="🎤";voiceButton.classList.remove("recording");
}
voiceButton.addEventListener("click",async()=>{
 if(voiceRecorder?.state==="recording"){voiceRecorder.stop();voiceButton.disabled=true;return}
 if(!selected||uploadingAttachment)return;
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){$("state").textContent="Gravação não disponível neste navegador.";return}
 voiceCleanup();voiceRecipient=selected;
 try{
  voiceStream=await navigator.mediaDevices.getUserMedia({audio:true});
  const mime=["audio/webm;codecs=opus","audio/mp4","audio/ogg;codecs=opus"].find(x=>MediaRecorder.isTypeSupported(x));
  voiceRecorder=new MediaRecorder(voiceStream,mime?{mimeType:mime}:undefined);
  voiceChunks=[];
  voiceRecorder.ondataavailable=e=>{if(e.data.size)voiceChunks.push(e.data)};
  voiceRecorder.onstop=()=>{
   voiceStream?.getTracks().forEach(t=>t.stop());voiceStream=null;
   voiceBlob=new Blob(voiceChunks,{type:voiceRecorder.mimeType||"audio/webm"});
   if(voiceBlob.size>10*1024*1024){$("state").textContent="Áudio excede 10 MB. Grave uma mensagem mais curta.";voiceCleanup();return}
   voiceUrl=URL.createObjectURL(voiceBlob);$("voicePlayer").src=voiceUrl;voicePreview.hidden=false;
   voiceButton.disabled=false;voiceButton.textContent="🎤";voiceButton.classList.remove("recording");
   $("state").textContent="Ouça antes de enviar.";
  };
  voiceRecorder.start();voiceButton.textContent="■ Parar";voiceButton.classList.add("recording");
  $("state").textContent="Gravando áudio... clique para parar.";
 }catch(e){voiceCleanup();$("state").textContent=e.name==="NotAllowedError"?"Permita o uso do microfone no navegador.":"Não foi possível iniciar a gravação."}
});
$("voiceCancel").onclick=()=>{voiceCleanup();$("state").textContent="Áudio descartado."};
$("voiceSend").onclick=async()=>{
 if(!voiceBlob||!voiceRecipient)return;
 const recipient=voiceRecipient,blob=voiceBlob;
 const ext=blob.type.includes("mp4")?"m4a":blob.type.includes("ogg")?"ogg":"webm";
 const form=new FormData();form.append("destinatario_id",String(recipient));form.append("arquivo",new File([blob],"audio-"+Date.now()+"."+ext,{type:blob.type.split(";")[0]}));
 $("voiceSend").disabled=true;$("state").textContent="Enviando áudio...";
 try{
  await api("/anexos",{method:"POST",headers:{"X-Portal":"1"},body:form});
  voiceCleanup();await refreshMessages(true);await refreshPeople();$("state").textContent="Áudio enviado.";
 }catch(e){$("state").textContent=e.message}
 finally{$("voiceSend").disabled=false}
};
$("attach").addEventListener("click",()=>{if(selected)$("file").click();});
$("file").addEventListener("change",()=>sendAttachment($("file").files?.[0]));
const dropZone=document.querySelector(".conversation");
let dragDepth=0;
dropZone.addEventListener("dragenter",event=>{
 if(!event.dataTransfer?.types?.includes("Files"))return;
 event.preventDefault();dragDepth++;
 if(selected)dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragover",event=>{
 if(!event.dataTransfer?.types?.includes("Files"))return;
 event.preventDefault();event.dataTransfer.dropEffect=selected?"copy":"none";
});
dropZone.addEventListener("dragleave",event=>{
 if(!event.dataTransfer?.types?.includes("Files"))return;
 dragDepth=Math.max(0,dragDepth-1);
 if(!dragDepth)dropZone.classList.remove("drag-over");
});
dropZone.addEventListener("drop",event=>{
 if(!event.dataTransfer?.types?.includes("Files"))return;
 event.preventDefault();dragDepth=0;dropZone.classList.remove("drag-over");
 if(!selected){$("state").textContent="Selecione um colaborador antes de anexar.";return;}
 const items=Array.from(event.dataTransfer.items||[]);
 if(items.some(item=>item.webkitGetAsEntry?.()?.isDirectory)){
  $("state").textContent="Para enviar uma pasta, compacte-a em ZIP.";return;
 }
 const files=Array.from(event.dataTransfer.files||[]);
 if(files.length!==1){$("state").textContent="Arraste um arquivo por vez.";return;}
 sendAttachment(files[0]);
});
document.addEventListener("dragover",event=>{if(event.dataTransfer?.types?.includes("Files"))event.preventDefault();});
document.addEventListener("drop",event=>{if(event.dataTransfer?.types?.includes("Files"))event.preventDefault();});

/* Chamada de áudio WebRTC. Sinalização autenticada pelo portal. */
let currentCall=null,peerConnection=null,callStream=null,callCursor=0,callBusy=false,callTimer=null;
const callApi=(path,method="GET",body)=>api("/chamadas"+path,method==="GET"?{}:{method,headers:{"Content-Type":"application/json","X-Portal":"1"},body:JSON.stringify(body||{})});
function callUI(title,status,incoming=false){
 $("callPanel").hidden=false;$("callTitle").textContent=title;$("callStatus").textContent=status;
 $("acceptCall").hidden=!incoming;$("declineCall").hidden=!incoming;
 $("muteCall").hidden=incoming;$("hangupCall").hidden=incoming;
}
function closeCallUI(){
 if(peerConnection){peerConnection.close();peerConnection=null}
 if(callStream){callStream.getTracks().forEach(t=>t.stop());callStream=null}
 $("callAudio").srcObject=null;$("callPanel").hidden=true;$("muteCall").hidden=true;
 currentCall=null;callCursor=0;
}
async function endCall(state="ended"){
 const id=currentCall?.id;closeCallUI();
 if(id)try{await callApi("/"+id+"/estado","POST",{estado:state})}catch(_){}
}
async function preparePeer(){
 if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)throw Error("Chamadas indisponíveis neste dispositivo");
 callStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
 peerConnection=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]});
 callStream.getTracks().forEach(track=>peerConnection.addTrack(track,callStream));
 peerConnection.ontrack=event=>{$("callAudio").srcObject=event.streams[0]};
 peerConnection.onicecandidate=event=>{if(event.candidate&&currentCall)callApi("/"+currentCall.id+"/sinais","POST",{tipo:"candidate",conteudo:event.candidate.toJSON()}).catch(()=>{})};
 peerConnection.onconnectionstatechange=()=>{
  if(!peerConnection)return;
  if(peerConnection.connectionState==="connected")$("callStatus").textContent="Em chamada";
  if(["failed","closed"].includes(peerConnection.connectionState))endCall().catch(()=>{});
 };
}
async function sendCallSignal(tipo,conteudo){return callApi("/"+currentCall.id+"/sinais","POST",{tipo,conteudo})}
async function startOffer(){
 await preparePeer();
 const offer=await peerConnection.createOffer();await peerConnection.setLocalDescription(offer);
 await sendCallSignal("offer",peerConnection.localDescription.toJSON());
 $("callStatus").textContent="Chamando...";
}
async function handleSignals(){
 if(!currentCall)return;
 const id=currentCall.id;
 const data=await callApi("/"+id+"/sinais?after="+callCursor);
 if(currentCall?.id!==id)return;
 for(const s of data.sinais){
  callCursor=Math.max(callCursor,Number(s.id));
  if(s.tipo==="offer"&&currentCall.incoming&&peerConnection){
   await peerConnection.setRemoteDescription(new RTCSessionDescription(s.conteudo));
   const answer=await peerConnection.createAnswer();await peerConnection.setLocalDescription(answer);
   await sendCallSignal("answer",peerConnection.localDescription.toJSON());
  }else if(s.tipo==="answer"&&peerConnection&&!peerConnection.currentRemoteDescription){
   await peerConnection.setRemoteDescription(new RTCSessionDescription(s.conteudo));
  }else if(s.tipo==="candidate"&&peerConnection){
   try{await peerConnection.addIceCandidate(new RTCIceCandidate(s.conteudo))}catch(_){}
  }
 }
}
$("startCall").onclick=async()=>{
 if(!selected||currentCall)return;
 try{
  const c=await callApi("","POST",{destinatario_id:selected});
  currentCall={id:c.id,incoming:false};
  callUI("Ligando para "+(people.find(p=>Number(p.id)===Number(selected))?.nome||"colaborador"),"Chamando...");
  await startOffer();
 }catch(e){if(currentCall)await endCall();$("state").textContent="Chamada: "+e.message}
};
$("acceptCall").onclick=async()=>{
 if(!currentCall)return;
 try{
  await preparePeer();
  await callApi("/"+currentCall.id+"/estado","POST",{estado:"active"});
  callUI($("callTitle").textContent,"Conectando...");
  await handleSignals();
 }catch(e){$("state").textContent=e.message;await endCall()}
};
$("declineCall").onclick=()=>endCall("declined");
$("hangupCall").onclick=()=>endCall();
$("muteCall").onclick=()=>{
 const track=callStream?.getAudioTracks()[0];if(!track)return;
 track.enabled=!track.enabled;$("muteCall").textContent=track.enabled?"Silenciar":"Ativar microfone";
};
async function pollCalls(){
 if(!me||callBusy)return;callBusy=true;
 try{
  if(!currentCall){
   const data=await callApi("/pendentes");
   if(data.chamada){currentCall={id:data.chamada.id,incoming:true};callUI("Chamada de "+data.chamada.origem_nome,"Chamada recebida",true)}
  }else{
   const c=await callApi("/"+currentCall.id);
   if(["ended","declined"].includes(c.estado)){closeCallUI();return}
   if(peerConnection)await handleSignals();
  }
 }catch(e){if(currentCall)$("callStatus").textContent="Conexão instável: "+e.message}
 finally{callBusy=false}
}
setInterval(pollCalls,1800);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)pollCalls()});

$("message").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("composer").requestSubmit();}});
$("mobileBack").addEventListener("click",()=>app.classList.remove("chat-open"));
$("search").addEventListener("input",drawPeople);
(async()=>{
 try{
  const r=await fetch("/colaborador/api/eu",{credentials:"same-origin",cache:"no-store"});
  if(!r.ok){location.href="/colaborador/";return;}me=await r.json();
  const back=document.querySelector(".back");
  if(back&&!document.documentElement.classList.contains("rp-embedded"))back.href=me.perfil==="admin"?"/colaborador/painel/oficial/":"/colaborador/oficial/";
  await heartbeat();await refreshPeople();
  setInterval(async()=>{try{await heartbeat();await refreshPeople();if(selected)await refreshMessages();$("state").textContent="";}catch(err){$("state").textContent="Sem conexão";}},15000);
 }catch(err){$("people").textContent="Não foi possível carregar: "+err.message;}
})();
