#!/usr/bin/env node
/* Capacitor 웹 자산 수집: 멀티 페이지 사이트를 www/ 로 복사한다.
 * (Capacitor의 webDir = "www". 안드로이드 앱에 그대로 번들되어 오프라인 실행) */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'www');

// 복사 대상 — 런타임에 필요한 파일/폴더만 (dist·android·scripts·node_modules 제외)
const HTML = ['index.html', 'heroes.html', 'daejang.html', 'herosblood.html'];
const DIRS = ['css', 'js', 'assets', 'bgm'];
const FILES = ['version.json'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

HTML.concat(FILES).forEach(function (f) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(out, f));
});
DIRS.forEach(function (d) {
  const src = path.join(root, d);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(out, d), { recursive: true });
});

let n = 0;
(function count(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) count(path.join(dir, e.name)); else n++;
  }
})(out);
console.log('built www/ with ' + n + ' files');
