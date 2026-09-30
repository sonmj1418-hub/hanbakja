package app.hanbakja.shorts;

import android.annotation.SuppressLint;
import android.graphics.Outline;
import android.graphics.PixelFormat;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewOutlineProvider;
import android.view.WindowManager;
import android.content.Context;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Card over the current screen. YouTube stays where it is; this view does not
 * start an activity or press Home.
 */
final class ShortsPopup {
    interface ChoiceListener {
        void onChoice(String outcome);
    }

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private FrameLayout root;
    private WebView webView;
    private boolean showing;
    private boolean chosen;

    boolean isShowing() {
        return showing;
    }

    @SuppressLint("SetJavaScriptEnabled")
    boolean show(Context context, ChoiceListener listener) {
        if (showing) return true;
        WindowManager windows = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        if (windows == null) return false;

        webView = new WebView(context);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        webView.setBackgroundColor(0xFFF4EFE4);
        webView.addJavascriptInterface(new OverlayBridge(listener), "AndroidOverlay");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetResponse(context, request);
            }
        });

        int width = context.getResources().getDisplayMetrics().widthPixels;
        int height = context.getResources().getDisplayMetrics().heightPixels;
        int marginH = Math.max(24, (int) (width * 0.05f));
        int marginV = Math.max(48, (int) (height * 0.1f));

        root = new FrameLayout(context);
        root.setBackgroundColor(0x99000000);
        root.setClickable(true);
        FrameLayout.LayoutParams card = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        card.setMargins(marginH, marginV, marginH, marginV);
        webView.setClipToOutline(true);
        webView.setOutlineProvider(new ViewOutlineProvider() {
            @Override
            public void getOutline(View view, Outline outline) {
                float radius = 28f * view.getResources().getDisplayMetrics().density;
                outline.setRoundRect(0, 0, view.getWidth(), view.getHeight(), radius);
            }
        });
        root.addView(webView, card);

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                | WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.CENTER;
        params.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;
        try {
            windows.addView(root, params);
        } catch (RuntimeException ignored) {
            webView.destroy();
            webView = null;
            root = null;
            return false;
        }
        showing = true;
        chosen = false;
        webView.loadUrl("https://localhost/watch/?guard=youtube");
        return true;
    }

    void dismiss(Context context) {
        if (!showing && root == null) return;
        showing = false;
        WindowManager windows = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        if (windows != null && root != null) {
            try {
                windows.removeView(root);
            } catch (RuntimeException ignored) {
                // Already detached.
            }
        }
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.destroy();
            webView = null;
        }
        root = null;
    }

    private void choose(ChoiceListener listener, String outcome) {
        if (chosen) return;
        chosen = true;
        String safe = "watch".equals(outcome) || "block".equals(outcome) ? outcome : "leave";
        mainHandler.post(() -> listener.onChoice(safe));
    }

    private final class OverlayBridge {
        private final ChoiceListener listener;

        OverlayBridge(ChoiceListener listener) {
            this.listener = listener;
        }

        @JavascriptInterface
        public void finish(String outcome) {
            choose(listener, outcome);
        }
    }

    private static WebResourceResponse assetResponse(Context context, WebResourceRequest request) {
        if (request == null || request.getUrl() == null) return null;
        if (!"https".equals(request.getUrl().getScheme())) return null;
        if (!"localhost".equals(request.getUrl().getHost())) return null;
        String path = request.getUrl().getPath();
        if (path == null || path.isEmpty()) path = "/index.html";
        String relative = path.startsWith("/") ? path.substring(1) : path;
        if (relative.contains("..")) return null;
        if (relative.isEmpty() || relative.endsWith("/")) relative = relative + "index.html";
        else if (!relative.contains(".")) relative = relative + "/index.html";
        String asset = "public/" + relative;
        try {
            InputStream input = context.getAssets().open(asset);
            if (relative.endsWith(".html")) {
                byte[] bytes = readBytes(input);
                String html = new String(bytes, StandardCharsets.UTF_8);
                String script = "<script>window.__HANBAKJA_OVERLAY__='youtube';</script>";
                int head = html.indexOf("<head>");
                if (head >= 0) {
                    html = html.substring(0, head + 6) + script + html.substring(head + 6);
                } else {
                    html = script + html;
                }
                return new WebResourceResponse(
                    "text/html",
                    "utf-8",
                    new ByteArrayInputStream(html.getBytes(StandardCharsets.UTF_8))
                );
            }
            return new WebResourceResponse(mime(relative), utf8(relative) ? "utf-8" : null, input);
        } catch (IOException ignored) {
            return null;
        }
    }

    private static byte[] readBytes(InputStream input) throws IOException {
        try (InputStream in = input; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = in.read(buffer)) != -1) out.write(buffer, 0, count);
            return out.toByteArray();
        }
    }

    private static boolean utf8(String path) {
        return path.endsWith(".js") || path.endsWith(".css") || path.endsWith(".json")
            || path.endsWith(".webmanifest") || path.endsWith(".svg") || path.endsWith(".txt");
    }

    private static String mime(String path) {
        if (path.endsWith(".js")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".webmanifest")) return "application/manifest+json";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".woff")) return "font/woff";
        if (path.endsWith(".txt")) return "text/plain";
        if (path.endsWith(".ico")) return "image/x-icon";
        return "application/octet-stream";
    }
}
