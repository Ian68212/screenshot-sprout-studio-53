# Recuperação fiel da WebView — APK oficial 1.0.28

Fonte: extração direta do arquivo classes2.dex do APK oficial
SHA-256 do APK: 8a750f9af03f46210e6a1bfdba93e79f004b94e56fd153de83f804cc94f17cdd

O script original de injeção foi recuperado para:
- restaurar o CSS específico do modo aplicativo (body[data-view="app"]);
- restaurar o comportamento da tela de login em tela cheia;
- aplicar a logo embarcada no APK pelo placeholder __RODRINOX_APP_LOGO_DATA__;
- observar alterações do DOM para reaplicar a logo;
- carregar a imagem de fábrica configurada no CMS.

O placeholder __RODRINOX_APP_LOGO_DATA__ precisa ser substituído pela data URL da imagem original extraída de assets/rod-logo-vertical.png do mesmo APK oficial.

ATENÇÃO:
- Este arquivo é material de recuperação, não é ainda uma compilação validada.
- Não copiar fontes de outras versões.
- Não alterar portal/public/portal.css nem outros estilos globais como parte da integração push.
- A recuperação do script, logo e ponto exato de injeção em MainActivity deve ser revisada contra o APK original antes de gerar novo APK.
