# Portal do Colaborador — Rodrinox Pro (Node.js + MySQL na Hostinger)

Aplicação separada do site institucional. Nada nesta pasta altera as páginas públicas.

## 1. Ambiente de testes (faça antes da produção)
1. hPanel → **Domínios → Subdomínios**: crie `teste.rodrinoxpro.com.br`.
2. hPanel → **Bancos de dados MySQL**: crie um banco só para testes (ex.: `u000_portal_teste`) com usuário próprio.
3. hPanel → **Sites → Adicionar site → Aplicativo Node.js** no subdomínio de teste, conectando este repositório do GitHub.
   - Diretório raiz: `portal` · Node.js: **22** · Comando de instalação: `npm install` · Comando de início: `npm start`
4. Cadastre as variáveis do arquivo `.env.example` no painel Node.js (nunca envie senhas ao GitHub).
5. Pelo terminal SSH, dentro de `portal/`: `npm run db:init` e depois
   `npm run admin:create -- "Seu Nome" seu@email.com "SenhaForte2026"`.
6. Acesse `https://teste.rodrinoxpro.com.br/colaborador/` e teste login, cadastro e permissões.

## 2. Produção
Somente depois dos testes: repita os passos com um **banco novo de produção** e aponte o app para `rodrinoxpro.com.br/colaborador`.

## Segurança incluída
- Senhas com bcrypt (custo 12); mínimo 10 caracteres com letras e números.
- Sessão em cookie `HttpOnly`, `SameSite=Strict`, `Secure` em produção, guardada com hash no MySQL e expiração de 8 h.
- Bloqueio de 15 min após 5 tentativas erradas + limite de requisições no login.
- Proteção contra envio de formulários de outros sites (cabeçalho obrigatório) e cabeçalhos de segurança (helmet).
- Cadastro de usuários exclusivo do perfil **admin**; desativar ou trocar senha encerra as sessões do colaborador.
- Ferramentas ficam ocultas até o administrador liberar por setor, cargo ou perfil.
- Registro de auditoria de logins e alterações; páginas marcadas como `noindex`.

## Testes
`npm test` — regras de permissão e senha.
