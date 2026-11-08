const $ = (s, root=document) => root.querySelector(s);
const aviso = (msg, error=false) => { const el=$("#aviso"); el.textContent=msg; el.classList.toggle("error",error); };
let midiasDisponiveis=[];
let conteudosSalvos=new Map();
const homeDefaults=[
 {chave:"home.hero.slide-1",eyebrow:"Tecnologia a serviço da indústria",titulo:"Precisão em cada corte. Qualidade em cada peça.",texto:"Corte a laser, dobra e soldagem de componentes metálicos para impulsionar os projetos da sua empresa."},
 {chave:"home.hero.slide-2",eyebrow:"Fabricação industrial",titulo:"Da necessidade ao resultado.",texto:"Conectamos inovação, precisão e compromisso para transformar o seu projeto em realidade."},
 {chave:"home.hero.slide-3",eyebrow:"Soldagem especializada",titulo:"Uniões que sustentam grandes projetos.",texto:"Soldagem a laser, TIG e soldas especiais com atenção a cada detalhe."},
 {chave:"home.intro",eyebrow:"",titulo:"Seu próximo projeto merece um parceiro à altura.",texto:"Na Rodrinox Pro, acreditamos que grandes resultados começam com soluções bem planejadas. Conectamos necessidades industriais a caminhos eficientes, com atenção aos detalhes, tecnologia e relacionamento próximo."}
];
const grupos={
 carreiras:{chave:"pagina.trabalhe-conosco",titulo:"Trabalhe Conosco",campos:[["chamada","Chamada superior","text"],["titulo","Título principal","text"],["descricao","Texto de apresentação","textarea"],["form_titulo","Título do formulário","text"],["form_descricao","Orientação para candidatos","textarea"],["botao","Texto do botão de envio","text"],["cor_primaria","Cor principal (ex.: #0b1f3a)","text"],["cor_destaque","Cor de destaque (ex.: #f26a1b)","text"]]},
 login:{chave:"pagina.login",titulo:"Login — Acesso restrito",campos:[["chamada","Chamada do painel visual","text"],["titulo_visual","Título do painel visual","text"],["descricao_visual","Descrição do painel visual","textarea"],["titulo_form","Título do formulário de acesso","text"],["descricao_form","Descrição do formulário","textarea"],["botao","Texto do botão de acesso","text"],["imagem_url","URL da imagem de fundo (HTTPS)","url"],["cor_primaria","Cor principal (ex.: #0b1f3a)","text"],["cor_destaque","Cor de destaque (ex.: #f26a1b)","text"]]},
 empresa:{chave:"empresa.institucional",titulo:"A empresa",campos:[
  ["historia","História da Rodrinox Pro","textarea"],["apresentacao","Apresentação institucional","textarea"],["missao","Missão","textarea"],["visao","Visão","textarea"],["valores","Valores","textarea"]
 ]},
 contato:{chave:"contato.dados",titulo:"Contato",campos:[
  ["email","E-mail","text"],["telefone","Telefone","text"],["telefone_link","Link de telefone (tel:)","text"],["whatsapp","WhatsApp exibido","text"],["whatsapp_numero","WhatsApp com código do país, só números","text"],["endereco","Endereço completo","textarea"],["horario","Horário de atendimento","text"],["mapa_url","Link do Google Maps","url"]
 ]},
 identidade:{chave:"site.identidade",titulo:"Cabeçalho e rodapé",campos:[
  ["nome","Nome da empresa","text"],["slogan","Slogan","text"],["tagline","Frase institucional do cabeçalho","text"],["texto_rodape","Texto institucional do rodapé","textarea"],["site","Endereço do site","text"],["logo_url","URL da logomarca (se já estiver hospedada)","url"]
 ]}
};
function parseCorpo(item){try{return JSON.parse(item?.corpo||"{}")}catch{return {texto:item?.corpo||""}}}
function fieldMarkup(id,label,type,value=""){
 const val=String(value??"");
 return '<div><label for="'+id+'">'+label+'</label>'+(type==="textarea"
 ? '<textarea id="'+id+'" name="'+id+'">'+esc(val)+'</textarea>'
 : '<input id="'+id+'" name="'+id+'" type="'+type+'" value="'+esc(val)+'">')+'</div>';
}
function montarCamposGrupo(nome){
 const grupo=grupos[nome], alvo=$("#"+nome+"-fields");
 alvo.innerHTML=grupo.campos.map(([id,label,type])=>fieldMarkup(id,label,type,"")).join("");
}
function preencherCamposGrupo(nome, dados){
 for(const [id] of grupos[nome].campos){const el=$('#'+nome+'-fields [name="'+id+'"]');if(el)el.value=dados[id]??"";}
}
function dadosCamposGrupo(nome){
 const out={};for(const [id] of grupos[nome].campos)out[id]=$('#'+nome+'-fields [name="'+id+'"]').value.trim();return out;
}
async function salvarConteudo(chave,titulo,body){
 await api("site/conteudos/"+encodeURIComponent(chave),{method:"PUT",body:{titulo,corpo:JSON.stringify(body),status:"rascunho"}});
 conteudosSalvos.set(chave,{chave,titulo,corpo:JSON.stringify(body),status:"rascunho"});
}
async function carregarConteudos(){
 const dados=await api("site/conteudos");conteudosSalvos=new Map(dados.map(x=>[x.chave,x]));
}
async function carregarHome(){
 for(let i=0;i<homeDefaults.length;i++){
  const base=homeDefaults[i],salvo=conteudosSalvos.get(base.chave),extra=parseCorpo(salvo),prefix=i<3?"hero"+(i+1):"intro";
  $("#"+prefix+"-eyebrow") && ($("#"+prefix+"-eyebrow").value=extra.eyebrow??base.eyebrow);
  $("#"+prefix+"-title").value=salvo?.titulo??base.titulo;
  $("#"+prefix+"-text").value=extra.texto??base.texto;
  if(i<3){const select=$("#"+prefix+"-image");select.value=extra.imagem_id==null?"":String(extra.imagem_id);atualizarPreview(i+1,select.value);}
 }
}
function atualizarPreview(n,id){
 const el=$("#hero"+n+"-preview"),m=midiasDisponiveis.find(x=>String(x.id)===String(id));
 if(m){el.src="api/site/midias/"+m.id+"/arquivo";el.alt=m.descricao||m.nome_original;}
 else{el.removeAttribute("src");el.alt="Imagem original do site será mantida até a integração de publicação.";}
}
function preencherSelectsImagem(){
 for(let n=1;n<=3;n++){
  const s=$("#hero"+n+"-image"),v=s.value;s.replaceChildren(new Option("Usar imagem original",""));
  midiasDisponiveis.forEach(m=>s.add(new Option((m.descricao||m.nome_original)+" (#"+m.id+")",String(m.id))));
  s.value=v;
 }
 for(const id of ["servico-form","projeto-form","galeria-form"]){
  const s=$('#'+id+' [name="imagem_id"]');if(!s)continue;const v=s.value;s.replaceChildren(new Option("Sem imagem",""));
  midiasDisponiveis.forEach(m=>s.add(new Option((m.descricao||m.nome_original)+" (#"+m.id+")",String(m.id))));s.value=v;
 }
}
for(let n=1;n<=3;n++)$("#hero"+n+"-image").addEventListener("change",e=>atualizarPreview(n,e.target.value));
$("#home-editor").addEventListener("submit",async e=>{
 e.preventDefault();
 try{
  for(let i=0;i<homeDefaults.length;i++){
   const base=homeDefaults[i],prefix=i<3?"hero"+(i+1):"intro";
   await salvarConteudo(base.chave,$("#"+prefix+"-title").value.trim(),{
    eyebrow:i<3?$("#"+prefix+"-eyebrow").value.trim():"",
    texto:$("#"+prefix+"-text").value.trim(),
    imagem_id:i<3&&$("#"+prefix+"-image").value?Number($("#"+prefix+"-image").value):null
   });
  }
  aviso("Página inicial salva como rascunho no banco de testes.");
 }catch(err){aviso("Falha ao salvar a página inicial: "+err.message,true);}
});
$("#home-reload").addEventListener("click",async()=>{try{await carregarConteudos();await carregarHome();aviso("Página inicial recarregada.");}catch(e){aviso(e.message,true);}});
for(const nome of Object.keys(grupos)){
 montarCamposGrupo(nome);
 const form=$("#"+nome+"-editor");
 form.addEventListener("submit",async e=>{
  e.preventDefault();try{const dados=dadosCamposGrupo(nome);await salvarConteudo(grupos[nome].chave,grupos[nome].titulo,dados);aviso("Informações de "+grupos[nome].titulo.toLowerCase()+" salvas como rascunho.");}
  catch(err){aviso("Não foi possível salvar: "+err.message,true);}
 });
}
async function carregarGrupos(){
 for(const nome of Object.keys(grupos)){const item=conteudosSalvos.get(grupos[nome].chave);preencherCamposGrupo(nome,parseCorpo(item));}
}
function limparFormulario(id){
 const f=$("#"+id);f.reset();f.elements.id.value="";f.elements.slug.disabled=false;
 $("#"+id+"-title")&&($("#"+id+"-title").textContent=id==="servico-form"?"Adicionar serviço":id==="projeto-form"?"Adicionar projeto":"Adicionar imagem à galeria");
}
document.addEventListener("click",e=>{
 const tab=e.target.closest("[data-tab]");
 if(tab){document.querySelectorAll(".admin-nav button").forEach(b=>b.classList.toggle("active",b===tab));document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("active",p.id==="tab-"+tab.dataset.tab));}
 const reset=e.target.closest("[data-reset]");if(reset)limparFormulario(reset.dataset.reset);
});
function itemCard(item){
 const row=document.createElement("article");row.className="item-row";
 const img=document.createElement("img");img.alt=item.titulo;
 const midia=midiasDisponiveis.find(m=>String(m.id)===String(item.imagem_id));
 if(midia)img.src="api/site/midias/"+midia.id+"/arquivo";else img.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='70'%3E%3Crect width='100%25' height='100%25' fill='%23edf2f7'/%3E%3C/svg%3E";
 const info=document.createElement("div"),title=document.createElement("strong"),desc=document.createElement("p"),status=document.createElement("span");
 title.textContent=item.titulo;desc.textContent=item.resumo||item.descricao||item.slug;status.className="status"+(item.status==="publicado"?" published":"");status.textContent=item.status;
 info.append(title,desc,status);
 const actions=document.createElement("div");actions.className="item-actions actions";
 const edit=document.createElement("button");edit.type="button";edit.className="secondary";edit.textContent="Editar";edit.addEventListener("click",()=>editarItem(item));
 const del=document.createElement("button");del.type="button";del.className="danger";del.textContent="Excluir";del.addEventListener("click",()=>excluirItem(item));
 actions.append(edit,del);row.append(img,info,actions);return row;
}
const tipoParaForm={servico:"servico-form",projeto:"projeto-form",galeria:"galeria-form"};
async function carregarItens(tipo){
 const listaIds={servico:"servicos-list",projeto:"projetos-list",galeria:"galeria-list"};
 const dados=await api("site/itens?tipo="+tipo),alvo=$("#"+listaIds[tipo]);
 if(!alvo)throw new Error("Área da lista não encontrada: "+tipo);
 alvo.replaceChildren();
 if(!dados.length){alvo.textContent="Nenhum registro cadastrado.";return;}
 dados.forEach(x=>alvo.append(itemCard(x)));
}
function editarItem(item){
 const form=$("#"+tipoParaForm[item.tipo]);if(!form)return;
 form.elements.id.value=item.id;form.elements.slug.value=item.slug;form.elements.slug.disabled=true;
 form.elements.titulo.value=item.titulo;form.elements.resumo.value=item.resumo||"";
 form.elements.descricao.value=item.descricao||"";form.elements.imagem_id.value=item.imagem_id||"";
 form.elements.ordem.value=item.ordem||0;
 $("#"+item.tipo+"-form-title").textContent="Editar: "+item.titulo;
 form.scrollIntoView({behavior:"smooth",block:"center"});
}
async function excluirItem(item){
 if(!confirm('Excluir "'+item.titulo+'"? Esta ação não pode ser desfeita.'))return;
 try{await api("site/itens/"+item.id,{method:"DELETE"});await carregarItens(item.tipo);aviso("Registro excluído.");}
 catch(e){aviso("Não foi possível excluir: "+e.message,true);}
}
for(const tipo of ["servico","projeto","galeria"]){
 const form=$("#"+tipoParaForm[tipo]);
 form.addEventListener("submit",async e=>{
  e.preventDefault();const d=Object.fromEntries(new FormData(form));const id=d.id;
  const payload={titulo:d.titulo.trim(),resumo:d.resumo,descricao:d.descricao,imagem_id:d.imagem_id?Number(d.imagem_id):null,ordem:Number(d.ordem||0),status:"rascunho"};
  try{
   if(id)await api("site/itens/"+id,{method:"PATCH",body:payload});
   else await api("site/itens",{method:"POST",body:{...payload,tipo,slug:d.slug.trim(),status:"rascunho"}});
   limparFormulario(tipoParaForm[tipo]);await carregarItens(tipo);aviso((tipo==="servico"?"Serviço":tipo==="projeto"?"Projeto":"Imagem da galeria")+" salvo como rascunho.");
  }catch(err){aviso("Não foi possível salvar: "+err.message,true);}
 });
}
async function carregarMidias(){
 midiasDisponiveis=await api("site/midias");preencherSelectsImagem();
 const alvo=$("#midias");alvo.replaceChildren();
 if(!midiasDisponiveis.length){alvo.textContent="Nenhuma imagem cadastrada.";return;}
 for(const m of midiasDisponiveis){
  const card=document.createElement("article");card.className="item-row";
  const img=document.createElement("img");img.src="api/site/midias/"+m.id+"/arquivo";img.alt=m.descricao||m.nome_original;
  const info=document.createElement("div"),strong=document.createElement("strong"),p=document.createElement("p");
  strong.textContent=m.descricao||m.nome_original;p.textContent="#"+m.id+" · "+m.mime+" · "+Math.round(m.tamanho/1024)+" KB";
  info.append(strong,p);
  const del=document.createElement("button");del.className="danger";del.textContent="Excluir";del.addEventListener("click",async()=>{
   if(!confirm("Excluir esta imagem da biblioteca?"))return;
   try{await api("site/midias/"+m.id,{method:"DELETE"});await carregarMidias();aviso("Imagem excluída.");}
   catch(e){aviso(e.message,true);}
  });
  card.append(img,info,del);alvo.append(card);
 }
}
$("#upload").addEventListener("submit",async e=>{
 e.preventDefault();const form=e.currentTarget;
 try{
  const r=await fetch("api/site/midias",{method:"POST",credentials:"same-origin",headers:{"X-Portal":"1"},body:new FormData(form)});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.erro||"Falha no envio");
  form.reset();await carregarMidias();aviso("Imagem enviada para a biblioteca.");
 }catch(err){aviso("Falha no upload: "+err.message,true);}
});
(async()=>{
 try{
  const usuario=await api("eu");if(usuario.perfil!=="admin"){aviso("Acesso restrito ao administrador.",true);return;}
  await carregarConteudos();await carregarMidias();await carregarHome();await carregarGrupos();
  await Promise.all([carregarItens("servico"),carregarItens("projeto"),carregarItens("galeria")]);
  aviso("Gerenciador carregado. As alterações ficam em rascunho no banco de testes.");
 }catch(e){aviso(e.message,true);setTimeout(()=>location.href="index.html",1200);}
})();
