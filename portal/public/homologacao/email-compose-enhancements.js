// Melhorias progressivas do compositor: não altera autenticação, IMAP ou SMTP.
(()=>{const $=id=>document.getElementById(id);const editor=$("messageText"),form=$("composeForm");if(!editor||!form)return;
const key=()=> "rodrinox:signature:"+String($("fromAddress")?.value||"").toLowerCase();
function signature(){return localStorage.getItem(key())||""}
function addSignature(){const html=signature();if(!html)return;const marker=document.createElement("div");marker.className="signature";marker.dataset.signature="true";marker.innerHTML=html;editor.append(marker)}
function saveDraft(){const addr=$("fromAddress")?.value;if(!addr)return;try{sessionStorage.setItem("rodrinox:draft:"+addr,JSON.stringify({to:$("to").value,cc:$("cc").value,bcc:$("bcc").value,subject:$("subject").value,html:editor.innerHTML}))}catch{}}
function clearDraft(){const addr=$("fromAddress")?.value;if(addr)sessionStorage.removeItem("rodrinox:draft:"+addr)}
function restoreDraft(){const addr=$("fromAddress")?.value;if(!addr)return;let d;try{d=JSON.parse(sessionStorage.getItem("rodrinox:draft:"+addr)||"null")}catch{}if(!d)return; if(!confirm("Existe um rascunho desta sessão. Deseja restaurá-lo?"))return;$("to").value=d.to||"";$("cc").value=d.cc||"";$("bcc").value=d.bcc||"";$("subject").value=d.subject||"";editor.innerHTML=d.html||""}
function showSignatureEditor(){const value=signature().replace(/<[^>]*>/g,"").trim();const next=prompt("Assinatura automática desta conta (nome, cargo, telefone e site). Será inserida em novos e-mails:",value);if(next===null)return;const safe=next.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])).replace(/\n/g,"<br>");localStorage.setItem(key(),safe);alert("Assinatura salva neste navegador para esta conta. Para sincronizar entre dispositivos será necessário configurar armazenamento no servidor.")}
$("signatureSettings")?.addEventListener("click",showSignatureEditor);
$("insertSignature")?.addEventListener("click",()=>{editor.focus();addSignature()});
$("insertLink")?.addEventListener("click",()=>{const url=prompt("Cole o endereço HTTPS do link:");if(!url)return;try{const u=new URL(url);if(u.protocol!=="https:")throw Error();editor.focus();document.execCommand("createLink",false,u.href)}catch{alert("Use um link HTTPS válido.")}});
const compose=$("compose");if(compose){const original=compose.onclick;compose.onclick=function(e){original?.call(this,e);if(!$("composeModal").classList.contains("show"))return;addSignature();restoreDraft()}}
form.addEventListener("input",saveDraft);
form.addEventListener("submit",()=>{setTimeout(()=>{if(!$("composeModal").classList.contains("show"))clearDraft()},1500)});
})();
