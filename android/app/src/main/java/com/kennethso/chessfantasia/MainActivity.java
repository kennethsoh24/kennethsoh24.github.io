package com.kennethso.chessfantasia;

import android.app.Activity;
import android.content.res.AssetManager;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.InputStream;

// Chess Fantasia: the web game, bundled in assets/www and served to a WebView from a private https origin
// (so ES modules, fetch and storage behave exactly like on the website, fully offline).
public class MainActivity extends Activity {
    static final String ORIGIN = "https://appassets.androidplatform.net/";
    WebView web;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        w.addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
        web = new WebView(this);
        web.setBackgroundColor(0xFF07080A);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setTextZoom(100);
        final AssetManager am = getAssets();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, String url) {
                if (!url.startsWith(ORIGIN)) return null;   // anything else (none needed) goes to the network
                String path = url.substring(ORIGIN.length());
                int q = path.indexOf('?'); if (q >= 0) path = path.substring(0, q);
                int h = path.indexOf('#'); if (h >= 0) path = path.substring(0, h);
                if (path.length() == 0 || path.endsWith("/")) path += "index.html";
                try {
                    InputStream in = am.open("www/" + path);
                    WebResourceResponse r = new WebResourceResponse(mime(path), null, in);
                    return r;
                } catch (Exception e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null, null);
                }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) { return !url.startsWith(ORIGIN); }
        });
        setContentView(web);
        immersive();
        if (b != null) web.restoreState(b); else web.loadUrl(ORIGIN + "index.html");
    }

    static String mime(String p) {
        p = p.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".glb")) return "model/gltf-binary";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".mp4")) return "video/mp4";
        if (p.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    void immersive() {
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }
    @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) immersive(); }
    @Override protected void onSaveInstanceState(Bundle b) { super.onSaveInstanceState(b); web.saveState(b); }
    @Override protected void onPause() { super.onPause(); web.onPause(); web.evaluateJavascript("document.querySelectorAll('audio,video').forEach(function(m){m.pause()})", null); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }
    @Override public void onBackPressed() {
        // Back: close the gallery / leave the game for the menu; on the menu, leave the app
        web.evaluateJavascript("(function(){var g=document.getElementById('gClose');if(document.body.classList.contains('gallery')&&g){g.click();return 1}"
            + "if(!document.body.classList.contains('intro')){var m=document.getElementById('bMenu');if(m){m.click();return 1}}return 0})()",
            new android.webkit.ValueCallback<String>() { public void onReceiveValue(String v) { if (!"1".equals(v)) MainActivity.super.onBackPressed(); } });
    }
}
