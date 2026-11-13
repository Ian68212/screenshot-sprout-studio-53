"use strict";
const $=id=>document.getElementById(id);
let files=[],nextToken=null;
const fmt=n=>{if(!n)return "—";const units=["B","KB","MB","GB"];let i=0,v=Number(n);while(v>=1024&&i<3){v/=1024;i++}return v.toLocaleString("pt-BR",{maximumFractionDigits:1})+" "+units[i]};
async function api(path,options={}){const r=await fetch("/colaborador/api/gestao-arquivos"+path,{credentials:"same-origin",cache:"no-store",...options});if(r.status===401){location.href="/colaborador/";throw Error("Sessão expirada")}const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.erro||"Falha na consulta");return j}
function cell(tr,value){const td=document.createElement("td");td.textContent=value;tr.append(td);return td}
function render(){
 const names=new Map(files.map(f=>[f.id,f.name]));
 const term=$("search").value.trim().toLocaleLowerCase("pt-BR"),type=$("type").value;
 const category=$("category").value;
 const rows=files.filter(f=>(!category||f.category===category)&&(!term||(f.name||"").toLocaleLowerCase("pt-BR").includes(term))&&(!type||(type==="folder")===(f.mimeType==="application/vnd.google-apps.folder")));
 const tbody=$("rows");tbody.replaceChildren();
 for(const f of rows){
  const folder=f.mimeType==="application/vnd.google-apps.folder",tr=document.createElement("tr");
  cell(tr,(folder?"📁 ":"📄 ")+(f.name||"Sem nome"));
  const parent=(f.parents||[]).map(id=>names.get(id)||"Pasta não carregada").join(", ")||"Raiz";
  cell(tr,(f.category||"Sem categoria")+" · "+parent);cell(tr,folder?"Pasta":fmt(f.size));
  cell(tr,f.modifiedTime?new Date(f.modifiedTime).toLocaleDateString("pt-BR"):"—");
  const td=cell(tr,"");
  if(!folder){
   if(f.emUso){const used=document.createElement("span");used.textContent="Em uso · ";used.title="Gerencie a exclusão pelo módulo de origem";td.append(used);}
   const download=document.createElement("button");download.textContent="Baixar";download.onclick=()=>location.href="/colaborador/api/gestao-arquivos/baixar/"+encodeURIComponent(f.id);td.append(download);
   const remove=document.createElement("button");remove.textContent="Enviar à lixeira";remove.className="danger";remove.style.marginLeft="7px";
   remove.onclick=async()=>{
    if(!confirm('Enviar "'+f.name+'" à lixeira do Google Drive? Este arquivo pode deixar de funcionar em outros módulos do portal.'))return;
    remove.disabled=true;
    try{await api("/lixeira/"+encodeURIComponent(f.id),{method:"POST",headers:{"X-Portal":"1"}});files=files.filter(x=>x.id!==f.id);render();$("status").textContent="Arquivo enviado à lixeira."}catch(e){alert(e.message);remove.disabled=false}
   };td.append(remove);
  }
  tbody.append(tr);
 }
 $("count").textContent=String(files.length);
 $("folders").textContent=String(files.filter(f=>f.mimeType==="application/vnd.google-apps.folder").length);
 $("size").textContent=fmt(files.reduce((n,f)=>n+Number(f.size||0),0));
 $("next").hidden=!nextToken;
 if(!rows.length)$("status").textContent=files.length?"Nenhum item corresponde aos filtros.":"Nenhum arquivo acessível encontrado.";
}
async function load(reset=false){
 $("refresh").disabled=true;$("next").disabled=true;$("status").textContent="Consultando Google Drive...";
 try{
  if(reset){files=[];nextToken=null}
  const data=await api("/listar"+(nextToken?"?pageToken="+encodeURIComponent(nextToken):""));
  files.push(...(data.files||[]));nextToken=data.nextPageToken;
  const map=new Map(files.map(f=>[f.id,f]));
  for(const f of files){let node=f,category=f.origem||null,depth=0;
   while(!category&&node&&depth++<12){if(node.mimeType==="application/vnd.google-apps.folder"&&node.name!=="Rodrinox Pro - Portal")category=node.name;node=map.get(node.parents?.[0]);}
   f.category=category||"Outros / sem classificação";
  }
  const current=$("category").value;
  const categories=[...new Set(files.map(f=>f.category))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
  $("category").replaceChildren(new Option("Todas as categorias",""),...categories.map(c=>new Option(c,c)));
  $("category").value=categories.includes(current)?current:"";
  $("status").textContent=files.length+" itens carregados"+(nextToken?" · há mais resultados":"")+".";
  render();
 }catch(e){$("status").textContent="Não foi possível consultar o Google Drive: "+e.message}
 finally{$("refresh").disabled=false;$("next").disabled=false}
}
$("refresh").onclick=()=>load(true);$("next").onclick=()=>load();$("search").oninput=render;$("type").onchange=render;$("category").onchange=render;
(async()=>{try{const data=await api("/categorias");$("uploadCategory").replaceChildren(new Option("Selecione o setor / categoria",""),...data.categories.map(c=>new Option(c,c)))}catch(e){$("status").textContent=e.message}})();
$("uploadForm").onsubmit=async e=>{
 e.preventDefault();
 const file=$("uploadFile").files[0],category=$("uploadCategory").value;
 if(!file||!category)return;
 if(file.size>25*1024*1024){alert("O envio por esta página aceita até 25 MB.");return}
 const form=new FormData();form.append("categoria",category);form.append("arquivo",file);
 const button=$("uploadForm").querySelector("button");button.disabled=true;$("status").textContent="Enviando arquivo...";
 try{await api("/adicionar",{method:"POST",headers:{"X-Portal":"1"},body:form});$("uploadFile").value="";await load(true);$("status").textContent="Arquivo adicionado à categoria "+category}
 catch(err){$("status").textContent=err.message}
 finally{button.disabled=false}
};
load(true);
