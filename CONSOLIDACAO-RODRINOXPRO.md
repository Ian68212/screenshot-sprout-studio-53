# Consolidação do ambiente Rodrinox Pro

## Objetivo
Concentrar o site institucional e o Portal do Colaborador sob o domínio `rodrinoxpro.com.br`, mantendo o portal em uma rota interna (por exemplo, `/colaborador`) e uma única aplicação Node.js responsável por atender o domínio.

## Estado identificado no repositório
- O site institucional na raiz usa React, TanStack Start e Nitro.
- O Portal do Colaborador está em `portal/`, com servidor Express próprio, dependências próprias e configuração de banco via `portal/.env`.
- O CMS do site consulta atualmente `/colaborador/api/public/site` por padrão.
- O portal ainda contém documentação de implantação separada em subdomínio.
- Os arquivos SQL do portal e do CMS são separados. O esquema de candidaturas teve divergências entre versões (por exemplo, `arquivo_path` versus `arquivo_caminho`, e presença/ausência de `cargo_pretendido` e `consent_at`).

## Estratégia de consolidação
1. Preservar este trabalho em branch isolada; não publicar diretamente em `main`.
2. Fazer inventário somente de leitura do banco de produção e comparar tabelas/colunas com o código.
3. Fazer backup do banco e dos arquivos enviados (currículos e mídias) antes de qualquer migração.
4. Definir uma única aplicação Node compatível com o runtime da Hostinger para servir o site e as rotas do portal no mesmo host. Não basta trocar URLs nem apontar duas aplicações para o mesmo banco.
5. Unificar a configuração de banco e armazenamento em variáveis de ambiente, mantendo os arquivos privados fora da pasta pública.
6. Corrigir os contratos de API e o esquema SQL; validar login, permissões, CMS, upload/visualização de mídias, candidaturas e download de currículos.
7. Implantar no domínio principal somente após build e testes; manter os subdomínios e bancos antigos intactos até a validação final.
8. Desativar os ambientes antigos somente após confirmação de funcionamento e cópia de segurança.

## Diagnóstico de banco
Na pasta `portal/`, executar:
```bash
npm run db:check
```
O comando consulta apenas `INFORMATION_SCHEMA`; não cria, altera nem exclui dados. O resultado deve ser revisado antes de preparar qualquer migração.

## Limites desta etapa
Nenhum banco, domínio, variável da Hostinger ou site foi alterado por este trabalho. A branch é de preparação e integração; a publicação e a desativação dos ambientes antigos ficam para depois dos testes.
