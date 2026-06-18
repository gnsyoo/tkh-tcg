/* 배포 릴리스 스크립트
 * - version.json의 버전을 한 단계 올리고(기본: 마이너 +1)
 * - 모든 HTML의 로컬 에셋(css/js/이미지) 참조에 ?v=<버전> 캐시버스터를 붙이며
 * - 첫 화면(index.html)의 버전 뱃지·변경 내역 헤더 버전을 갱신하고
 * - 단일 빌드 파일(dist/play.html)을 다시 생성합니다.
 *
 * 버전 체계: MAJOR.MIDDLE.MINOR (3자리)
 *   - 배포마다 MINOR +1
 *   - MINOR가 20에 도달하면 0으로 리셋하고 MIDDLE +1 (자동)
 *   - 큰 변경이 있으면 MIDDLE +1 (MINOR 0으로 리셋) — `middle` 인자
 *   - MAJOR +1 시 MIDDLE·MINOR 0으로 리셋 — `major` 인자
 *
 * 사용법:
 *   node scripts/release.js          # 마이너 +1 (예: 1.0.3 -> 1.0.4, 1.0.19 -> 1.1.0)
 *   node scripts/release.js middle   # 미들 +1, 마이너 0 (예: 1.2.5 -> 1.3.0)
 *   node scripts/release.js major    # 메이저 +1, 미들·마이너 0 (예: 1.4.7 -> 2.0.0)
 *   node scripts/release.js 3.1.0    # 버전 직접 지정
 *
 * 배포 규칙·운영 방식은 DEPLOY.md 참고.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const VFILE = path.join(ROOT, 'version.json');
const HTML_FILES = ['index.html', 'heroes.html', 'daejang.html', 'queensblood.html'];
const MINOR_ROLLOVER = 20; // 마이너가 이 값에 도달하면 미들로 올림

function readVersion() {
  try { return String(JSON.parse(fs.readFileSync(VFILE, 'utf8')).version || '1.0.0'); }
  catch (e) { return '1.0.0'; }
}
function parseVer(v) {
  const p = String(v).split('.').map(function (x) { return parseInt(x, 10) || 0; });
  return { major: p[0] || 0, middle: p[1] || 0, minor: p[2] || 0 };
}
function nextVersion(cur, arg) {
  const v = parseVer(cur);
  if (arg === 'major') { v.major++; v.middle = 0; v.minor = 0; }
  else if (arg === 'middle') { v.middle++; v.minor = 0; }
  else if (arg && /^\d+\.\d+\.\d+$/.test(arg)) { return arg; }
  else { // 기본: 마이너 +1, 20 도달 시 미들로 올림
    v.minor++;
    if (v.minor >= MINOR_ROLLOVER) { v.middle++; v.minor = 0; }
  }
  return v.major + '.' + v.middle + '.' + v.minor;
}
function todayStr() {
  const d = new Date();
  const p = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate());
}

const cur = readVersion();
const next = nextVersion(cur, process.argv[2]);
const date = todayStr();

// 1) version.json 갱신
fs.writeFileSync(VFILE, JSON.stringify({ version: next }, null, 2) + '\n');

// 2) HTML 로컬 에셋에 ?v= 스탬프 (외부 URL·data:·앵커 제외, 기존 쿼리는 교체)
const ASSET_RE = /\b(href|src)="(?!https?:|\/\/|#|data:)([^"?#]+\.(?:css|js|png|jpe?g|svg|webp|gif|ico))(?:\?[^"]*)?"/g;
let stamped = 0;
HTML_FILES.forEach(function (f) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) return;
  let html = fs.readFileSync(p, 'utf8');
  let n = 0;
  html = html.replace(ASSET_RE, function (_, attr, file) { n++; return attr + '="' + file + '?v=' + next + '"'; });
  fs.writeFileSync(p, html);
  stamped += n;
  console.log('  stamped ' + n + ' assets in ' + f);
});

// 3) 첫 화면(index.html) 버전 뱃지 + 변경 내역 헤더 버전 자동 갱신
(function () {
  const p = path.join(ROOT, 'index.html');
  if (!fs.existsSync(p)) return;
  let html = fs.readFileSync(p, 'utf8');
  html = html.replace(/(<span class="ver-badge" id="verBadge">)[^<]*(<\/span>)/,
    '$1v' + next + ' · ' + date + '$2');
  html = html.replace(/(📜 변경 내역 <span style="color:var\(--gold\);font-size:14px;">)v[0-9.]*(<\/span>)/,
    '$1v' + next + '$2');
  fs.writeFileSync(p, html);
  console.log('  updated index.html version badge -> v' + next + ' · ' + date);
})();

// 4) 단일 빌드 파일 재생성
try {
  execFileSync('node', [path.join(__dirname, 'build-single.js')], { stdio: 'inherit' });
} catch (e) {
  console.error('build-single 실패:', e.message);
  process.exit(1);
}

console.log('release version: ' + cur + ' -> ' + next + ' (' + stamped + ' asset refs stamped)');
console.log('※ index.html 변경 내역(📜)에 이번 버전 변경 항목을 추가하세요 (배포 규칙 — DEPLOY.md 참고)');
