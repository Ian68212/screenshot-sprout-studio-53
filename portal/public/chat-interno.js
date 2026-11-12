"use strict";
const $=id=>document.getElementById(id);
const app=document.querySelector(".app");
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
  b.type="button";b.append(el("span","avatar",initials(p.nome)));
  const body=el("span","person-body"),title=el("span","person-name");
  title.append(el("span","",p.nome));
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
 drawPeople();
}
async function openChat(id){
 selected=id;lastSignature="";app.classList.add("chat-open");drawPeople();
 const p=people.find(x=>x.id===id);$("peer").textContent=p?.nome||"Colaborador";
 $("message").disabled=false;$("send").disabled=false;$("message").focus();
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
  const bubble=el("div","bubble"+(mine?" mine":""),m.texto);
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
$("message").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("composer").requestSubmit();}});
$("mobileBack").addEventListener("click",()=>app.classList.remove("chat-open"));
$("search").addEventListener("input",drawPeople);
(async()=>{
 try{
  const r=await fetch("/colaborador/api/eu",{credentials:"same-origin",cache:"no-store"});
  if(!r.ok){location.href="/colaborador/";return;}me=await r.json();
  const back=document.querySelector(".back");
  if(back)back.href=me.perfil==="admin"?"/colaborador/painel/oficial/":"/colaborador/oficial/";
  await refreshPeople();
  setInterval(async()=>{try{await refreshPeople();if(selected)await refreshMessages();$("state").textContent="";}catch(err){$("state").textContent="Sem conexão";}},5000);
 }catch(err){$("people").textContent="Não foi possível carregar: "+err.message;}
})();
