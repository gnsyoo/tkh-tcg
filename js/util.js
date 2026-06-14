/* ===== Shared helpers used by both mockups ===== */
var TCG = (function () {
  function getDifficulty() {
    var params = new URLSearchParams(location.search);
    var d = params.get('diff') || localStorage.getItem('tcg_difficulty') || 'normal';
    if (['easy', 'normal', 'hard'].indexOf(d) === -1) d = 'normal';
    localStorage.setItem('tcg_difficulty', d);
    return d;
  }
  function diffLabel(d) {
    return { easy: '하 (Easy)', normal: '중 (Normal)', hard: '상 (Hard)' }[d] || d;
  }
  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rand(arr.length)]; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rand(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  var toastEl = null;
  var toastTimer = null;
  function toast(msg, ms) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 1600);
  }

  function floatText(container, x, y, text, color) {
    var el = document.createElement('div');
    el.className = 'float-dmg';
    el.textContent = text;
    el.style.color = color || '#fff';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    container.appendChild(el);
    setTimeout(function () { el.remove(); }, 950);
  }

  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  return {
    getDifficulty: getDifficulty,
    diffLabel: diffLabel,
    rand: rand, pick: pick, shuffle: shuffle, clamp: clamp,
    toast: toast, floatText: floatText, delay: delay
  };
})();
