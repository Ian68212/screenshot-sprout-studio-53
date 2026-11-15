# Rodrinox Pro Android — histórico, decisões e controle de versões

Atualizado em 2026-11-15. Este documento é a referência técnica persistente para continuidade do aplicativo, sem depender do histórico de conversas. Conferir sempre o código, os commits, os artefatos e os testes antes de marcar uma funcionalidade como concluída.

## Fontes oficiais
- Repositório principal: `Ian68212/screenshot-sprout-studio-53`.
- Repositório relacionado informado pelo proprietário: `Ian68212/rodrinox-pro-site` (validar responsabilidades antes de alterar).
- Portal do Colaborador: `https://www.rodrinoxpro.com.br/colaborador/oficial/`.
- Painel administrativo: `https://www.rodrinoxpro.com.br/colaborador/painel/oficial/`.
- Android: `android-app/` — WebView do portal, com base Java.
- Download atual: `https://github.com/Ian68212/screenshot-sprout-studio-53/releases/latest/download/Rodrinox-Pro-Android.apk` (ATENÇÃO: latest pode apontar para versão anterior; não presumir que corresponde ao código).

## Linha do tempo verificada
- Versões antigas: existem releases e builds anteriores; consultar histórico do GitHub. Não inventar recursos ou datas sem inspecionar cada versão.
- 1.0.2: `versionCode 3`; código com permissão `RECORD_AUDIO`, tratamento de `WebChromeClient.onPermissionRequest` para origem HTTPS confiável e pedido de permissão em tempo de execução. A publicação automática estava habilitada.
- 1.0.3: `versionCode 4`; adicionado `POST_NOTIFICATIONS` e pedido de permissão em Android 13+. Isso NÃO equivale a push remoto, entrega em background nem chamadas de entrada.
- Correção do login em 2026-11-15: CSS do modo app em `portal/public/index.html` alterado para impedir a sobreposição dos placeholders sobre textos já desenhados na imagem de fundo. Necessita teste visual real.
- 1.0.5: versão de trabalho solicitada pelo proprietário. NÃO declarar homologada, publicada ou com push/chamadas funcionais sem evidência de build, testes e integração de servidor.

## Regressões relatadas e critérios de aceite
1. **Ícone**: preservar o ícone aprovado anteriormente; comparar assets e APKs de releases históricos antes de substituir; não redesenhar.
2. **Login**: eliminar textos duplicados de e-mail e senha; testar teclado aberto/fechado, foco, visibilidade dos campos e preenchimento; não alterar marca e foto aprovadas.
3. **Microfone**: garantir permissão Android + WebView; testar gravação e envio de áudio em chat interno e central WhatsApp em aparelho físico. A mensagem 'Não foi possível acessar o microfone' é um bug ainda não comprovadamente resolvido.
4. **Chat interno**: receber mensagens em primeiro/segundo plano, notificação sonora, abrir conversa correta, e funcionalidades solicitadas de editar/excluir mensagens conforme regras de autorização.
5. **Central WhatsApp**: avisar somente atendente(s) responsável(is), refletir transferências, evitar duplicidade e abrir o atendimento correto.
6. **Chamadas internas**: toque de chamada recebida, identificação, atender/recusar, cancelamento, permissões, experiência com app fechado/tela bloqueada; considerar requisitos Android para notificação de chamada e foreground service.
7. **Segurança**: tokens de dispositivos vinculados ao usuário autenticado, revogação no logout, evitar conteúdo sensível na tela bloqueada, validação de remetente e destinatário no servidor.

## Pendências técnicas bloqueantes para notificações equivalentes ao WhatsApp
- Criar/configurar projeto Firebase controlado pela Rodrinox Pro e registrar o aplicativo Android; configurar `google-services.json` público do cliente e credenciais privadas de servidor SOMENTE em secrets do ambiente, nunca no repositório.
- Integrar Firebase Cloud Messaging ao APK (dependências Gradle, serviço `FirebaseMessagingService`, registro/renovação do token, canais Android, solicitação de permissão, tratamento de toque na notificação).
- Criar endpoints autenticados para vincular/remover tokens de dispositivo e integrar envio FCM aos eventos reais de mensagens de chat, central WhatsApp e sinalização de chamadas.
- Implementar/validar a sinalização e a mídia de chamadas; push sozinho não implementa telefonia.
- Verificar assinatura de produção, package name e atualização entre versões. O build atual usa `assembleDebug`, `applicationIdSuffix ".teste"` e `versionNameSuffix "-teste"`, portanto não é um APK de produção assinado e pode exigir reinstalação.
- Homologar em dois celulares reais: aplicativo aberto, segundo plano, fechado, tela bloqueada, conexão intermitente, notificações desativadas, microfone permitido/negado.

## Política de release
- `main` pode compilar artefato de teste, mas NÃO deve publicar automaticamente um APK não homologado como 'latest'.
- Publicação pública depende de aprovação explícita no workflow e evidência de testes; a versão exibida no site deve corresponder ao APK realmente publicado.
- Não usar `latest` como evidência de versão; verificar nome, versionCode/versionName, SHA e asset.
- Manter changelog por release com recursos concluídos, limitações e instruções de instalação.
