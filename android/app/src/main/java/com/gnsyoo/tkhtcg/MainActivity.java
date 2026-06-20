package com.gnsyoo.tkhtcg;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
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
