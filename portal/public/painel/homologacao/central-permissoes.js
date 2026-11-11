"use strict";
(()=>{
const labels={documentos:"Documentos",pcp:"PCP",tarefas:"Gestão de Tarefas","gestao-empresarial":"Gestão Empresarial",atendimento:"Central de Atendimento",almoxarifado:"Almoxarifado",qualidade:"Qualidade",rh:"RH",seguranca:"Segurança do Trabalho",comunicados:"Comunicados",treinamentos:"Treinamentos",ferramentas:"Ferramentas",aplicativos:"Aplicativos",contatos:"Contatos",suporte:"Suporte / TI","link.email":"Link rápido: E-mail Corporativo","link.drive":"Link rápido: Google Drive","link.cameras":"Link rápido: Câmeras (iSIC)","link.bling":"Link rápido: Bling (ERP)","admin.visao":"Administração","admin.permissoes":"Permissões de Acesso","admin.organograma":"Organograma","admin.pessoas":"Colaboradores","admin.candidaturas":"Recrutamento","admin.site":"Gerenciador do Site"};
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let state={regras:[],botoes:Object.keys(labels)},people=[],structure={setores:[],cargos:[]};
const api=async(path,options={})=>{const r=await fetch("/colaborador/api/menu/"+path,{credentials:"same-origin",cache:"no-store",...options});if(!r.ok)throw Error((await r.json().catch(()=>({}))).erro||"Falha "+r.status);return r.json()};
function options(list,id,name){return list.map(x=>'<option value="'+esc(x[id])+'">'+esc(x[name])+'</option>').join("")}
function targets(){
 const scope=document.getElementById("mp-scope").value,el=document.getElementById("mp-target");
 const sets={perfil:[{id:"colaborador",nome:"Colaborador"},{id:"gestor",nome:"Gestor"},{id:"admin",nome:"Administrador"}],setor:structure.setores,cargo:structure.cargos,usuario:people};
 el.innerHTML=options(sets[scope]||[],"id","nome");
 paint();
}
function paint(){
 const scope=document.getElementById("mp-scope")?.value,target=document.getElementById("mp-target")?.value,area=document.getElementById("mp-list");if(!area)return;
 const inherited=scope==="perfil"?"Padrão do perfil":"Herdar regra do nível anterior";
 const selectedUser=people.find(p=>String(p.id)===target);
 const adminTarget=(scope==="perfil"&&target==="admin")||(scope==="usuario"&&selectedUser?.perfil==="admin");
 area.innerHTML='<div class="mp-always">⌂ Início <span>Sempre visível</span></div>'+state.botoes.map(key=>{
 const isAdmin=key.startsWith("admin.");
 if(isAdmin&&!adminTarget)return '<div class="mp-item mp-locked"><span>'+esc(labels[key]||key)+'</span><span class="mp-lock">🔒 Exclusivo de administradores</span></div>';
 if(key==="admin.permissoes")return '<div class="mp-item mp-locked"><span>Permissões de Acesso</span><span class="mp-lock">Sempre visível ao administrador</span></div>';
 const found=state.regras.find(r=>r.escopo===scope&&r.alvo===target&&r.botao===key);
 const value=found?(Number(found.permitido)?"sim":"nao"):"herdar";
 return '<label class="mp-item"><span>'+esc(labels[key]||key)+'</span><select data-menu-key="'+esc(key)+'"><option value="herdar" '+(value==="herdar"?"selected":"")+'> '+inherited+' </option><option value="sim" '+(value==="sim"?"selected":"")+'>Mostrar</option><option value="nao" '+(value==="nao"?"selected":"")+'>Ocultar</option></select></label>';
 }).join("");
}
async function save(){
 const escopo=document.getElementById("mp-scope").value,alvo=document.getElementById("mp-target").value,status=document.getElementById("mp-status");
 if(!alvo){status.textContent="Selecione um destino válido.";return}
 const botoes={};document.querySelectorAll("[data-menu-key]").forEach(el=>botoes[el.dataset.menuKey]=el.value==="herdar"?null:el.value==="sim");
 status.textContent="Salvando...";
 try{
  await api("regras",{method:"PUT",headers:{"Content-Type":"application/json","X-Portal":"1"},body:JSON.stringify({escopo,alvo,botoes})});
  const latest=await api("regras");state=latest;paint();status.textContent="Permissões salvas. O colaborador verá o novo menu ao atualizar a página.";
 }catch(e){status.textContent="Não foi possível salvar: "+e.message}
}

const taskLabels={"projects.view":"Visualizar projetos","projects.create":"Criar projetos","projects.edit":"Editar projetos","tasks.create":"Criar tarefas","tasks.assign":"Delegar tarefas","tasks.due":"Alterar prazos","tasks.priority":"Alterar prioridade","tasks.checklist":"Editar checklist","tasks.comment":"Adicionar comentários","tasks.recurrence":"Configurar recorrência","tasks.delete":"Excluir tarefas","tasks.history":"Visualizar histórico","tasks.status":"Alterar status","tasks.all":"Visualizar todas as tarefas"};
let customProfiles=[],customAssignments=[];
async function profilesApi(path="",options={}){
 const r=await fetch("/colaborador/api/access-profiles"+path,{credentials:"same-origin",cache:"no-store",...options,headers:{"X-Portal":"1",...(options.headers||{})}});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(data.erro||"Falha "+r.status);
 return data;
}
async function openCustomProfiles(){
 const root=document.getElementById("adminContent");
 root.innerHTML='<div class="mp-wrap"><div class="mp-intro"><h3>Perfis de Acesso Personalizados</h3><p>Crie perfis, defina permissões e vincule colaboradores. O administrador principal permanece protegido.</p></div><div class="mp-controls"><label>Perfil<select id="ap-select"></select></label><button type="button" id="ap-new">+ Novo perfil</button><button type="button" id="ap-back">Voltar aos menus</button></div><div class="mp-controls"><label>Nome<input id="ap-name" maxlength="120" placeholder="Administrador Sênior"></label><label>Descrição<input id="ap-description" maxlength="500"></label><label>Alcance<select id="ap-scope"><option value="own">Minhas tarefas</option><option value="sector">Meu setor</option><option value="all">Todos os projetos</option></select></label><label>Ativo<input id="ap-active" type="checkbox" checked></label></div><div class="mp-list" id="ap-actions"></div><div class="mp-footer"><span id="ap-status">Selecione ou crie um perfil.</span><button id="ap-save" type="button">Salvar perfil</button></div><div class="mp-intro"><h3>Atribuir perfil ao colaborador</h3></div><div class="mp-controls"><label>Colaborador<select id="ap-user"></select></label><label>Perfil<select id="ap-assign-profile"></select></label><button type="button" id="ap-assign">Aplicar ao colaborador</button></div><p class="mp-note">Esta etapa cadastra os perfis e vínculos. As permissões operacionais serão aplicadas às APIs após validação de segurança; a seleção não altera automaticamente o perfil de autenticação existente.</p></div>';
 const $=id=>document.getElementById(id);
 $("ap-back").onclick=()=>window.abrirCentralPermissoes(people,structure);
 $("ap-new").onclick=()=>{$("ap-select").value="";fillProfile()};
 $("ap-select").onchange=fillProfile;
 $("ap-save").onclick=saveProfile;
 $("ap-assign").onclick=assignProfile;
 try{
  const data=await profilesApi();
  customProfiles=data.profiles;customAssignments=data.assignments;
  $("ap-select").innerHTML='<option value="">Novo perfil</option>'+options(customProfiles,"id","name");
  $("ap-user").innerHTML=options(people.filter(p=>p.perfil!=="admin"),"id","nome");
  $("ap-assign-profile").innerHTML='<option value="">Sem perfil personalizado</option>'+options(customProfiles.filter(p=>p.active),"id","name");
  $("ap-user").onchange=()=>{$("ap-assign-profile").value=String(customAssignments.find(a=>String(a.user_id)===$("ap-user").value)?.profile_id||"")};
  $("ap-actions").innerHTML=data.actions.map(k=>'<label class="mp-item"><span>'+esc(taskLabels[k]||k)+'</span><input type="checkbox" data-ap-action="'+esc(k)+'"></label>').join("");
  fillProfile();$("ap-user").onchange();
 }catch(e){$("ap-status").textContent=e.message}
}
function fillProfile(){
 const $=id=>document.getElementById(id),p=customProfiles.find(p=>String(p.id)===$("ap-select").value);
 $("ap-name").value=p?.name||"";$("ap-description").value=p?.description||"";$("ap-scope").value=p?.scope||"own";$("ap-active").checked=p?!!p.active:true;
 document.querySelectorAll("[data-ap-action]").forEach(el=>el.checked=!!p?.grants?.[el.dataset.apAction]);
}
async function saveProfile(){
 const $=id=>document.getElementById(id),id=$("ap-select").value,grants={};
 document.querySelectorAll("[data-ap-action]").forEach(el=>grants[el.dataset.apAction]=el.checked);
 const body={name:$("ap-name").value,description:$("ap-description").value,scope:$("ap-scope").value,active:$("ap-active").checked,grants};
 try{
  $("ap-status").textContent="Salvando...";
  await profilesApi(id?"/"+id:"",{method:id?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  await openCustomProfiles();
  document.getElementById("ap-status").textContent="Perfil salvo com sucesso.";
 }catch(e){$("ap-status").textContent=e.message}
}
async function assignProfile(){
 const $=id=>document.getElementById(id),userId=$("ap-user").value,profileId=$("ap-assign-profile").value;
 if(!userId)return;
 try{
  await profilesApi("/users/"+userId,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile_id:profileId||null})});
  $("ap-status").textContent="Vínculo salvo.";
 }catch(e){$("ap-status").textContent=e.message}
}

window.abrirCentralPermissoes=async function(p,s){
 people=Array.isArray(p)?p:[];structure=s||structure;
 const root=document.getElementById("adminContent");
 root.innerHTML='<div class="mp-wrap"><div class="mp-intro"><h3>Central de Permissões</h3><button type="button" id="mp-profiles">Perfis personalizados · Gestão de Tarefas</button><p>Configure a visibilidade do menu por perfil, setor, cargo ou colaborador. Regras individuais têm prioridade sobre as demais. Os itens administrativos são exclusivos de administradores.</p></div><div class="mp-controls"><label>Aplicar a<select id="mp-scope"><option value="usuario">Colaborador</option><option value="setor">Setor</option><option value="cargo">Cargo / função</option><option value="perfil">Perfil</option></select></label><label>Selecionar<select id="mp-target"></select></label></div><div class="mp-list" id="mp-list"><p>Carregando permissões...</p></div><div class="mp-footer"><span id="mp-status">Início permanece visível para todos.</span><button id="mp-save" type="button">Salvar permissões</button></div><p class="mp-note">Este controle personaliza o menu. O acesso às páginas e aos dados confidenciais exige autorização independente no servidor. Perfis administrativos não podem ser bloqueados aqui.</p></div>';
 document.getElementById("mp-profiles").addEventListener("click",openCustomProfiles);
 document.getElementById("mp-scope").addEventListener("change",targets);
 document.getElementById("mp-target").addEventListener("change",paint);
 document.getElementById("mp-save").addEventListener("click",save);
 try{state=await api("regras");targets()}catch(e){document.getElementById("mp-list").textContent="Não foi possível carregar as regras: "+e.message;document.getElementById("mp-save").disabled=true}
};
})();
