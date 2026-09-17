package com.sibangku.ptkomikcaffe;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;

    // Default target: Menggunakan IP jaringan lokal agar bisa diakses dari HP fisik maupun emulator
    private static final String TARGET_URL = "http://192.168.68.103:3000/booking?tenant=PTKOMIKCAFFE";
    private static final String EMULATOR_FALLBACK = "http://10.0.2.2:3000/booking?tenant=PTKOMIKCAFFE";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                // Jika gagal terhubung ke IP lokal, coba fallback ke emulator host
                if (failingUrl.contains("192.168.")) {
                    view.loadUrl(EMULATOR_FALLBACK);
                } else {
                    Toast.makeText(MainActivity.this, "Pastikan PC Server SiBangku (port 3000) sudah berjalan di jaringan yang sama.", Toast.LENGTH_LONG).show();
                }
            }
        });

        webView.loadUrl(TARGET_URL);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
