package com.gnsyoo.tkhtcg;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 앱 업데이트 후 WebView 캐시가 구버전 웹 자산을 계속 보여주는 문제 방지(로컬 자산이라 매번 읽어도 빠름)
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
            this.bridge.getWebView().clearCache(true);
        }
        // 하드웨어 뒤로가기는 @capacitor/app 의 backButton 이벤트로 JS(util.js)에서 처리
    }
}
