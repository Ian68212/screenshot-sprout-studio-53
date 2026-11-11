"use strict";
(function(){
const base="/colaborador/api/whatsapp-meta";
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let state={status:null,conversas:[],selected:null,mensagens:[],error:"",users:[],sectors:[]};
const request=async(path,options={})=>{const r=await fetch(base+path,{credentials:"same-origin",cache:"no-store",...options});const d=await r.json();if(!r.ok)throw Error(d.erro||"Falha na consulta");return d};
async function load(){
 try{const [status,conversas]=await Promise.all([request("/status"),request("/conversas")]);state.status=status;state.conversas=conversas.conversas||[];state.error="";
 const r=await fetch("/colaborador/api/atendimento/rodrinox/equipe",{credentials:"same-origin"});if(r.ok){const d=await r.json();state.users=d.usuarios||[];state.sectors=d.setores||[]}
 }catch(e){state.error=e.message}draw();
}
async function select(telefone){state.selected=state.conversas.find(c=>c.telefone===telefone);state.mensagens=[];draw();try{state.mensagens=(await request("/conversas/"+encodeURIComponent(telefone)+"/mensagens")).mensagens||[];state.error=""}catch(e){state.error=e.message}draw()}
async function assign(){if(!state.selected)return;const telefone=state.selected.telefone;const user=document.getElementById("wm-user"),sector=document.getElementById("wm-sector");try{await request("/conversas/"+telefone+"/atribuir",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({usuario_id:user.value?Number(user.value):null,setor_id:sector.value?Number(sector.value):null})});await load();await select(telefone)}catch(e){alert(e.message)}}
async function send(){if(!state.selected)return;const field=document.getElementById("wm-text"),texto=field?.value.trim();if(!texto)return;const button=document.getElementById("wm-send");button.disabled=true;try{await request("/conversas/"+state.selected.telefone+"/enviar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({texto})});field.value="";await select(state.selected.telefone)}catch(e){alert(e.message);button.disabled=false}}
function draw(){
 const root=document.getElementById("items");if(!root)return;root.classList.add("ca-root");
 const connected=state.status?.configurada;
 root.innerHTML='<div class="ca-head"><div><h3>WhatsApp Rodrinox Pro</h3><div class="ca-sub">Canal próprio · API oficial Meta · histórico na Rodrinox</div></div><span class="ca-state">'+(connected?"Meta configurada":"Aguardando conexão Meta")+'</span></div>'+
 '<div class="ca-banner"><b>Ambiente de preparação:</b> '+(connected?"Credenciais presentes. Mensagens reais podem ser enviadas após selecionar uma conversa autorizada.":"A conexão ainda não foi ativada. Configure a aplicação Meta, o token, o número e o webhook na Hostinger. Nenhum WhatsApp atual foi desconectado.")+'</div>'+
 (state.error?'<div class="ca-banner">'+escape(state.error)+'</div>':"")+
 '<div class="ca-layout"><aside class="ca-left"><div class="ca-tabs"><button type="button" id="wm-refresh">Atualizar</button><button type="button" id="wm-back">DigiSac (legado)</button></div><div class="ca-list">'+(state.conversas.length?state.conversas.map(c=>'<button class="ca-record" data-wm-phone="'+escape(c.telefone)+'"><b>'+escape(c.nome||c.telefone)+'</b><small>'+escape(c.telefone)+'</small></button>').join(""):'<div class="ca-empty">Nenhuma conversa recebida pela Meta ainda.<p>Após configurar o webhook, envie uma mensagem ao número de teste.</p></div>')+'</div></aside>'+
 '<section class="ca-conversation"><header><strong>'+escape(state.selected?.nome||state.selected?.telefone||"Selecione uma conversa")+'</strong><span class="ca-meta">Histórico armazenado no banco Rodrinox</span>'+
 (state.selected&&state.users.length?'<div class="ca-assign"><label>Setor <select id="wm-sector"><option value="">Sem setor</option>'+state.sectors.map(s=>'<option value="'+s.id+'" '+(Number(state.selected.setor_id)===Number(s.id)?"selected":"")+'>'+escape(s.nome)+'</option>').join("")+'</select></label><label>Responsável <select id="wm-user"><option value="">Não atribuído</option>'+state.users.map(u=>'<option value="'+u.id+'" '+(Number(state.selected.responsavel_id)===Number(u.id)?"selected":"")+'>'+escape(u.nome)+'</option>').join("")+'</select></label><button id="wm-assign">Salvar</button></div>':"")+'</header>'+
 '<div class="ca-messages">'+(state.mensagens.length?state.mensagens.map(m=>'<div class="ca-msg" style="'+(m.direcao==="saida"?"margin-left:14%;background:#175744;":"margin-right:14%;")+'"><small>'+escape(m.direcao==="saida"?"Rodrinox":"Cliente")+' · '+escape(m.estado||"")+'</small><p>'+escape(m.texto||"["+m.tipo+"]")+'</p></div>').join(""):'<div class="ca-empty">As mensagens aparecerão aqui.</div>')+'</div>'+
 '<div class="ca-compose"><textarea id="wm-text" '+(!connected||!state.selected?"disabled":"")+' placeholder="Responder pelo WhatsApp da Rodrinox..."></textarea><button id="wm-send" '+(!connected||!state.selected?"disabled":"")+'>Enviar</button></div></section></div>';
 root.querySelectorAll("[data-wm-phone]").forEach(b=>b.onclick=()=>select(b.dataset.wmPhone));
 document.getElementById("wm-refresh").onclick=load;
 document.getElementById("wm-back").onclick=()=>window.renderCentralAtendimento?.();
 const sendBtn=document.getElementById("wm-send");if(sendBtn)sendBtn.onclick=send;
 const assignBtn=document.getElementById("wm-assign");if(assignBtn)assignBtn.onclick=assign;
}
window.renderMetaCentral=()=>{state={status:null,conversas:[],selected:null,mensagens:[],error:"",users:[],sectors:[]};draw();load()};
})();
