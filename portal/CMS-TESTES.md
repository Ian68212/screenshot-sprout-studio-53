# Homologação do gerenciador de conteúdo — somente testes

Esta branch não deve ser conectada ao domínio institucional nem mesclada na main sem aprovação.

## Antes de iniciar
1. Fazer backup do banco de testes e confirmar que ele não é o banco de produção.
2. No aplicativo Node.js do subdomínio de testes, selecionar explicitamente a branch feature/painel-administrativo e raiz portal/.
3. Instalar dependências com npm install (não executar em produção).
4. Configurar NODE_ENV=production, BASE_PATH=/colaborador, DB_HOST, DB_NAME, DB_USER, DB_PASSWORD e SITE_UPLOAD_DIR. Não enviar credenciais ao GitHub.
5. Aplicar portal/schema.sql somente se for banco novo; aplicar portal/site-schema.sql separadamente no banco de testes.
6. Iniciar com npm start e validar login e acesso de administrador.
7. Abrir /colaborador/site-admin.html. Criar um rascunho, fazer upload JPG/PNG/WebP válido de até 5 MB, verificar listagem e imagem privada.
8. Testar usuário não autorizado, upload inválido, arquivo grande, rotas existentes do Portal e os comandos npm test.
9. Fazer backup dos arquivos de upload; a pasta SITE_UPLOAD_DIR deve persistir entre implantações.

## Limitações atuais
- Nenhum conteúdo é publicado ou lido pelo site institucional.
- A biblioteca de mídias exige login e não oferece URLs públicas.
- Não há versionamento de conteúdos nem fluxo de aprovação completo.
- O código ainda precisa de testes de integração, revisão de segurança e validação na Hostinger.
- Não conectar esta branch a deploy automático do domínio principal.
