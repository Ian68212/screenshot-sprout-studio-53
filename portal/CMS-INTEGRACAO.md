# Integração do CMS do site institucional

## Estado desta etapa

- O portal mantém a API administrativa em `/colaborador/api/site` (sessão e permissão de administrador).
- O site institucional consome somente leitura em `/colaborador/api/public/site`.
- A API pública retorna apenas itens e conteúdos com status `publicado`.
- Imagens são servidas pela API pública somente quando vinculadas a item/conteúdo publicado.
- O site mantém os conteúdos locais como fallback se a API estiver indisponível.
- O gerenciador salva alterações como rascunho. A publicação é uma ação separada e explícita.

## Variáveis de ambiente do portal

Configure no ambiente Node.js do portal, sem colocar senhas no repositório:

- `SITE_UPLOAD_DIR`: diretório permanente da biblioteca de imagens.
- `SITE_PUBLIC_ORIGIN`: origem exata do site institucional, por exemplo `https://rodrinoxpro.com.br`.

## Variável de build do site

Configure antes de gerar o build do site:

- `VITE_SITE_CMS_API`: URL completa até o endpoint público, por exemplo `https://teste.rodrinoxpro.com.br/colaborador/api/public/site`.

Se portal e site estiverem na mesma origem, o padrão `/colaborador/api/public/site` pode ser usado.

## Testes antes da publicação

1. Confirmar que a aplicação Node.js do portal está usando esta versão do código.
2. Abrir o endpoint público e confirmar resposta JSON com `itens` e `conteudos`.
3. Confirmar que conteúdo em rascunho não aparece no endpoint público.
4. Criar um rascunho no gerenciador, revisar e usar “Publicar todos os rascunhos”.
5. Confirmar que banners, serviços, projetos e galeria são exibidos no site.
6. Testar imagens no domínio do site e verificar ausência de erros CORS.
7. Não mesclar na `main` nem publicar em produção sem autorização expressa.

## Observação

A API pública não altera nem grava conteúdo. Toda edição exige sessão e permissão no portal. O site institucional apenas consulta o conteúdo aprovado.
