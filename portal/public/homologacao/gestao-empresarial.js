"use strict";
window.renderGestaoEmpresarial=function(perfil){
 if(perfil!=="admin")return '<section class="ge-wrap ge-restricted"><h3>Acesso restrito</h3><p>Disponível para administradores.</p></section>';
 return '<div class="ge-wrap" id="ge-live"><header class="ge-heading"><div><span class="ge-eyebrow">RODRINOXPRO · GESTÃO EMPRESARIAL</span><h3>Central empresarial</h3><p>Consultas ao ERP Bling em modo somente leitura.</p></div><span class="ge-status" id="ge-status">Verificar conexão</span></header><div class="ge-layout">'+Object.entries({contatos:"Clientes e fornecedores",produtos:"Produtos",vendas:"Pedidos de venda",compras:"Pedidos de compra",notas:"Notas fiscais",receber:"Contas a receber",pagar:"Contas a pagar"}).map(([k,v])=>'<button type="button" class="ge-tile" data-ge-resource="'+k+'"><h4>'+v+'</h4><p>Consultar registros</p></button>').join("")+'</div><section class="ge-panel"><h4 id="ge-title">Registros do Bling</h4><p id="ge-message" role="status">Selecione um módulo.</p><div><input id="ge-filter" type="search" placeholder="Filtrar registros desta página" aria-label="Filtrar registros desta página"><button type="button" data-ge-action="prev">Anterior</button><button type="button" data-ge-action="next">Próxima</button><button type="button" data-ge-action="refresh">Atualizar</button></div><div id="ge-results" style="overflow:auto"></div></section><div class="ge-notice">Nenhuma alteração é enviada ao Bling.</div></div>';
};
let geRoot,geResource,gePage=1,geRows=[],geSeq=0;
function geDraw(){
 const root=geRoot;if(!root?.isConnected)return;
 const term=root.querySelector("#ge-filter").value.toLocaleLowerCase("pt-BR");
 const out=root.querySelector("#ge-results");out.replaceChildren();
 const rows=geRows.filter(x=>JSON.stringify(x).toLocaleLowerCase("pt-BR").includes(term));
 const keys=geResource==="contatos"?["id","nome","numeroDocumento","situacao"]:geResource==="produtos"?["id","nome","codigo","preco","situacao"]:["id","numero","data","valor","total","situacao","contato"];
 const table=document.createElement("table");table.className="ge-data-table";const head=table.createTHead().insertRow();for(const k of keys){const th=document.createElement("th");th.textContent=k;head.append(th)}
 const body=table.createTBody();for(const row of rows){const tr=body.insertRow();for(const k of keys){const v=row[k];tr.insertCell().textContent=v==null?"—":typeof v==="object"?String(v.nome??v.id??"—"):String(v)}}
 out.append(table);
}
async function geLoad(resource,page){
 const root=document.querySelector("#ge-live");if(!root)return;
 geRoot=root;geResource=resource;gePage=page;geRows=[];geDraw();const seq=++geSeq;
 const msg=root.querySelector("#ge-message");msg.textContent="Consultando Bling…";
 root.querySelector("#ge-title").textContent=root.querySelector('[data-ge-resource="'+resource+'"] h4').textContent;
 try{const res=await fetch("/colaborador/api/bling/consulta/"+resource+"?pagina="+page+"&limite=20",{cache:"no-store"});const data=await res.json();if(seq!==geSeq||!root.isConnected)return;if(!res.ok)throw Error("Consulta indisponível ("+(data.statusBling||res.status)+").");geRows=Array.isArray(data.data)?data.data:[];msg.textContent="Página "+page+" · "+geRows.length+" registros";root.querySelector("#ge-status").textContent="● Consulta conectada";geDraw()}catch(e){if(seq===geSeq&&root.isConnected)msg.textContent=e.message||"Falha na consulta."}
}
document.addEventListener("click",e=>{const b=e.target.closest("#ge-live [data-ge-resource],#ge-live [data-ge-action]");if(!b)return;if(b.dataset.geResource){geLoad(b.dataset.geResource,1);return}if(!geResource||geRoot!==document.querySelector("#ge-live"))return;const a=b.dataset.geAction;if(a==="prev"&&gePage>1)geLoad(geResource,gePage-1);if(a==="next"&&geRows.length===20)geLoad(geResource,gePage+1);if(a==="refresh")geLoad(geResource,gePage)});
document.addEventListener("input",e=>{if(e.target.id==="ge-filter")geDraw()});
