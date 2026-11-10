# Homologação — Portal do Colaborador Rodrinox Pro

## Decisões aprovadas em 10/11/2026
- Branch isolada: `homologacao/portal-colaborador-v2`.
- Produção permanece na branch `main` até aprovação expressa.
- Novo layout deve seguir a imagem de referência do dashboard industrial azul-marinho, com menu lateral, banner, quatro cartões, comunicados, treinamentos e atalhos.
- Homologação consulta dados reais existentes em **modo somente leitura**.
- Nenhum teste pode criar, editar, excluir ou alterar registros de produção.
- Administrador e gerenciador de site devem continuar acessíveis no portal oficial e após a migração.
- Testes no computador e em Android/iPhone; validar permissões por setor, cargo e perfil.
- Teste com usuário de menor privilégio, sem credenciais reais registradas neste arquivo.
- Publicação somente após validação visual, funcional, responsiva e autorização expressa.

## Cuidados técnicos obrigatórios
1. Separar arquivos/rotas de homologação da produção. Nunca substituir `painel.html` em `main` durante os testes.
2. Garantir somente leitura **no servidor**, não apenas ocultando botões; bloquear POST, PUT, PATCH e DELETE e qualquer endpoint que modifique estado na área de homologação.
3. Não permitir que usuários de teste consultem dados além das permissões de seus perfis. Evitar que o ambiente de homologação exponha dados reais publicamente.
4. Verificar caminhos absolutos de CSS/JS/imagens e autenticação para evitar a falha de estilo da tentativa anterior.
5. Testar acessos de Administração e Gerenciar Site, navegação, logout, listagens, links e layout responsivo.
6. Não publicar dados de demonstração como comunicados ou treinamentos reais.
7. Antes da migração, registrar ponto de retorno e verificar logs de implantação.

## Histórico de incidente
- Tentativa anterior de redesenho direto na `main` apresentou CSS ausente, navegação desformatada e links administrativos indisponíveis.
- Foi revertida para a versão anterior em commits concluindo em `76396c9b638f5e1ef085d009dc7ee6c75282dbb1`.
- Não repetir implantação direta sem testes.

## Estado atual
- Branch de homologação criada.
- Escopo e política de dados aprovados.
- Interface de homologação e proteção somente leitura ainda precisam ser implementadas e testadas.
- Nenhum ambiente de homologação foi publicado ou validado até aqui.

## Próximos passos
1. Inspecionar frontend, API, autorização e deploy atuais.
2. Criar página isolada de homologação e proteção de leitura no backend.
3. Implementar layout fiel à referência com dados reais permitidos.
4. Executar testes técnicos e fornecer endereço de homologação.
5. Coletar aprovação antes de atualizar a produção.
