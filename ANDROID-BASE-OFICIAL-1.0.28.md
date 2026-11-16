# Rodrinox Pro — APK Android aprovado (bloqueio de regressão)

ÚNICA REFERÊNCIA DE DISTRIBUIÇÃO APROVADA: Android v1.0.28.
SHA-256 do APK aprovado: `8a750f9af03f46210e6a1bfdba93e79f004b94e56fd153de83f804cc94f17cdd`.

## Regras obrigatórias
- Não substituir o APK aprovado nem o download oficial por builds experimentais.
- Não usar branches de teste (incluindo `diagnostico-android-fcm-20261116` ou `android-base-aprovada-v1.0.28`) como fonte de verdade sem comparação binária/funcional com o APK aprovado.
- O nome da branch e a versão declarada em Gradle NÃO comprovam equivalência ao APK. O tag `android-v1.0.28` contém Gradle com versionName 1.0.0; a branch `android-base-aprovada-v1.0.28` contém 1.0.29.
- Toda nova versão de notificações deve ser criada em branch isolada e testada no celular, preservando visual, ícone, login, navegação e microfone.
- Publicação somente após validação explícita da versão candidata e assinatura compatível.
- Firebase/FCM: registro autenticado de token e envio do backend devem ser validados antes de anunciar notificações prontas.

Este arquivo é apenas um registro de segurança; não altera o APK nem o site.
