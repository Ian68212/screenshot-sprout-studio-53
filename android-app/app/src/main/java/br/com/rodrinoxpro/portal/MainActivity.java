package br.com.rodrinoxpro.portal;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends Activity {
    private static final String PORTAL_URL = "https://rodrinoxpro.com.br/colaborador/";
    private static final int FILE_CHOOSER_REQUEST = 7102;
    private static final long LOAD_TIMEOUT_MS = 25000L;

    private FrameLayout root;
    private WebView webView;
    private View messageView;
    private ProgressBar progress;
    private ValueCallback<Uri[]> filePathCallback;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable loadTimeout = () -> showMessage(
        "O portal demorou para responder. Verifique sua conexão e tente novamente.",
        "Tentar novamente"
    );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        root = new FrameLayout(this);
        setContentView(root);
        hideSystemBars();
        createAndLoadWebView();
    }

    private void createAndLoadWebView() {
        try {
            if (webView != null) {
                root.removeView(webView);
                webView.destroy();
            }
            if (messageView != null) {
                root.removeView(messageView);
                messageView = null;
            }
            webView = new WebView(this);
            root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            ));

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setLoadsImagesAutomatically(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(false);
            settings.setSupportMultipleWindows(false);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(true);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setUserAgentString(settings.getUserAgentString() + " RodrinoxAndroid/1.0");

            CookieManager cookies = CookieManager.getInstance();
            cookies.setAcceptCookie(true);
            cookies.setAcceptThirdPartyCookies(webView, true);

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri uri = request.getUrl();
                    String scheme = uri.getScheme() == null ? "" : uri.getScheme();
                    String host = uri.getHost() == null ? "" : uri.getHost();
                    boolean internalHost = host.equals("rodrinoxpro.com.br")
                        || host.endsWith(".rodrinoxpro.com.br");
                    if (scheme.equals("https") && internalHost) return false;
                    if (scheme.equals("http") || scheme.equals("https")
                        || scheme.equals("mailto") || scheme.equals("tel")) {
                        try {
                            startActivity(new Intent(Intent.ACTION_VIEW, uri));
                        } catch (ActivityNotFoundException ignored) { }
                        return true;
                    }
                    return true;
                }

                @Override
                public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                    handler.removeCallbacks(loadTimeout);
                    handler.postDelayed(loadTimeout, LOAD_TIMEOUT_MS);
                }

                @Override
                public void onPageCommitVisible(WebView view, String url) {
                    handler.removeCallbacks(loadTimeout);
                    hideMessage();
                }

                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    if (url != null && url.startsWith(PORTAL_URL)) {
                        view.evaluateJavascript(appLoginScript(), null);
                    }
                }

                @Override
                public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                    if (request.isForMainFrame()) {
                        handler.removeCallbacks(loadTimeout);
                        showMessage("Não foi possível carregar o portal. Confira a internet e tente novamente.", "Tentar novamente");
                    }
                }

                @Override
                public void onReceivedHttpError(WebView view, WebResourceRequest request, android.webkit.WebResourceResponse response) {
                    if (request.isForMainFrame() && response.getStatusCode() >= 500) {
                        handler.removeCallbacks(loadTimeout);
                        showMessage("O servidor do portal respondeu com erro (" + response.getStatusCode() + "). Tente novamente mais tarde.", "Tentar novamente");
                    }
                }

                @Override
                public void onReceivedSslError(WebView view, SslErrorHandler sslHandler, SslError error) {
                    sslHandler.cancel();
                    handler.removeCallbacks(loadTimeout);
                    showMessage("Não foi possível validar a conexão segura com o portal. Atualize o Android System WebView e tente novamente.", "Tentar novamente");
                }

                @Override
                public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
                    handler.removeCallbacks(loadTimeout);
                    root.removeView(view);
                    view.destroy();
                    webView = null;
                    showMessage("O componente de navegação do Android foi encerrado. Toque para reiniciar o aplicativo.", "Reiniciar");
                    return true;
                }
            });

            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onProgressChanged(WebView view, int newProgress) {
                    if (progress != null) {
                        progress.setProgress(newProgress);
                        progress.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
                    }
                }

                @Override
                public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                    if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                    filePathCallback = callback;
                    try {
                        startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST);
                        return true;
                    } catch (Exception ex) {
                        filePathCallback = null;
                        Toast.makeText(MainActivity.this, "Não foi possível abrir os arquivos.", Toast.LENGTH_SHORT).show();
                        return false;
                    }
                }
            });

            webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (ActivityNotFoundException ignored) {
                    Toast.makeText(this, "Não há aplicativo disponível para abrir este arquivo.", Toast.LENGTH_SHORT).show();
                }
            });

            handler.removeCallbacks(loadTimeout);
            handler.postDelayed(loadTimeout, LOAD_TIMEOUT_MS);
            webView.loadUrl(PORTAL_URL);
        } catch (Throwable error) {
            showMessage("Falha ao iniciar o aplicativo: " + error.getClass().getSimpleName()
                + (error.getMessage() == null ? "" : " — " + error.getMessage()), "Tentar novamente");
        }
    }

    /*
     * A personalização é aplicada somente dentro do WebView do APK.
     * O HTML/CSS servido aos navegadores e o site institucional não são alterados.
     * As imagens são lidas das mídias públicas já configuradas no Gerenciador do Site.
     */
    private String readAppLogoDataUri() {
        try (InputStream input = getAssets().open("rod-logo-horizontal.png");
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
            }
            return "data:image/png;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
        } catch (Exception ignored) {
            return "";
        }
    }

    private String appLoginScript() {
        return """
            (() => {
              if (document.body.dataset.view !== 'app' || !document.getElementById('f')) return;
              if (document.getElementById('rod-app-native-style')) return;

              const appLogo = "__RODRINOX_APP_LOGO_DATA__";
              const applyAppLogo = () => {
                if (!appLogo || !appLogo.startsWith('data:image/')) return;
                document.querySelectorAll('#login-logo, .brand-full-logo, .brand-lockup img, .brand-logo img, img[data-brand-logo]').forEach(image => {
                  if (image instanceof HTMLImageElement) {
                    if (image.getAttribute('src') !== appLogo) image.setAttribute('src', appLogo);
                    image.hidden = false;
                  }
                });
              };
              applyAppLogo();
              new MutationObserver(applyAppLogo).observe(document.documentElement, {
                childList:true, subtree:true, attributes:true, attributeFilter:['src']
              });

              const style = document.createElement('style');
              style.id = 'rod-app-native-style';
              style.textContent = `
                html, body { width:100% !important; height:100% !important; min-height:100% !important; margin:0 !important; overflow:hidden !important; background:#03152d !important; }
                body[data-view="app"] { display:block !important; align-items:initial !important; justify-content:initial !important; }
                body[data-view="app"] .browser-shell {
                  position:fixed !important; inset:0 !important; display:block !important;
                  width:100vw !important; height:100dvh !important; min-height:0 !important;
                  max-height:none !important; max-width:none !important; aspect-ratio:auto !important;
                  overflow:hidden !important; background:#03152d !important; background-image:none !important;
                }
                body[data-view="app"] .browser-shell::before {
                  content:""; position:absolute; z-index:0; left:-2%; right:-2%; bottom:-2%;
                  height:43%; background-image:var(--rod-factory-image, none);
                  background-size:cover; background-position:center 52%; background-repeat:no-repeat;
                  filter:blur(3px) brightness(.58) saturate(1.08); transform:scale(1.045);
                }
                body[data-view="app"] .browser-shell::after {
                  content:""; position:absolute; z-index:0; inset:0;
                  background:linear-gradient(180deg,#03152d 0%,rgba(3,21,45,.99) 43%,rgba(3,21,45,.88) 60%,rgba(3,21,45,.12) 100%);
                  pointer-events:none;
                }
                body[data-view="app"] .hero-panel, body[data-view="app"] .welcome,
                body[data-view="app"] .back-link, body[data-view="app"] .benefits,
                body[data-view="app"] .footer, body[data-view="app"] .mobile-install { display:none !important; }
                body[data-view="app"] .login-panel {
                  position:absolute !important; z-index:2 !important; inset:0 !important;
                  display:flex !important; flex-direction:column !important; align-items:stretch !important;
                  justify-content:flex-start !important; width:100% !important; height:100% !important;
                  min-height:0 !important; padding:calc(env(safe-area-inset-top) + 4.5vh) 9.2vw calc(env(safe-area-inset-bottom) + 3vh) !important;
                  margin:0 !important; overflow:hidden !important; background:transparent !important;
                }
                body[data-view="app"] .brand-lockup {
                  display:flex !important; flex:0 0 auto !important; justify-content:center !important;
                  align-items:center !important; width:100% !important; height:18vh !important;
                  min-height:112px !important; max-height:180px !important; margin:0 0 4.2vh !important;
                }
                body[data-view="app"] .brand-lockup .brand-mark,
                body[data-view="app"] .brand-lockup .brand-copy { display:none !important; }
                body[data-view="app"] .brand-lockup .brand-full-logo {
                  display:block !important; visibility:visible !important; width:100% !important;
                  max-width:390px !important; height:100% !important; max-height:100% !important;
                  object-fit:contain !important; object-position:center !important;
                  filter:drop-shadow(0 5px 14px rgba(0,0,0,.2));
                }
                body[data-view="app"] .login-form {
                  position:relative !important; inset:auto !important; display:grid !important;
                  grid-template-columns:1fr !important; gap:14px !important; width:100% !important;
                  margin:0 !important; padding:0 !important;
                }
                body[data-view="app"] .field {
                  position:relative !important; inset:auto !important; display:block !important;
                  width:100% !important; height:58px !important; margin:0 !important;
                }
                body[data-view="app"] .field input {
                  position:absolute !important; inset:0 !important; width:100% !important; height:58px !important;
                  padding:0 52px 0 54px !important; border:1px solid rgba(0,157,216,.82) !important;
                  border-radius:19px !important; background:rgba(3,43,75,.86) !important;
                  color:#fff !important; font:500 15px/1.2 Inter,"Segoe UI",Arial,sans-serif !important;
                  box-shadow:inset 0 1px 10px rgba(0,0,0,.15),0 5px 18px rgba(0,0,0,.12) !important;
                }
                body[data-view="app"] .field input::placeholder { color:rgba(255,255,255,.68) !important; opacity:1 !important; }
                body[data-view="app"] .field input:focus { border-color:#35c4ff !important; background:rgba(4,52,87,.96) !important; }
                body[data-view="app"] .field-icon {
                  display:block !important; left:17px !important; width:23px !important; height:23px !important;
                  stroke:#f5fbff !important; z-index:2 !important;
                }
                body[data-view="app"] #toggle-password {
                  position:absolute !important; z-index:3 !important; top:72px !important;
                  right:7px !important; left:auto !important; width:44px !important; height:44px !important;
                  padding:10px !important; margin:0 !important; transform:none !important;
                  color:#fff !important; background:transparent !important;
                }
                body[data-view="app"] #toggle-password svg { width:22px !important; height:22px !important; }
                body[data-view="app"] .erro {
                  position:relative !important; inset:auto !important; width:100% !important;
                  min-height:0 !important; margin:0 !important; color:#ffd2c8 !important;
                  text-align:center !important; font-size:12px !important; text-shadow:0 1px 4px #001 !important;
                }
                body[data-view="app"] #submit {
                  position:relative !important; inset:auto !important; display:flex !important;
                  width:100% !important; height:58px !important; min-height:58px !important;
                  margin:2px 0 0 !important; padding:0 20px !important; border:0 !important;
                  border-radius:999px !important; background:linear-gradient(100deg,#ff7900,#f15b16) !important;
                  color:#fff !important; font-size:18px !important; font-weight:800 !important;
                  box-shadow:0 8px 22px rgba(242,91,15,.3) !important;
                }
                body[data-view="app"] #submit span {
                  position:static !important; width:auto !important; height:auto !important;
                  overflow:visible !important; clip:auto !important; color:#fff !important;
                  font-size:18px !important;
                }
                body[data-view="app"] #submit svg { display:none !important; }
                body[data-view="app"] #submit:disabled { opacity:.75 !important; }
                body[data-view="app"] #forgot-password {
                  position:relative !important; inset:auto !important; display:block !important;
                  width:100% !important; height:42px !important; margin:0 !important; padding:8px !important;
                  color:#fff !important; font-size:14px !important; text-decoration:none !important;
                  text-shadow:0 1px 5px #001 !important;
                }
                @media (max-height:700px) {
                  body[data-view="app"] .login-panel { padding-top:2.5vh !important; }
                  body[data-view="app"] .brand-lockup { height:15vh !important; min-height:82px !important; margin-bottom:2.5vh !important; }
                  body[data-view="app"] .field, body[data-view="app"] .field input { height:52px !important; }
                  body[data-view="app"] #toggle-password { top:64px !important; }
                  body[data-view="app"] .login-form { gap:10px !important; }
                }
              `;
              document.head.appendChild(style);

              fetch('/colaborador/api/public/site/', { credentials:'same-origin', cache:'no-store', headers:{'Accept':'application/json'} })
                .then(response => response.ok ? response.json() : null)
                .then(data => {
                  const item = (data?.conteudos || []).find(entry => entry.chave === 'pagina.login');
                  if (!item) return;
                  let config = {};
                  try { config = JSON.parse(item.corpo || '{}'); } catch (_) { return; }
                  const version = encodeURIComponent(item.atualizado_em || Date.now());
                  const photoId = Number(config.imagem_id);
                  const logoId = Number(config.logo_imagem_id);
                  if (Number.isSafeInteger(photoId) && photoId > 0) {
                    const photoUrl = '/colaborador/api/public/site/midias/' + photoId + '?v=' + version;
                    const image = new Image();
                    image.onload = () => document.documentElement.style.setProperty('--rod-factory-image', 'url("' + photoUrl + '")');
                    image.src = photoUrl;
                  }
                  if (Number.isSafeInteger(logoId) && logoId > 0) {
                    const logoUrl = '/colaborador/api/public/site/midias/' + logoId + '?v=' + version;
                    const logo = document.getElementById('login-logo');
                    if (logo) {
                      logo.onload = () => { logo.hidden = false; };
                      logo.src = logoUrl;
                      logo.hidden = false;
                    }
                  }
                })
                .catch(error => console.warn('Imagens do aplicativo Rodrinox Pro:', error));
            })();
            """.replace("__RODRINOX_APP_LOGO_DATA__", readAppLogoDataUri());
    }

    private void showMessage(String message, String buttonText) {
        if (isFinishing()) return;
        if (messageView != null) root.removeView(messageView);
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(40, 40, 40, 40);
        panel.setBackgroundColor(Color.rgb(3, 22, 45));

        TextView title = new TextView(this);
        title.setText("Rodrinox Pro");
        title.setTextColor(Color.WHITE);
        title.setTextSize(24);
        title.setGravity(Gravity.CENTER);
        panel.addView(title);

        TextView detail = new TextView(this);
        detail.setText(message);
        detail.setTextColor(Color.LTGRAY);
        detail.setTextSize(15);
        detail.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams detailParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        detailParams.topMargin = 24;
        panel.addView(detail, detailParams);

        Button retry = new Button(this);
        retry.setText(buttonText);
        retry.setOnClickListener(v -> {
            handler.removeCallbacks(loadTimeout);
            createAndLoadWebView();
        });
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        buttonParams.topMargin = 24;
        panel.addView(retry, buttonParams);

        messageView = panel;
        root.addView(messageView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
    }

    private void hideMessage() {
        if (messageView != null) {
            root.removeView(messageView);
            messageView = null;
        }
    }

    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && filePathCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideSystemBars();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(loadTimeout);
        if (filePathCallback != null) filePathCallback.onReceiveValue(null);
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
