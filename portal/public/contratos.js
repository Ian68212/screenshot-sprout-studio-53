"use strict";
const $=id=>document.getElementById(id),base="/colaborador/api/contratos";
let current=null,model=null;
async function api(path="",options={}){const r=await fetch(base+path,{credentials:"same-origin",...options});if(!r.ok)throw Error("Não foi possível concluir a operação (HTTP "+r.status+").");return r.json();}
function run(fn){return async e=>{e?.preventDefault();try{$("status").textContent="";await fn(e);}catch(err){$("status").textContent=err.message;}};}
function node(tag,text,parent){const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;}
function post(path,data){return api(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});}
async function categories(){const el=$("categories");el.replaceChildren();for(const c of await api("/categorias")){const o=node("option",c.nome,el);o.value=c.id;}}
async function list(){const el=$("results");el.replaceChildren();for(const c of await api("?busca="+encodeURIComponent($("search").value))){const a=node("article","",el);node("strong",c.titulo,a);node("p",[c.categoria,c.contraparte,c.numero,c.versao?"Versão "+c.versao:"Sem arquivo"].filter(Boolean).join(" · "),a);const b=node("button","Abrir contrato",a);b.onclick=run(()=>detail(c));}}
async function detail(c){current=c;$("detail").hidden=false;$("detailTitle").textContent=c.titulo;const el=$("versions");el.replaceChildren();for(const v of await api("/"+c.id+"/versoes")){const a=node("article","",el);const link=node("a","Versão "+v.versao+" — "+v.arquivo_nome,a);link.href=base+"/"+c.id+"/versoes/"+v.id;node("p",[v.autor,v.criado_em,v.motivo].filter(Boolean).join(" · "),a);}}
function form(id,fn){$(id).onsubmit=run(async e=>{const f=e.currentTarget;await fn(new FormData(f));f.reset();$("status").textContent="Salvo com sucesso.";});}
form("category",async d=>{await post("/categorias",Object.fromEntries(d));await categories();});
form("newContract",async d=>{await post("",Object.fromEntries(d));await list();});
form("upload",async d=>{if(!current)throw Error("Selecione um contrato.");await api("/"+current.id+"/versoes",{method:"POST",body:d});await detail(current);await list();});
$("find").onclick=run(list);
$("showContracts").onclick=()=>{$("contracts").hidden=false;$("models").hidden=true;};
$("showModels").onclick=run(async()=>{$("contracts").hidden=true;$("models").hidden=false;await models();});
async function models(){const el=$("modelList");el.replaceChildren();for(const m of await api("/modelos")){const b=node("button",m.titulo,el);b.onclick=()=>generate(m);}}
form("newModel",async d=>{await post("/modelos",Object.fromEntries(d));await models();});
function generate(m){model=m;$("generator").hidden=false;const el=$("fields");el.replaceChildren();const keys=[...new Set(Array.from(m.corpo.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g),x=>x[1]))];const inputs=new Map();function render(){$("preview").value=m.corpo.replace(/\{\{\s*([\w.-]+)\s*\}\}/g,(all,k)=>inputs.get(k)?.value||all);}for(const k of keys){const label=node("label",k,el);const i=node("input","",label);inputs.set(k,i);i.oninput=render;}render();}
$("download").onclick=()=>{if(!model)return;const url=URL.createObjectURL(new Blob([$("preview").value],{type:"text/plain;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="contrato.txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
run(async()=>{await categories();await list();})();
