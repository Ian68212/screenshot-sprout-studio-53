"use strict";
(()=>{
const labels={documentos:"Documentos",pcp:"PCP",tarefas:"Gestão de Tarefas","gestao-empresarial":"Gestão Empresarial",almoxarifado:"Almoxarifado",qualidade:"Qualidade",rh:"RH",seguranca:"Segurança do Trabalho",comunicados:"Comunicados",treinamentos:"Treinamentos",ferramentas:"Ferramentas",aplicativos:"Aplicativos",contatos:"Contatos",suporte:"Suporte / TI","admin.visao":"Administração","admin.permissoes":"Permissões de Acesso","admin.organograma":"Organograma","admin.pessoas":"Colaboradores","admin.candidaturas":"Recrutamento","admin.site":"Gerenciador do Site"};
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
 const scope=document.getElementById("mp-scope").value,alvo=document.getElementById("mp-target").value,status=document.getElementById("mp-status");
 if(!alvo){status.textContent="Selecione um destino válido.";return}
 const botoes={};document.querySelectorAll("[data-menu-key]").forEach(el=>botoes[el.dataset.menuKey]=el.value==="herdar"?null:el.value==="sim");
 status.textContent="Salvando...";
 try{
  await api("regras",{method:"PUT",headers:{"Content-Type":"application/json","X-Portal":"1"},body:JSON.stringify({escopo,alvo,botoes})});
  const latest=await api("regras");state=latest;paint();status.textContent="Permissões salvas. O colaborador verá o novo menu ao atualizar a página.";
 }catch(e){status.textContent="Não foi possível salvar: "+e.message}
}
window.abrirCentralPermissoes=async function(p,s){
 people=Array.isArray(p)?p:[];structure=s||structure;
 const root=document.getElementById("adminContent");
 root.innerHTML='<div class="mp-wrap"><div class="mp-intro"><h3>Central de Permissões</h3><p>Configure a visibilidade do menu por perfil, setor, cargo ou colaborador. Regras individuais têm prioridade sobre as demais. Os itens administrativos são exclusivos de administradores.</p></div><div class="mp-controls"><label>Aplicar a<select id="mp-scope"><option value="usuario">Colaborador</option><option value="setor">Setor</option><option value="cargo">Cargo / função</option><option value="perfil">Perfil</option></select></label><label>Selecionar<select id="mp-target"></select></label></div><div class="mp-list" id="mp-list"><p>Carregando permissões...</p></div><div class="mp-footer"><span id="mp-status">Início permanece visível para todos.</span><button id="mp-save" type="button">Salvar permissões</button></div><p class="mp-note">Este controle personaliza o menu. O acesso às páginas e aos dados confidenciais exige autorização independente no servidor. Perfis administrativos não podem ser bloqueados aqui.</p></div>';
 document.getElementById("mp-scope").addEventListener("change",targets);
 document.getElementById("mp-target").addEventListener("change",paint);
 document.getElementById("mp-save").addEventListener("click",save);
 try{state=await api("regras");targets()}catch(e){document.getElementById("mp-list").textContent="Não foi possível carregar as regras: "+e.message;document.getElementById("mp-save").disabled=true}
};
})();
