# Diagnóstico de notificações — Rodrinox Pro

Escopo: somente backend; NÃO modificar APK, MainActivity, ícones, login, layout ou releases.

Confirmado por inspeção do código em main:
- `portal/src/push-notificacoes.js`: `POST /registrar`, `GET /status`, envio por FCM HTTP v1.
- `portal/src/chat-interno.js`: importa `enviarPushSemBloquear`.
- `portal/src/server.js`: importa o roteador push.
- `android-app/app/src/main/java/br/com/rodrinoxpro/portal/MainActivity.java` na main possui registro de token por WebView, mas isso NÃO prova que o APK oficial v1.0.28 contenha tal código.

Bloqueios a verificar antes de ativar em produção:
1. APK oficial v1.0.28 deve continuar intacto (SHA-256: `8a750f9af03f46210e6a1bfdba93e79f004b94e56fd153de83f804cc94f17cdd`).
2. Diagnóstico autenticado de `/colaborador/api/push/status` precisa indicar dispositivo registrado.
3. Backend Hostinger precisa de credenciais seguras para enviar FCM; o serviço Cloud Run separado já está criado, mas o backend atual envia diretamente à API FCM.
4. Teste real de notificação e de chamada recebida requer confirmar o fluxo de chamadas no código; push de mensagem não equivale a chamada de voz.
5. Não publicar APK de teste nem trocar o download oficial sem aprovação explícita.

Nenhuma mudança de comportamento é feita nesta branch pelo presente documento.
