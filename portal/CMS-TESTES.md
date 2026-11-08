# Homologação do gerenciador de conteúdo — somente testes

Esta branch não deve ser conectada ao domínio institucional nem mesclada na main sem aprovação.

## Antes de iniciar
1. Fazer backup do banco de testes e confirmar que ele não é o banco de produção.
2. No aplicativo Node.js do subdomínio de testes, selecionar explicitamente a branch `feature/painel-administrativo` e raiz `portal/`.
3. Instalar dependências com `npm install` (não executar em produção).
4. Configurar `NODE_ENV=production`, `BASE_PATH=/colaborador`, `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` e `SITE_UPLOAD_DIR`. Não enviar credenciais ao GitHub.
5. Aplicar `portal/schema.sql` somente se for banco novo; aplicar `portal/site-schema.sql` separadamente no banco de testes.
6. Iniciar com `npm start` e validar login e acesso de administrador.
7. Abrir `/colaborador/site-admin.html` e conferir as abas: Página inicial, A empresa, Serviços, Projetos, Galeria, Contato, Cabeçalho e rodapé e Imagens.

## Testes funcionais
- Editar os três banners da página inicial, incluindo imagem, chamada, título e descrição; salvar e recarregar.
- Editar história, apresentação, missão, visão e valores da empresa.
- Editar os dados de contato e os campos de identidade do cabeçalho/rodapé.
- Criar, editar e excluir um serviço, um projeto e uma entrada da galeria.
- Enviar JPG, PNG e WebP válidos de até 5 MB; confirmar listagem, prévia e vínculo com banner/itens.
- Tentar excluir uma imagem vinculada a um banner ou item; a API deve impedir a exclusão até a substituição.
- Testar usuário não autorizado, upload inválido, arquivo acima do limite e rotas existentes do Portal.
- Executar `npm test`.

## Limitações desta etapa
- Os dados continuam sendo salvos como rascunho no banco de testes.
- O site institucional ainda não lê estes rascunhos; a integração de leitura/publicação será uma etapa separada, com aprovação antes de qualquer publicação.
- A biblioteca de mídias exige login e não oferece URLs públicas.
- Não há versionamento de conteúdos nem fluxo formal de aprovação.
- Validar o comportamento na Hostinger e manter backup dos arquivos de upload em `SITE_UPLOAD_DIR`.
- Não conectar esta branch a deploy automático do domínio principal.
