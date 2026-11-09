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
