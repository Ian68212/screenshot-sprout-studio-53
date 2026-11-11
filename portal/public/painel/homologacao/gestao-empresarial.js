"use strict";
/* Módulo visual isolado; sem chamadas à API do Bling nem dados simulados. */
window.renderGestaoEmpresarial=function(perfil){
  if(perfil!=="admin"){
    return '<section class="ge-wrap ge-restricted"><h3>Acesso restrito</h3><p>A Gestão Empresarial está em preparação. O painel administrativo está disponível somente para administradores autorizados. Nenhuma informação do Bling é exibida nesta etapa.</p></section>';
  }
  return '<div class="ge-wrap">'+
    '<header class="ge-heading"><div><span class="ge-eyebrow">Rodrinox Pro · Portal do Colaborador</span><h3>Visão geral da empresa</h3><p>Um único espaço para acompanhar a operação, integrado futuramente ao Bling.</p></div><span class="ge-status">● Integração pendente</span></header>'+
    '<div class="ge-layout">'+
      '<article class="ge-tile"><span class="ge-icon">▦</span><h4>Pedidos de venda</h4><p>Dados aguardando conexão com o Bling</p></article>'+
      '<article class="ge-tile"><span class="ge-icon">▤</span><h4>Ordens de produção</h4><p>Dados aguardando conexão com o Bling</p></article>'+
      '<article class="ge-tile"><span class="ge-icon">▣</span><h4>Estoque e produtos</h4><p>Dados aguardando conexão com o Bling</p></article>'+
      '<article class="ge-tile"><span class="ge-icon">◷</span><h4>Financeiro</h4><p>Exibição sujeita a permissões específicas</p></article>'+
    '</div>'+
    '<div class="ge-section"><section class="ge-panel"><h4>Atividade operacional</h4><div class="ge-placeholder"><strong>Nenhum dado carregado</strong>Os indicadores serão exibidos após a autorização OAuth 2.0 e a validação da integração de leitura.</div></section>'+
    '<section class="ge-panel"><h4>Próximas etapas</h4><ol class="ge-steps"><li><span>1</span><div>Registrar aplicativo na plataforma de desenvolvedores do Bling</div></li><li><span>2</span><div>Conectar a conta por OAuth 2.0 no servidor</div></li><li><span>3</span><div>Validar permissões e dados reais de leitura</div></li></ol></section></div>'+
    '<div class="ge-notice">Ambiente de homologação: nenhuma movimentação financeira, alteração de estoque ou criação de pedidos é realizada nesta tela.</div>'+
  '</div>';
};
