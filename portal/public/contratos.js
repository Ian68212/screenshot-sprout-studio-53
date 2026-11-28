"use strict";
const $=id=>document.getElementById(id),base="/colaborador/api/contratos";
let current=null,model=null,selectedCategory=null;
async function api(path="",options={}){const r=await fetch(base+path,{credentials:"same-origin",...options});if(!r.ok){const data=await r.json().catch(()=>({}));throw Error(data.erro||"Não foi possível concluir a operação (HTTP "+r.status+").");}return r.json();}
function run(fn){return async e=>{e?.preventDefault();try{$("status").textContent="";await fn(e);}catch(err){$("status").textContent=err.message;}};}
function node(tag,text,parent){const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;}
function post(path,data){return api(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});}
async function categories(){const el=$("categories");el.replaceChildren();const cats=await api("/categorias");const side=$("categoryList");side.replaceChildren();const all=node("button","Todas as categorias",side);all.onclick=run(()=>{selectedCategory=null;return list();});for(const c of cats){const b=node("button","▱ "+c.nome,side);b.onclick=run(()=>{selectedCategory=c.id;return list();});}for(const c of cats){const o=node("option",c.nome,el);o.value=c.id;}}
function contractStatus(c){const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Sao_Paulo"}).format(new Date()),start=String(c.inicio||"").slice(0,10),end=String(c.vencimento||"").slice(0,10);if(!start)return c.versao?"Validade não especificada":"Sem vigência";if(start>today)return "A iniciar";if(!end)return "Prazo indeterminado";if(end<today)return "Vencido";return (Date.parse(end)-Date.parse(today))/86400000<=30?"Próximo do vencimento":"Vigente";}
async function list(){const el=$("results");el.replaceChildren();const rows=await api();$("totalMetric").textContent=rows.length;$("activeMetric").textContent=rows.filter(c=>["Vigente","Prazo indeterminado","Próximo do vencimento"].includes(contractStatus(c))).length;$("soonMetric").textContent=rows.filter(c=>contractStatus(c)==="Próximo do vencimento").length;$("expiredMetric").textContent=rows.filter(c=>contractStatus(c)==="Vencido").length;const term=$("search").value.trim().toLocaleLowerCase("pt-BR");for(const c of rows.filter(c=>(!selectedCategory||String(c.categoria_id)===String(selectedCategory))&&[c.titulo,c.contraparte,c.numero,c.documento,c.categoria].some(v=>String(v||"").toLocaleLowerCase("pt-BR").includes(term)))){const a=node("article","",el);node("strong",c.titulo,a);node("p",[c.categoria,c.contraparte,c.numero,c.versao?"Versão "+c.versao:"Sem arquivo",c.inicio?"Início: "+String(c.inicio).slice(0,10):"",c.vencimento?"Fim: "+String(c.vencimento).slice(0,10):""].filter(Boolean).join(" · "),a);const status=node("span",contractStatus(c),a);status.style.color=contractStatus(c)==="Vencido"?"#ff8585":contractStatus(c)==="Próximo do vencimento"?"#ffc16b":"#9de5c0";const b=node("button","Abrir contrato",a);b.onclick=run(()=>detail(c));}}
async function detail(c){current=c;$("detail").hidden=false;$("detailTitle").textContent=c.titulo;const el=$("versions");el.replaceChildren();for(const v of await api("/"+c.id+"/versoes")){const a=node("article","",el);const link=node("a","Versão "+v.versao+" — "+v.arquivo_nome,a);link.href=base+"/"+c.id+"/versoes/"+v.id;node("p",[v.autor,v.criado_em,v.inicio?"Início: "+String(v.inicio).slice(0,10):"",v.vencimento?"Fim: "+String(v.vencimento).slice(0,10):"",v.motivo].filter(Boolean).join(" · "),a);}}
function form(id,fn){const f=$(id),msg=node("p","",f);msg.setAttribute("role","status");msg.style.color="#ffc27d";f.onsubmit=async e=>{e.preventDefault();const b=f.querySelector("button");if(b.disabled)return;const original=b.textContent;b.disabled=true;b.textContent="Salvando…";msg.textContent="Enviando dados, aguarde.";try{await fn(new FormData(f));f.reset();msg.textContent="";$("status").textContent="Salvo com sucesso.";}catch(err){msg.textContent=err.message;$("status").textContent=err.message;}finally{b.disabled=false;b.textContent=original;}};}
form("category",async d=>{await post("/categorias",Object.fromEntries(d));await categories();});
form("newContract",async d=>{await api("/anexar",{method:"POST",body:d});$("contractDialog").close();try{await list();}catch(e){console.warn("Contrato salvo; falha ao atualizar lista",e.message);}});
form("upload",async d=>{if(!current)throw Error("Selecione um contrato.");await api("/"+current.id+"/versoes",{method:"POST",body:d});await detail(current);await list();});
$("find").onclick=run(list);
$("showContracts").onclick=()=>{$("contracts").hidden=false;$("models").hidden=true;};
$("showModels").onclick=run(async()=>{$("contracts").hidden=true;$("models").hidden=false;await models();});
async function models(){const el=$("modelList");el.replaceChildren();for(const m of await api("/modelos")){const b=node("button",m.titulo,el);b.onclick=()=>generate(m);}}
form("newModel",async d=>{await post("/modelos",Object.fromEntries(d));await models();});
function generate(m){model=m;$("generator").hidden=false;const el=$("fields");el.replaceChildren();const keys=[...new Set(Array.from(m.corpo.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g),x=>x[1]))];const inputs=new Map();function render(){$("preview").value=m.corpo.replace(/\{\{\s*([\w.-]+)\s*\}\}/g,(all,k)=>inputs.get(k)?.value||all);}for(const k of keys){const label=node("label",k,el);const i=node("input","",label);inputs.set(k,i);i.oninput=render;}render();}
$("download").onclick=()=>{if(!model)return;const url=URL.createObjectURL(new Blob([$("preview").value],{type:"text/plain;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="contrato.txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
run(async()=>{await categories();await list();})();

async function permissionPanel(){
 const me=await fetch("/colaborador/api/eu",{credentials:"same-origin"});if(!me.ok)return;
 const user=await me.json();if(user.perfil!=="admin")return;
 const section=node("section","",document.querySelector("main"));node("h2","Permissões de contratos",section);
 const list=node("div","",section);
 const button=node("button","Gerenciar acessos",section);
 button.onclick=run(async()=>{list.replaceChildren();for(const u of await api("/permissoes")){const row=node("article","",list);node("strong",u.nome,row);
 const viewLabel=node("label","Visualizar ",row),view=node("input","",viewLabel);view.type="checkbox";view.checked=!!u.visualizar;
 const editLabel=node("label","Editar ",row),edit=node("input","",editLabel);edit.type="checkbox";edit.checked=!!u.editar;
 view.onchange=()=>{if(!view.checked)edit.checked=false;};edit.onchange=()=>{if(edit.checked)view.checked=true;};
 const save=node("button","Salvar acesso",row);save.onclick=run(async()=>{await api("/permissoes/"+u.id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({visualizar:view.checked,editar:edit.checked})});$("status").textContent="Permissão atualizada.";});}});
}
run(permissionPanel)();

const printButton=node("button","Imprimir / salvar PDF",$("generator"));
printButton.onclick=()=>{const w=window.open("","_blank");if(!w){$("status").textContent="Permita a abertura da janela de impressão.";return;}w.document.title="Contrato";const pre=w.document.createElement("div");pre.style.cssText="white-space:pre-wrap;font:12pt Georgia;line-height:1.5;margin:25mm";pre.textContent=$("preview").value;w.document.body.append(pre);w.focus();w.print();};

const wordButton=node("button","Exportar Word (.docx)",$("generator"));
wordButton.onclick=run(async()=>{
 const enc=new TextEncoder(),xml=s=>s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
 const files={"[Content_Types].xml":'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',"_rels/.rels":'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',"word/document.xml":'<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+$("preview").value.split(/\r?\n/).map(s=>'<w:p><w:r><w:t xml:space="preserve">'+xml(s)+'</w:t></w:r></w:p>').join("")+'<w:sectPr/></w:body></w:document>'};
 const chunks=[],central=[];let offset=0,size=0;
 function header(n,fields){const b=new Uint8Array(n),v=new DataView(b.buffer);for(const [p,x,l] of fields)l===2?v.setUint16(p,x,true):v.setUint32(p,x,true);return b;}
 function crc(b){let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
 for(const [name,value] of Object.entries(files)){const n=enc.encode(name),b=enc.encode(value),c=crc(b);const h=header(30,[[0,0x04034b50,4],[4,20,2],[14,c,4],[18,b.length,4],[22,b.length,4],[26,n.length,2]]);chunks.push(h,n,b);const d=header(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[16,c,4],[20,b.length,4],[24,b.length,4],[28,n.length,2],[42,offset,4]]);central.push(d,n);size+=d.length+n.length;offset+=h.length+n.length+b.length;}
 const count=Object.keys(files).length,end=header(22,[[0,0x06054b50,4],[8,count,2],[10,count,2],[12,size,4],[16,offset,4]]);
 const url=URL.createObjectURL(new Blob([...chunks,...central,end],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}));const a=document.createElement("a");a.href=url;a.download="contrato.docx";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});

$("addCategory").onclick=()=>$("categoryDialog").showModal();$("addContract").onclick=()=>$("contractDialog").showModal();$("quickModel").onclick=()=>$("showModels").click();document.querySelectorAll(".closeDialog").forEach(b=>b.onclick=()=>b.closest("dialog").close());
