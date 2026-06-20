# 안드로이드 앱 (Capacitor) — APK 빌드 안내

이 저장소는 웹 게임(멀티 페이지 HTML/CSS/JS)을 **Capacitor**로 감싼 안드로이드 앱 프로젝트를 포함합니다.
APK는 **GitHub Actions가 클라우드에서 빌드**하므로, 로컬에 안드로이드 빌드 환경을 설치할 필요가 없습니다.

- **appId**: `com.gnsyoo.tkhtcg`
- **appName**: 삼국 영웅전
- **webDir**: `www/` (빌드 시 `scripts/build-www.js`가 사이트를 모아 생성)

## APK 받는 법 (CI)
1. GitHub 저장소 → **Actions** 탭 → **Build Android APK** 워크플로.
2. `main`에 푸시되면 자동 실행됩니다. 수동 실행은 **Run workflow** 버튼.
3. 실행 완료 후 해당 run 페이지 하단 **Artifacts → `app-debug-apk`** 를 내려받습니다.
4. 압축을 풀면 `app-debug.apk` — 안드로이드 폰에 복사해 설치(설정에서 "출처를 알 수 없는 앱 설치" 허용 필요).

> 디버그 APK는 테스트/사이드로딩용입니다. Play 스토어 출시에는 **서명된 릴리스 빌드(AAB)** 가 필요합니다(아래).

## 로컬에서 직접 빌드하려면 (선택)
안드로이드 SDK + JDK 17+ 가 설치된 환경에서:
```bash
npm ci
npm run build:www       # 사이트를 www/ 로 수집
npx cap sync android    # www/ 를 안드로이드 프로젝트로 복사
cd android && ./gradlew assembleDebug
# 산출물: android/app/build/outputs/apk/debug/app-debug.apk
```
Android Studio로 열려면: `npx cap open android`

## 웹 내용 갱신 시
게임 코드(html/css/js/assets)를 수정한 뒤 `main`에 푸시하면, CI가 `build:www` → `cap sync` → APK 빌드를 다시 수행합니다.

## (나중에) Play 스토어용 서명 릴리스
1. 키스토어 생성: `keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`
2. 키스토어/비밀번호를 **GitHub Secrets**에 등록.
3. 워크플로에 `assembleRelease`(또는 `bundleRelease`) + 서명 스텝 추가.

원하면 이 서명 릴리스 단계까지 워크플로에 추가해 드릴 수 있습니다.

## 네이티브 설정 메모
- **세로 고정**: `AndroidManifest.xml`의 `android:screenOrientation="portrait"`.
- **하드웨어 뒤로가기**: `MainActivity.java`에서 웹 히스토리가 있으면 페이지 뒤로, 없으면 앱 종료.
- **오프라인**: 모든 에셋이 앱에 번들되어 인터넷 없이 실행됩니다(구글 애널리틱스 전송만 온라인 시 동작).
- **아이콘/스플래시**: 현재 Capacitor 기본값. 교체하려면 `@capacitor/assets`로 생성하거나 `android/app/src/main/res`의 `mipmap-*`를 교체하세요.
