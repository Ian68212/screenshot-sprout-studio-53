const CATS = { documentos:"Documentos", comunicados:"Comunicados", treinamentos:"Treinamentos", ferramentas:"Ferramentas" };
const byId = id => document.getElementById(id);
const categorias = {};
function recursoCard(i) {
 const href = String(i.url || "").trim();
 const safeUrl = /^https?:\/\//i.test(href) ? href : "#";
 const image = i.imagem_url ? '<img class="imagem-recurso" src="'+esc(i.imagem_url)+'" alt="">' : '<div class="imagem-recurso sem-imagem"><span>Rodrinox Pro</span></div>';
 return '<a class="card card-recurso" href="'+esc(safeUrl)+'" '+(safeUrl==="#"?'aria-disabled="true"':'target="_blank" rel="noopener noreferrer"')+'>'+image+'<div class="conteudo-recurso"><h3>'+esc(i.nome)+'</h3><p>'+esc(i.descricao||"")+'</p><span class="abrir-recurso">'+(safeUrl==="#"?"Link indisponível":"Abrir recurso ↗")+'</span></div></a>';
}
function listaRecente(items,cat) {
 if (!items.length) return '<p class="empty-state">Nenhum item disponível ainda.</p>';
 return items.slice(0,3).map(i=>'<button type="button" class="recent-row" data-view="'+cat+'"><span>▤</span><strong>'+esc(i.nome)+'</strong><span>→</span></button>').join("");
}
function mostrar(view) {
 const inicio=view==="inicio";
 byId("homeSections").hidden=!inicio;
 byId("categoryView").hidden=inicio||view==="aplicativos";
 byId("appsView").hidden=view!=="aplicativos";
 byId("inicio").hidden=!inicio;
 document.querySelectorAll(".dash-nav-link").forEach(a=>a.classList.toggle("active",a.dataset.view===view));
 if(!inicio&&view!=="aplicativos"){
  byId("categoryTitle").textContent=CATS[view]||({contatos:"Contatos",suporte:"Suporte / TI"}[view]||"Recursos");
  if(CATS[view]){
   const items=categorias[view]||[];
   byId("categoryContent").innerHTML=items.length?'<div class="grid">'+items.map(recursoCard).join("")+'</div>':'<p class="empty-state">Nenhum item disponível ainda.</p>';
  } else if(view==="contatos"){
   byId("categoryContent").innerHTML='<div class="dashboard-panel panel-content"><p>Para encontrar contatos internos, consulte a administração da empresa.</p></div>';
  } else {
   byId("categoryContent").innerHTML='<div class="dashboard-panel panel-content"><p>Para suporte técnico, entre em contato com a administração da Rodrinox Pro.</p></div>';
  }
 }
 if(window.innerWidth<=850)byId("sidebar").classList.remove("open");
 window.scrollTo({top:0,behavior:"smooth"});
}
document.addEventListener("click",e=>{
 const target=e.target.closest("[data-view]");
 if(!target)return;
 e.preventDefault();
 mostrar(target.dataset.view);
});
byId("toggleSidebar").addEventListener("click",()=>byId("sidebar").classList.toggle("open"));
(async()=>{
 try {
  const eu=await api("eu");
  const nome=String(eu.nome||"Colaborador");
  byId("primeiroNome").textContent=nome.split(" ")[0];
  byId("userTop").textContent=nome;
  byId("info").textContent=[eu.setor,eu.cargo,eu.perfil].filter(Boolean).join(" · ");
  if(eu.perfil==="admin"||eu.perfil==="gestor")byId("lnkAdmin").hidden=false;
  if(eu.perfil==="admin")byId("lnkSiteAdmin").hidden=false;
  const itens=await api("ferramentas");
  for(const cat of Object.keys(CATS))categorias[cat]=Array.isArray(itens)?itens.filter(i=>i.categoria===cat):[];
  byId("recentComunicados").innerHTML=listaRecente(categorias.comunicados,"comunicados");
  byId("featuredTreinamentos").innerHTML=listaRecente(categorias.treinamentos,"treinamentos");
 }catch(err){
  byId("recentComunicados").textContent="Não foi possível carregar os recursos.";
  byId("featuredTreinamentos").textContent="Tente atualizar a página.";
  console.error("Falha ao carregar painel:",err);
 }
 const androidLink=byId("abrirIsicAndroid"),iosLink=byId("abrirIsicIOS"),status=byId("statusIsic");
 const ua=navigator.userAgent||"";
 if(/Android/i.test(ua)){
  androidLink.href="intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.intelbras.isiclite;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.intelbras.isiclite;end";
  androidLink.textContent="Abrir aplicativo";
  iosLink.hidden=true;
  status.textContent="Android: tenta abrir o aplicativo instalado.";
 }else if(/iPhone|iPad|iPod/i.test(ua)){
  androidLink.hidden=true;
  status.textContent="iPhone: acesso à página oficial na App Store.";
 }else status.textContent="No celular, escolha o sistema correspondente.";
 const hash=location.hash.replace("#","");
 if(hash==="aplicativos"||CATS[hash])mostrar(hash);
})();
