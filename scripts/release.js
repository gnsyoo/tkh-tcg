/* 배포 릴리스 스크립트
 * - version.json의 버전을 한 단계 올리고(기본: 마이너 +1)
 * - 모든 HTML의 로컬 에셋(css/js/이미지) 참조에 ?v=<버전> 캐시버스터를 붙이며
 * - 단일 빌드 파일(dist/play.html)을 다시 생성합니다.
 *
 * 사용법:
 *   node scripts/release.js          # 마이너 버전 +1 (예: 1.1 -> 1.2)
 *   node scripts/release.js major    # 메이저 버전 +1, 마이너 0으로 리셋 (예: 1.7 -> 2.0)
 *   node scripts/release.js 3.4      # 버전을 명시적으로 지정
 *
 * 배포 규칙·운영 방식은 DEPLOY.md 참고.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const VFILE = path.join(ROOT, 'version.json');
const HTML_FILES = ['index.html', 'heroes.html', 'daejang.html', 'queensblood.html'];

function readVersion() {
  try { return String(JSON.parse(fs.readFileSync(VFILE, 'utf8')).version || '1.0'); }
  catch (e) { return '1.0'; }
}

function nextVersion(cur, arg) {
  const parts = cur.split('.');
  const major = parseInt(parts[0], 10) || 1;
  const minor = parseInt(parts[1], 10) || 0;
  if (arg === 'major') return (major + 1) + '.0';
  if (arg && /^\d+\.\d+$/.test(arg)) return arg;
  return major + '.' + (minor + 1); // 기본: 마이너 +1
}

const cur = readVersion();
const next = nextVersion(cur, process.argv[2]);

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

// 3) 단일 빌드 파일 재생성
try {
  execFileSync('node', [path.join(__dirname, 'build-single.js')], { stdio: 'inherit' });
} catch (e) {
  console.error('build-single 실패:', e.message);
  process.exit(1);
}

console.log('release version: ' + cur + ' -> ' + next + ' (' + stamped + ' asset refs stamped)');
