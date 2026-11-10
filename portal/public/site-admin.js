const $ = (s, root=document) => root.querySelector(s);
const aviso = (msg, error=false) => { const el=$("#aviso"); el.textContent=msg; el.classList.toggle("error",error); };
let midiasDisponiveis=[];
let conteudosSalvos=new Map();
const homeValueDefaults=[{title:"Visão técnica",text:"Entendimento das necessidades e atenção a cada etapa do projeto."},{title:"Inovação aplicada",text:"Soluções inteligentes com foco em funcionalidade e eficiência."},{title:"Compromisso",text:"Atendimento transparente e foco em construir relações duradouras."}];
const homeDefaults=[
 {chave:"home.hero.slide-1",eyebrow:"Tecnologia a serviço da indústria",titulo:"Precisão em cada corte. Qualidade em cada peça.",texto:"Corte a laser, dobra e soldagem de componentes metálicos para impulsionar os projetos da sua empresa."},
 {chave:"home.hero.slide-2",eyebrow:"Fabricação industrial",titulo:"Da necessidade ao resultado.",texto:"Conectamos inovação, precisão e compromisso para transformar o seu projeto em realidade."},
 {chave:"home.hero.slide-3",eyebrow:"Soldagem especializada",titulo:"Uniões que sustentam grandes projetos.",texto:"Soldagem a laser, TIG e soldas especiais com atenção a cada detalhe."},
 {chave:"home.intro",eyebrow:"",titulo:"Seu próximo projeto merece um parceiro à altura.",texto:"Na Rodrinox Pro, acreditamos que grandes resultados começam com soluções bem planejadas. Conectamos necessidades industriais a caminhos eficientes, com atenção aos detalhes, tecnologia e relacionamento próximo."}
];
const grupos={
 carreiras:{chave:"pagina.trabalhe-conosco",titulo:"Trabalhe Conosco",campos:[["chamada","Chamada superior","text"],["titulo","Título principal","text"],["descricao","Texto de apresentação","textarea"],["form_titulo","Título do formulário","text"],["form_descricao","Orientação para candidatos","textarea"],["botao","Texto do botão de envio","text"],["imagem_id","Imagem da página","media"],["cor_primaria","Cor principal (ex.: #0b1f3a)","text"],["cor_destaque","Cor de destaque (ex.: #f26a1b)","text"]]},
 login:{chave:"pagina.login",titulo:"Login — Acesso restrito",campos:[["chamada","Chamada do painel visual","text"],["titulo_visual","Título do painel visual","text"],["descricao_visual","Descrição do painel visual","textarea"],["titulo_form","Título do formulário de acesso","text"],["descricao_form","Descrição do formulário","textarea"],["botao","Texto do botão de acesso","text"],["imagem_id","Foto principal do painel esquerdo","media"],["logo_imagem_id","Logotipo PNG sobre o painel branco","media-logo"],["cor_primaria","Cor principal (ex.: #0b1f3a)","text"],["cor_destaque","Cor de destaque (ex.: #f26a1b)","text"]]},
 empresa:{chave:"empresa.institucional",titulo:"A empresa",campos:[
  ["hero_chamada","Chamada do banner","text"],["hero_titulo","Título do banner","text"],["hero_imagem_id","Imagem do banner","media"],
  ["heading","Título da apresentação","text"],["apresentacao","Apresentação institucional","textarea"],["historia","História da Rodrinox Pro","textarea"],
  ["missao","Missão","textarea"],["visao","Visão","textarea"],["valores","Valores","textarea"]
 ]},
 estrutura:{chave:"estrutura.institucional",titulo:"Estrutura",campos:[
  ["hero_chamada","Chamada do banner","text"],["hero_titulo","Título do banner","text"],["hero_imagem_id","Imagem do banner","media"],
  ["heading","Título da seção","text"],["descricao","Descrição da estrutura","textarea"],
  ["area1_titulo","Área 1 — título","text"],["area1_descricao","Área 1 — descrição","textarea"],["area1_imagem_id","Área 1 — imagem","media"],
  ["area2_titulo","Área 2 — título","text"],["area2_descricao","Área 2 — descrição","textarea"],["area2_imagem_id","Área 2 — imagem","media"],
  ["area3_titulo","Área 3 — título","text"],["area3_descricao","Área 3 — descrição","textarea"],["area3_imagem_id","Área 3 — imagem","media"],
  ["area4_titulo","Área 4 — título","text"],["area4_descricao","Área 4 — descrição","textarea"],["area4_imagem_id","Área 4 — imagem","media"],
  ["metrica1_valor","Indicador 1 — valor","text"],["metrica1_label","Indicador 1 — legenda","text"],
  ["metrica2_valor","Indicador 2 — valor","text"],["metrica2_label","Indicador 2 — legenda","text"],
  ["metrica3_valor","Indicador 3 — valor","text"],["metrica3_label","Indicador 3 — legenda","text"]
 ]},
 servicosPagina:{chave:"servicos.pagina",titulo:"Apresentação de serviços",campos:[
  ["hero_chamada","Chamada do banner","text"],["hero_titulo","Título do banner","text"],["hero_texto","Descrição do banner","textarea"],["hero_imagem_id","Imagem do banner","media"],
  ["heading","Título da seção de serviços","text"],["descricao","Texto de apresentação","textarea"]
 ]},
 projetosPagina:{chave:"projetos.pagina",titulo:"Apresentação de projetos",campos:[
  ["hero_chamada","Chamada do banner","text"],["hero_titulo","Título do banner","text"],["hero_imagem_id","Imagem do banner","media"],
  ["heading","Título da seção","text"],["descricao","Texto de apresentação","textarea"]
 ]},
 galeriaPagina:{chave:"galeria.pagina",titulo:"Apresentação da galeria",campos:[
  ["hero_chamada","Chamada do banner","text"],["hero_titulo","Título do banner","text"],["hero_imagem_id","Imagem do banner","media"],
  ["heading","Título da seção","text"],["descricao","Texto de apresentação","textarea"]
 ]},
 contato:{chave:"contato.dados",titulo:"Contato",campos:[
  ["hero_chamada","Chamada do banner","text"],["hero_titulo","Título do banner","text"],["hero_imagem_id","Imagem do banner","media"],
  ["email","E-mail","text"],["telefone","Telefone","text"],["telefone_link","Link de telefone (tel:)","text"],["whatsapp","WhatsApp exibido","text"],["whatsapp_numero","WhatsApp com código do país, só números","text"],["endereco","Endereço completo","textarea"],["horario","Horário de atendimento","text"],["mapa_url","Link do Google Maps","url"]
 ]},
 identidade:{chave:"site.identidade",titulo:"Cabeçalho e rodapé",campos:[
  ["nome","Nome da empresa","text"],["slogan","Slogan","text"],["tagline","Frase institucional do cabeçalho","text"],["texto_rodape","Texto institucional do rodapé","textarea"],["site","Endereço do site","text"],["logo_url","URL da logomarca (se já estiver hospedada)","url"]
 ]}
};
function parseCorpo(item){try{return JSON.parse(item?.corpo||"{}")}catch{return {texto:item?.corpo||""}}}
async function uploadMidiaGrupo(nome,id,tipo){
 const input=$('#'+nome+'-fields #'+id+'-upload');
 const arquivo=input?.files?.[0];
 if(!arquivo){aviso("Selecione um arquivo antes de enviar.",true);return;}
 if(tipo==="media-logo"&&arquivo.type!=="image/png"){aviso("Para a logomarca, envie um arquivo PNG.",true);return;}
 const form=new FormData();form.append("imagem",arquivo);form.append("descricao",tipo==="media-logo"?"Login - logotipo Rodrinox Pro":"Login - fotografia do painel");
 try{
  const resposta=await fetch("api/site/midias",{method:"POST",credentials:"same-origin",headers:{"X-Portal":"1"},body:form});
  const dados=await resposta.json().catch(()=>({}));
  if(!resposta.ok)throw new Error(dados.erro||"Falha ao enviar a imagem.");
  await carregarMidias();
  const seletor=$('#'+nome+'-fields [name="'+id+'"]');
  seletor.value=String(dados.id);atualizarPreviewGrupo(nome,id);input.value="";
  aviso("Imagem enviada e selecionada. Clique em Salvar página de login para aplicar a alteração.");
 }catch(error){aviso("Não foi possível enviar a imagem: "+error.message,true);}
}
function fieldMarkup(id,label,type,value=""){
 const val=String(value??"");
 const mediaField=type==="media"||type==="media-logo";
 const accept=type==="media-logo"?"image/png":"image/jpeg,image/png,image/webp";
 const mediaMarkup=mediaField
  ? '<select id="'+id+'" name="'+id+'"><option value="">Manter imagem padrão</option></select><img class="media-preview '+(type==="media-logo"?"logo-preview":"")+'" id="'+id+'-preview" alt="Prévia: '+label+'" hidden><label for="'+id+'-upload">Arquivo para substituir</label><input id="'+id+'-upload" type="file" accept="'+accept+'"><button class="secondary" type="button" data-upload-media="'+id+'">Enviar e selecionar</button><p class="hint">'+(type==="media-logo"?"Envie um PNG com fundo transparente para o logotipo.":"Envie JPG, PNG ou WebP para a fotografia.")+' O arquivo será salvo na biblioteca de imagens.</p>'
  : type==="textarea"
   ? '<textarea id="'+id+'" name="'+id+'">'+esc(val)+'</textarea>'
   : '<input id="'+id+'" name="'+id+'" type="'+type+'" value="'+esc(val)+'">';
 return '<div><label for="'+id+'">'+label+'</label>'+mediaMarkup+'</div>';
}
function montarCamposGrupo(nome){
 const grupo=grupos[nome], alvo=$("#"+nome+"-fields");
 alvo.innerHTML=grupo.campos.map(([id,label,type])=>fieldMarkup(id,label,type,"")).join("");
}
function preencherCamposGrupo(nome, dados){
 for(const [id] of grupos[nome].campos){const el=$('#'+nome+'-fields [name="'+id+'"]');if(el){el.value=dados[id]??"";if(el.tagName==="SELECT")atualizarPreviewGrupo(nome,id);}}
}
function atualizarPreviewGrupo(nome,id){
 const el=$('#'+nome+'-fields [name="'+id+'"]'),img=$('#'+nome+'-fields #'+id+'-preview');
 if(!el||!img)return;
 const m=midiasDisponiveis.find(x=>String(x.id)===String(el.value));
 img.classList.toggle("logo-preview",id==="logo_imagem_id");
 if(m){img.src="api/site/midias/"+m.id+"/arquivo";img.alt=m.descricao||m.nome_original;img.hidden=false;}
 else{img.removeAttribute("src");img.hidden=true;}
}
function preencherMidiasGrupos(){
 for(const nome of Object.keys(grupos)){
  const campos=grupos[nome].campos.filter(([, ,tipo])=>tipo==="media"||tipo==="media-logo");
  for(const [id,,tipo] of campos){
   const el=$('#'+nome+'-fields [name="'+id+'"]');if(!el)continue;
   const atual=el.value;el.replaceChildren(new Option("Manter imagem padrão",""));
   midiasDisponiveis.forEach(m=>el.add(new Option((m.descricao||m.nome_original)+" (#"+m.id+")",String(m.id))));
   el.value=atual;atualizarPreviewGrupo(nome,id);
  }
 }
}
function dadosCamposGrupo(nome){
 const out={};
 for(const [id,,tipo] of grupos[nome].campos){
  const el=$('#'+nome+'-fields [name="'+id+'"]');
  if(tipo==="media"||tipo==="media-logo")out[id]=el.value?Number(el.value):null;
  else out[id]=el.value.trim();
 }
 return out;
}
async function salvarConteudo(chave,titulo,body){
 await api("site/conteudos/"+encodeURIComponent(chave),{method:"PUT",body:{titulo,corpo:JSON.stringify(body),status:"publicado"}});
 conteudosSalvos.set(chave,{chave,titulo,corpo:JSON.stringify(body),status:"publicado"});
}
async function carregarConteudos(){
 const dados=await api("site/conteudos");conteudosSalvos=new Map(dados.map(x=>[x.chave,x]));
}
$("#publish-all").addEventListener("click", async () => {
 if (!confirm("Publicar todos os rascunhos de textos, banners, serviços, projetos e galeria? As alterações ficarão visíveis no site institucional conectado.")) return;
 try {
  const conteudos = await api("site/conteudos");
  for (const item of conteudos) {
   await api("site/conteudos/" + encodeURIComponent(item.chave), {
    method: "PUT", body: { titulo: item.titulo, corpo: item.corpo || "", status: "publicado" }
   });
  }
  for (const tipo of ["banner", "servico", "projeto", "galeria"]) {
   const itens = await api("site/itens?tipo=" + tipo);
   for (const item of itens) {
    if (item.status !== "publicado") await api("site/itens/" + item.id, { method: "PATCH", body: { status: "publicado" } });
   }
  }
  await carregarConteudos();
  aviso("Rascunhos publicados. O site atualizará os conteúdos conectados em instantes.");
  await Promise.all([carregarItens("servico"), carregarItens("projeto"), carregarItens("galeria")]);
 } catch (err) { aviso("Falha ao publicar: " + err.message, true); }
});
async function carregarHome(){
 for(let i=0;i<homeDefaults.length;i++){
  const base=homeDefaults[i],salvo=conteudosSalvos.get(base.chave),extra=parseCorpo(salvo),prefix=i<3?"hero"+(i+1):"intro";
  $("#"+prefix+"-eyebrow") && ($("#"+prefix+"-eyebrow").value=extra.eyebrow??base.eyebrow);
  $("#"+prefix+"-title").value=salvo?.titulo??base.titulo;
  $("#"+prefix+"-text").value=extra.texto??base.texto;
  if(i<3){const select=$("#"+prefix+"-image");select.value=extra.imagem_id==null?"":String(extra.imagem_id);atualizarPreview(i+1,select.value);}
  else {const select=$("#intro-image");select.value=extra.imagem_id==null?"":String(extra.imagem_id);atualizarIntroPreview(select.value);}
 }
 const savedValues=parseCorpo(conteudosSalvos.get("home.values"));
 const liveValues=Array.isArray(savedValues.items)?savedValues.items:homeValueDefaults;
 homeValueDefaults.forEach((fallback,n)=>{const value=liveValues[n]||fallback;$("#value"+(n+1)+"-title").value=value.title||"";$("#value"+(n+1)+"-text").value=value.text||"";});
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
 const introSelect=$("#intro-image"),introValue=introSelect.value;introSelect.replaceChildren(new Option("Usar imagem original",""));midiasDisponiveis.forEach(m=>introSelect.add(new Option((m.descricao||m.nome_original)+" (#"+m.id+")",String(m.id))));introSelect.value=introValue;
 for(const id of ["servico-form","projeto-form","galeria-form"]){
  const s=$('#'+id+' [name="imagem_id"]');if(!s)continue;const v=s.value;s.replaceChildren(new Option("Sem imagem",""));
  midiasDisponiveis.forEach(m=>s.add(new Option((m.descricao||m.nome_original)+" (#"+m.id+")",String(m.id))));s.value=v;
 }
}
for(let n=1;n<=3;n++)$("#hero"+n+"-image").addEventListener("change",e=>atualizarPreview(n,e.target.value));
$("#intro-image").addEventListener("change",e=>atualizarIntroPreview(e.target.value));
const introUploadInput=$("#intro-image-upload"),introUploadButton=$("#intro-image-upload-button"),introUploadStatus=$("#intro-upload-status");
function statusUploadIntro(message,error=false){introUploadStatus.textContent=message;introUploadStatus.classList.toggle("error",error);}
introUploadInput.addEventListener("change",()=>{const file=introUploadInput.files?.[0];if(!file){statusUploadIntro("Nenhum arquivo selecionado.");return;}if(!["image/jpeg","image/png","image/webp"].includes(file.type)){statusUploadIntro("Formato inválido. Use JPG, PNG ou WebP.",true);return;}if(file.size>5*1024*1024){statusUploadIntro("A imagem deve ter no máximo 5 MB.",true);return;}const preview=$("#intro-preview");if(preview.dataset.localPreview)URL.revokeObjectURL(preview.dataset.localPreview);const local=URL.createObjectURL(file);preview.dataset.localPreview=local;preview.src=local;preview.alt="Prévia local: "+file.name;preview.hidden=false;statusUploadIntro("Prévia carregada. Clique em Enviar e selecionar fotografia.");});
async function enviarFotoQuemSomos(){
 const file=introUploadInput.files?.[0];if(!file){statusUploadIntro("Selecione uma fotografia antes de enviar.",true);return;}
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)){statusUploadIntro("Formato inválido. Use JPG, PNG ou WebP.",true);return;}
 if(file.size>5*1024*1024){statusUploadIntro("A imagem deve ter no máximo 5 MB.",true);return;}
 introUploadButton.disabled=true;introUploadButton.textContent="Enviando fotografia…";statusUploadIntro("Enviando a imagem para a biblioteca…");
 try{
  const form=new FormData();form.append("imagem",file,file.name);form.append("descricao","Página inicial - Quem somos");
  const response=await fetch("/colaborador/api/site/midias",{method:"POST",credentials:"same-origin",headers:{"X-Portal":"1"},body:form});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.erro||("Erro HTTP "+response.status));
  if(!data.id)throw new Error("O servidor recebeu a imagem, mas não retornou o identificador da biblioteca.");
  const select=$("#intro-image"),id=String(data.id),preview=$("#intro-preview");
  if(!Array.from(select.options).some(option=>option.value===id))select.add(new Option((data.nome_original||file.name)+" (#"+id+")",id));
  select.value=id;preview.src="/colaborador/api/site/midias/"+id+"/arquivo";preview.alt=data.nome_original||file.name;preview.hidden=false;
  if(preview.dataset.localPreview){URL.revokeObjectURL(preview.dataset.localPreview);delete preview.dataset.localPreview;}
  introUploadInput.value="";
  try{await carregarMidias();select.value=id;atualizarIntroPreview(id);}catch(refreshError){console.warn("Imagem enviada; não foi possível atualizar a lista completa da biblioteca:",refreshError);}
  statusUploadIntro("Fotografia enviada e selecionada! Agora clique em “Salvar página inicial” para publicar no site.");
  aviso("Fotografia enviada e selecionada. Clique em Salvar página inicial para aplicar a alteração.");
 }catch(error){statusUploadIntro("Falha ao enviar: "+error.message,true);aviso("Não foi possível enviar a fotografia: "+error.message,true);}
 finally{introUploadButton.disabled=false;introUploadButton.textContent="Enviar e selecionar fotografia";}
}
introUploadButton.addEventListener("click",enviarFotoQuemSomos);
function atualizarIntroPreview(id){const el=$("#intro-preview"),m=midiasDisponiveis.find(x=>String(x.id)===String(id));if(m){el.src="api/site/midias/"+m.id+"/arquivo";el.alt=m.descricao||m.nome_original;}else{el.removeAttribute("src");el.alt="Imagem original do site será mantida.";}}
$("#home-editor").addEventListener("submit",async e=>{
 e.preventDefault();
 try{
  for(let i=0;i<homeDefaults.length;i++){
   const base=homeDefaults[i],prefix=i<3?"hero"+(i+1):"intro";
   await salvarConteudo(base.chave,$("#"+prefix+"-title").value.trim(),{
    eyebrow:i<3?$("#"+prefix+"-eyebrow").value.trim():"",
    texto:$("#"+prefix+"-text").value.trim(),
    imagem_id:($("#"+prefix+"-image").value?Number($("#"+prefix+"-image").value):null)
   });
  }
  const items=homeValueDefaults.map((fallback,n)=>({title:$("#value"+(n+1)+"-title").value.trim(),text:$("#value"+(n+1)+"-text").value.trim()}));
  await salvarConteudo("home.values","Diferenciais — Quem somos",{items});
  aviso("Página inicial publicada no site institucional. O site carregará as alterações automaticamente.");
 }catch(err){aviso("Falha ao salvar a página inicial: "+err.message,true);}
});
$("#home-reload").addEventListener("click",async()=>{try{await carregarConteudos();await carregarHome();aviso("Página inicial recarregada.");}catch(e){aviso(e.message,true);}});
for(const nome of Object.keys(grupos)){
 montarCamposGrupo(nome);
 for(const [id,,tipo] of grupos[nome].campos){
  if(tipo!=="media"&&tipo!=="media-logo")continue;
  const seletor=$('#'+nome+'-fields [name="'+id+'"]');
  seletor?.addEventListener("change",()=>atualizarPreviewGrupo(nome,id));
  const botao=$('#'+nome+'-fields [data-upload-media="'+id+'"]');
  botao?.addEventListener("click",()=>uploadMidiaGrupo(nome,id,tipo));
 }
 const form=$("#"+nome+"-editor");
 form.addEventListener("submit",async e=>{
  e.preventDefault();try{const dados=dadosCamposGrupo(nome);await salvarConteudo(grupos[nome].chave,grupos[nome].titulo,dados);aviso("Informações de "+grupos[nome].titulo.toLowerCase()+" publicadas no site institucional.");}
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
  const payload={titulo:d.titulo.trim(),resumo:d.resumo,descricao:d.descricao,imagem_id:d.imagem_id?Number(d.imagem_id):null,ordem:Number(d.ordem||0),status:"publicado"};
  try{
   if(id)await api("site/itens/"+id,{method:"PATCH",body:payload});
   else await api("site/itens",{method:"POST",body:{...payload,tipo,slug:d.slug.trim(),status:"publicado"}});
   limparFormulario(tipoParaForm[tipo]);await carregarItens(tipo);aviso((tipo==="servico"?"Serviço":tipo==="projeto"?"Projeto":"Imagem da galeria")+" publicado no site institucional.");
  }catch(err){aviso("Não foi possível salvar: "+err.message,true);}
 });
}
async function carregarMidias(){
 midiasDisponiveis=await api("site/midias");preencherSelectsImagem();preencherMidiasGrupos();
 const alvo=$("#midias");alvo.replaceChildren();
 if(!midiasDisponiveis.length){alvo.textContent="Nenhuma imagem cadastrada.";return;}
 for(const m of midiasDisponiveis){
  const card=document.createElement("article");card.className="item-row";
  const img=document.createElement("img");img.src="api/site/midias/"+m.id+"/arquivo";img.alt=m.descricao||m.nome_original;
  const info=document.createElement("div"),strong=document.createElement("strong"),p=document.createElement("p");
  strong.textContent=m.descricao||m.nome_original;p.textContent="#"+m.id+" · "+m.mime+" · "+Math.round(m.tamanho/1024)+" KB";
  info.append(strong,p);
  const actions=document.createElement("div");actions.className="item-actions actions";
  const download=document.createElement("a");download.className="secondary";download.textContent="Baixar";
  download.href="api/site/midias/"+m.id+"/arquivo?download=1";download.download=m.nome_original||("imagem-"+m.id);
  const del=document.createElement("button");del.className="danger";del.textContent="Excluir";del.addEventListener("click",async()=>{
   if(!confirm("Excluir esta imagem da biblioteca?"))return;
   try{await api("site/midias/"+m.id,{method:"DELETE"});await carregarMidias();aviso("Imagem excluída.");}
   catch(e){aviso(e.message,true);}
  });
  actions.append(download,del);card.append(img,info,actions);alvo.append(card);
 }
}
$("#upload").addEventListener("submit",async e=>{
 e.preventDefault();const form=e.currentTarget;
 try{
  const arquivo=form.elements.imagem.files[0];
  const descricao=form.elements.descricao.value.trim();
  const r=await fetch("api/site/midias",{method:"POST",credentials:"same-origin",headers:{"X-Portal":"1"},body:new FormData(form)});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.erro||"Falha no envio");
  const titulo=descricao||arquivo.name.replace(/\.[^.]+$/,"").replace(/[-_]+/g," ").trim()||"Imagem da Rodrinox Pro";
  const slugBase=titulo.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,120)||"imagem";
  const slug=slugBase+"-"+Date.now().toString(36);
  await api("site/itens",{method:"POST",body:{tipo:"galeria",slug,titulo,resumo:descricao,descricao,imagem_id:Number(data.id),ordem:0,status:"publicado"}});
  form.reset();await Promise.all([carregarMidias(),carregarItens("galeria")]);
  aviso("Imagem enviada e publicada automaticamente na galeria do site.");
 }catch(err){aviso("Falha no upload: "+err.message,true);}
});
(async()=>{
 try{
  const usuario=await api("eu");if(usuario.perfil!=="admin"){aviso("Acesso restrito ao administrador.",true);return;}
  await carregarConteudos();await carregarMidias();await garantirItensIniciais();await carregarHome();await carregarGrupos();
  await Promise.all([carregarItens("servico"),carregarItens("projeto"),carregarItens("galeria")]);
  aviso("Gerenciador conectado ao banco de produção. Novas alterações são publicadas automaticamente.");
 }catch(e){aviso(e.message,true);setTimeout(()=>location.href="index.html",1200);}
})();
