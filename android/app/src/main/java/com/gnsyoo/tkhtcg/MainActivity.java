package com.gnsyoo.tkhtcg;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 앱 업데이트 후 WebView 캐시가 구버전 웹 자산을 계속 보여주는 문제 방지.
        // 자산이 앱에 번들된 로컬 파일이라 매번 새로 읽어도 빠르다.
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
            this.bridge.getWebView().clearCache(true);
        }
    }

    // 안드로이드 하드웨어 뒤로가기: 웹 히스토리가 있으면 페이지 뒤로, 없으면 앱 종료
    @Override
    public void onBackPressed() {
        if (this.bridge != null && this.bridge.getWebView() != null
                && this.bridge.getWebView().canGoBack()) {
            this.bridge.getWebView().goBack();
        } else {
            super.onBackPressed();
        }
    }
}
