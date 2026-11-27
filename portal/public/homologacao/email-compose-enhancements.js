// Melhorias progressivas do compositor: não altera autenticação, IMAP ou SMTP.
(()=>{const $=id=>document.getElementById(id);const editor=$("messageText"),form=$("composeForm");if(!editor||!form)return;
function saveDraft(){const addr=$("fromAddress")?.value;if(!addr)return;try{sessionStorage.setItem("rodrinox:draft:"+addr,JSON.stringify({to:$("to").value,cc:$("cc").value,bcc:$("bcc").value,subject:$("subject").value,html:editor.innerHTML}))}catch{}}
function clearDraft(){const addr=$("fromAddress")?.value;if(addr)sessionStorage.removeItem("rodrinox:draft:"+addr)}
function restoreDraft(){const addr=$("fromAddress")?.value;if(!addr)return;let d;try{d=JSON.parse(sessionStorage.getItem("rodrinox:draft:"+addr)||"null")}catch{}if(!d)return; if(!confirm("Existe um rascunho desta sessão. Deseja restaurá-lo?"))return;$("to").value=d.to||"";$("cc").value=d.cc||"";$("bcc").value=d.bcc||"";$("subject").value=d.subject||"";editor.innerHTML=d.html||""}
const composeModal=$("composeModal"),preview=$("signaturePreview"),previewImage=preview.querySelector("img"),previewModel=preview.querySelector(".signature-model");
let signatureRequest=0;

async function refreshSignature(showMissing=false){
  const request=++signatureRequest,boxId=current?.id;
  preview.hidden=true;
  previewImage.removeAttribute("src");
  previewImage.hidden=true;
  previewModel.replaceChildren();
  if(!boxId)return;
  try{
    const data=await call("/"+boxId+"/assinatura");
    if(request!==signatureRequest||current?.id!==boxId||!composeModal.classList.contains("show"))return;
    if(data.configurada&&data.imagemUrl){
      previewImage.src=data.imagemUrl;
      previewImage.hidden=false;
      preview.hidden=false;
    }else if(data.html){
      previewModel.innerHTML=data.html;
      preview.hidden=false;
    }else if(showMissing){
      toast("Nenhuma assinatura salva para esta caixa.");
    }
    $("signatureSettings").hidden=data.gerenciada;
  }catch(error){
    if(request===signatureRequest&&composeModal.classList.contains("show"))toast(error.message);
  }
}

function showSignatureEditor(){
  const boxId=current?.id;
  if(!boxId)return;
  const picker=document.createElement("input");
  picker.type="file";
  picker.accept="image/png,image/jpeg";
  picker.onchange=async()=>{
    const file=picker.files?.[0];
    if(!file)return;
    if(file.size>2*1024*1024){toast("Imagem acima de 2 MB.");return;}
    const data=new FormData();
    data.append("imagem",file);
    try{
      await call("/"+boxId+"/assinatura",{method:"POST",body:data});
      if(current?.id===boxId)await refreshSignature();
      toast("Assinatura salva para esta caixa.");
    }catch(error){toast(error.message);}
  };
  picker.click();
}
composeModal.addEventListener("compose-open",()=>void refreshSignature());
$("signatureSettings").addEventListener("click",showSignatureEditor);
$("insertSignature").addEventListener("click",()=>void refreshSignature(true));
form.querySelector(".editorTools").addEventListener("mousedown",event=>{
  if(event.target.closest("[data-cmd],#insertLink")&&document.activeElement===editor)event.preventDefault();
});
$("insertLink")?.addEventListener("click",()=>{const url=prompt("Cole o endereço HTTPS do link:");if(!url)return;try{const u=new URL(url);if(u.protocol!=="https:")throw Error();editor.focus();document.execCommand("createLink",false,u.href)}catch{alert("Use um link HTTPS válido.")}});
const compose=$("compose");if(compose){const original=compose.onclick;compose.onclick=function(e){original?.call(this,e);if(!$("composeModal").classList.contains("show"))return;restoreDraft();editor.querySelectorAll("[data-signature]").forEach(node=>node.remove())}}
form.addEventListener("input",saveDraft);
form.addEventListener("submit",()=>{setTimeout(()=>{if(!$("composeModal").classList.contains("show"))clearDraft()},1500)});
})();
