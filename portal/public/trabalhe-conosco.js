const form=document.getElementById("candidatura"),retorno=document.getElementById("retorno"),botao=document.getElementById("enviar");
form.addEventListener("submit",async e=>{
 e.preventDefault();retorno.replaceChildren();botao.disabled=true;botao.textContent="Enviando...";
 try{
  const response=await fetch("api/candidaturas",{method:"POST",headers:{"X-Portal":"1"},body:new FormData(form),credentials:"same-origin"});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.erro||"Não foi possível enviar sua candidatura.");
  const p=document.createElement("p");p.className="success";p.textContent=data.mensagem||"Candidatura enviada.";retorno.append(p);form.reset();
 }catch(err){const p=document.createElement("p");p.className="error";p.textContent=err.message;retorno.append(p);}
 finally{botao.disabled=false;botao.textContent="Enviar candidatura";}
});