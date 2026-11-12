# Configuração do E-mail Corporativo

## Hostinger Email (não Titan)
O módulo utiliza IMAP e SMTP padrão da Hostinger:
- IMAP: `imap.hostinger.com`, porta `993`, SSL
- SMTP: `smtp.hostinger.com`, porta `465`, SSL
- Usuário: endereço completo da caixa
- Senha: senha específica da caixa postal

Confirme os dados em hPanel → E-mails → Gerenciar → Conectar aplicativos e dispositivos → Configuração manual. Se o plano mostrar servidores diferentes (por exemplo, Titan), não use os padrões acima: atualize os hosts conforme o hPanel.

## Variáveis de ambiente obrigatórias

Configure no ambiente Node.js do portal (Hostinger hPanel → Node.js → Variáveis de ambiente):

```env
EMAIL_IMAP_HOST=imap.hostinger.com
EMAIL_IMAP_PORT=993
EMAIL_SMTP_HOST=smtp.hostinger.com
EMAIL_SMTP_PORT=465
EMAIL_CREDENTIALS_KEY=<BASE64_DE_32_BYTES_ALEATORIOS>
```

Gere a chave fora do repositório com:

```bash
openssl rand -base64 32
```

Cole o resultado diretamente no gerenciador de variáveis de ambiente do hPanel. **Nunca** grave a chave no GitHub, no frontend, em arquivo público, nem envie em conversas. A chave é necessária para criptografar/descriptografar senhas das caixas com AES-256-GCM. Se a chave for perdida ou trocada, as credenciais já armazenadas precisarão ser cadastradas novamente.

## Configuração de cada caixa
1. Entre no portal usando a conta correspondente.
2. Abra E-mail Corporativo e selecione Conectar caixa.
3. Digite a senha daquela caixa postal (não a senha do hPanel).
4. O servidor testa autenticação IMAP antes de guardar a senha criptografada.
5. Caixas compartilhadas devem ser conectadas por administrador; os colaboradores recebem somente as permissões concedidas.

## Estado funcional desta entrega
- Inclui conexão IMAP/SMTP, pastas, listagem, leitura, marcação de mensagens, envio com editor formatado, anexos no envio e download de anexos recebidos.
- Inclui favoritos, mover mensagens para a Lixeira e indicador de mensagens não lidas no portal (consulta periódica, não push em tempo real).
- O conteúdo de e-mails é apresentado em texto simples nesta versão; filtros, contatos e pesquisa no conteúdo integral ficam para evolução posterior.
- Configure a chave e os hosts no ambiente Node.js antes de conectar a primeira caixa.
