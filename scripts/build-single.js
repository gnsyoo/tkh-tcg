/* Builds a single self-contained HTML file (dist/play.html) that bundles the
 * landing page + both games. Each game runs inside an isolated <iframe srcdoc>
 * so their element IDs and init scripts never collide. */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Make difficulty come from a global instead of location/localStorage (srcdoc-safe).
let util = read('js/util.js').replace(
  /function getDifficulty\(\)\s*\{[\s\S]*?\n  \}/,
  `function getDifficulty() {
    var d = (typeof window !== 'undefined' && window.__TCG_DIFF__) || 'normal';
    if (['easy', 'normal', 'hard'].indexOf(d) === -1) d = 'normal';
    return d;
  }`
);

const common = read('css/common.css');

function bodyOf(html) {
  const b = html.slice(html.indexOf('<body'), html.indexOf('</body>'));
  // drop the opening <body ...> tag line and any <script src=...> includes
  return b
    .replace(/<body[^>]*>/, '')
    .replace(/<script src="[^"]*"><\/script>/g, '')
    .replace(/href="index\.html"/g, 'href="#"'); // neutralize in-iframe back links
}

function gameDoc(css, body, scripts) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>${common}\n${css}</style></head><body>${body}
<script>window.__TCG_DIFF__='__DIFFVAL__';</script>
<script>${scripts}</script></body></html>`;
}

const heroesDoc = gameDoc(
  read('css/heroes.css'),
  bodyOf(read('heroes.html')),
  [util, read('js/heroes_data.js'), read('js/heroes.js')].join('\n;\n')
);
const qbDoc = gameDoc(
  read('css/queensblood.css'),
  bodyOf(read('queensblood.html')),
  [util, read('js/qb_data.js'), read('js/queensblood.js')].join('\n;\n')
);

const homeBody = bodyOf(read('index.html'))
  .replace(/<script>[\s\S]*?<\/script>/g, ''); // drop the home inline script; we add our own

const enc = s => JSON.stringify(s); // safe embedding as a JS string

const out = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#0d0b1a">
<title>삼국지 TCG 목업</title>
<style>${common}\n${read('css/home.css')}
.game-frame { position: fixed; inset: 0; z-index: 500; background: var(--bg-0); display: none; }
.game-frame.show { display: block; }
.game-frame iframe { width: 100%; height: 100%; border: 0; }
.frame-back {
  position: fixed; top: 10px; left: 10px; z-index: 600;
  background: rgba(10,8,20,0.85); border: 1px solid var(--gold);
  color: var(--ink); border-radius: 999px; padding: 8px 16px; font-weight: 800; font-size: 13px;
}
</style>
</head>
<body class="home-body">
  <div class="home-wrap">${homeBody}</div>

  <div class="game-frame" id="frameWrap">
    <button class="frame-back" id="frameBack">← 메뉴</button>
    <iframe id="gameFrame" referrerpolicy="no-referrer"></iframe>
  </div>

  <script>
    var DOCS = { heroes: ${enc(heroesDoc)}, queens: ${enc(qbDoc)} };
    var diff = 'normal';
    function applyDiff(d) {
      diff = d;
      document.querySelectorAll('.diff-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.diff === d);
      });
    }
    document.getElementById('diffPicker').addEventListener('click', function (e) {
      var btn = e.target.closest('.diff-btn'); if (btn) applyDiff(btn.dataset.diff);
    });
    function openGame(which) {
      var html = DOCS[which].replace('__DIFFVAL__', diff);
      document.getElementById('gameFrame').srcdoc = html;
      document.getElementById('frameWrap').classList.add('show');
    }
    function closeGame() {
      document.getElementById('frameWrap').classList.remove('show');
      document.getElementById('gameFrame').srcdoc = '';
    }
    document.getElementById('cardHeroes').addEventListener('click', function (e) { e.preventDefault(); openGame('heroes'); });
    document.getElementById('cardQueens').addEventListener('click', function (e) { e.preventDefault(); openGame('queens'); });
    document.getElementById('frameBack').addEventListener('click', closeGame);
    applyDiff('normal');
  </script>
</body>
</html>`;

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist/play.html'), out);
console.log('wrote dist/play.html', (out.length / 1024).toFixed(1) + ' KB');
