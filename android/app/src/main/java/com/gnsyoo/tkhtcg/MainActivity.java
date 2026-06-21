package com.gnsyoo.tkhtcg;

import android.content.DialogInterface;
import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.appcompat.app.AlertDialog;
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
    }

    // 하드웨어 뒤로가기: 이전 화면(웹 히스토리)이 있으면 그쪽으로, 없으면 종료 여부 확인
    @Override
    public void onBackPressed() {
        if (this.bridge != null && this.bridge.getWebView() != null
                && this.bridge.getWebView().canGoBack()) {
            this.bridge.getWebView().goBack();
            return;
        }
        new AlertDialog.Builder(this)
            .setTitle("앱 종료")
            .setMessage("앱을 종료할까요?")
            .setPositiveButton("종료", new DialogInterface.OnClickListener() {
                public void onClick(DialogInterface dialog, int which) { finish(); }
            })
            .setNegativeButton("취소", null)
            .show();
    }
}
