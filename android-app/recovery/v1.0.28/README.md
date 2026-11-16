# Recuperação WebView — material candidato, ainda não aprovado

Base de comparação: release `android-v1.0.28`, APK `Rodrinox-Pro-Android.apk`.
APK oficial preservado; nenhuma alteração foi feita no release original.

## Conteúdo
- `webview-injection-candidate.js`: script de CSS/JS que tenta aplicar uma apresentação específica de login dentro da WebView.
- O script ainda contém o placeholder `__RODRINOX_APP_LOGO_DATA__`; a imagem real não está embutida.
- O script depende de seletores HTML específicos (`#f`, `.browser-shell`, `.login-panel`, `.brand-lockup`) e do atributo `body[data-view="app"]`. Esses elementos precisam ser comparados com o HTML real servido pelo portal.

## Importante
Este script **não foi comprovado como extraído do APK oficial 1.0.28** e não foi integrado ao `MainActivity.java`. Ele altera deliberadamente CSS e posicionamento da tela, portanto pode causar justamente sobreposição ou redução de elementos se os seletores/estrutura não corresponderem ao portal atual.

Não incorporar ao APK nem ao portal de produção até:
1. confirmar a origem do script;
2. comparar seletores com o HTML real da tela de login;
3. extrair e validar a logo original;
4. testar a tela em viewport de celular e comparar com capturas da 1.0.28.


## Nova verificação da fonte do portal (release android-v1.0.28)

Foi inspecionado `portal/public/index.html` no próprio ref `android-v1.0.28`. Ele já contém regras CSS específicas para `body[data-view="app"]`, incluindo a composição vertical do login e ajustes responsivos. Também existe `portal/public/login-visual.js`, que explicitamente só atua quando `document.body.dataset.view === "browser"` e declara que o aplicativo instalado mantém a arte original.

Conclusão: o arquivo `webview-injection-candidate.js` acima NÃO deve ser integrado. Ele injeta novas regras CSS com vários `!important`, define posições/tamanhos diferentes, pressupõe `body[data-view="app"]` e usa placeholder de logo. Isso pode sobrescrever as regras já existentes no HTML e produzir o sintoma relatado (elementos reduzidos/sobrepostos).

A fonte do portal já contém a apresentação específica do app. Para o trabalho FCM, manter `index.html`, `login-visual.js`, `login.js` e CSS de login sem alterações. A integração push deve ficar no Android/servidor, sem injetar CSS/JS de apresentação.
