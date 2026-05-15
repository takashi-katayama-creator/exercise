/* =========================================================================
   no-screenshot.js
   スクリーンショット・印刷・コピー抑止スクリプト
   各HTMLの <head> 内で  <script src="no-screenshot.js"></script>  と読み込む
   ※ OSレベルのキャプチャ(Snipping Tool / Mac Cmd+Shift+4 等)や
      スマホでの別端末撮影は技術的に防げません。あくまで抑止策です。
   ========================================================================= */
(function () {
  'use strict';

  /* ---------- 1. CSS の動的注入 ----------------------------------------- */
  var style = document.createElement('style');
  style.setAttribute('data-no-screenshot', '');
  style.textContent = [
    /* 印刷時は中身を隠す */
    '@media print {',
    '  html, body { display: none !important; visibility: hidden !important; }',
    '  body::before {',
    '    content: "印刷は禁止されています";',
    '    display: block !important; visibility: visible !important;',
    '    font-size: 24px; text-align: center; padding: 40px;',
    '  }',
    '}',
    /* テキスト選択・ドラッグ・ハイライトの抑止 */
    'html, body {',
    '  -webkit-user-select: none;',
    '  -moz-user-select: none;',
    '  -ms-user-select: none;',
    '  user-select: none;',
    '  -webkit-touch-callout: none;',
    '  -webkit-tap-highlight-color: transparent;',
    '}',
    /* 入力系は選択を許可(パスワード入力等のため) */
    'input, textarea, [contenteditable="true"] {',
    '  -webkit-user-select: text;',
    '  -moz-user-select: text;',
    '  -ms-user-select: text;',
    '  user-select: text;',
    '}',
    /* 画像のドラッグ保存抑止 */
    'img { -webkit-user-drag: none; user-drag: none; pointer-events: none; }'
  ].join('\n');
  (document.head || document.documentElement).appendChild(style);

  /* ---------- 2. JavaScript によるキー・操作抑止 ------------------------ */

  // 警告表示(過剰なalertを避けるため簡易トースト)
  var warnTimer = null;
  function warn(msg) {
    if (warnTimer) return; // 連打防止
    var t = document.createElement('div');
    t.textContent = msg || 'この操作は禁止されています';
    t.style.cssText = [
      'position:fixed', 'top:20px', 'left:50%',
      'transform:translateX(-50%)',
      'background:rgba(0,0,0,0.85)', 'color:#fff',
      'padding:10px 18px', 'border-radius:6px',
      'font-size:14px', 'z-index:2147483647',
      'font-family:sans-serif', 'pointer-events:none',
      'box-shadow:0 2px 8px rgba(0,0,0,0.3)'
    ].join(';');
    document.body && document.body.appendChild(t);
    warnTimer = setTimeout(function () {
      if (t.parentNode) t.parentNode.removeChild(t);
      warnTimer = null;
    }, 1800);
  }

  // PrintScreen を押された場合、クリップボードを空に上書き
  function clearClipboard() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('');
      }
    } catch (e) { /* 無視 */ }
  }

  // キー押下を監視
  document.addEventListener('keydown', function (e) {
    var k = e.key;
    var ctrl = e.ctrlKey || e.metaKey; // Mac の Cmd も含める

    // PrintScreen
    if (k === 'PrintScreen' || e.code === 'PrintScreen') {
      clearClipboard();
      warn('スクリーンショットは禁止されています');
      e.preventDefault();
      return;
    }

    // Ctrl/Cmd + P (印刷)
    if (ctrl && (k === 'p' || k === 'P')) {
      warn('印刷は禁止されています');
      e.preventDefault();
      return;
    }

    // Ctrl/Cmd + S (保存)
    if (ctrl && (k === 's' || k === 'S')) {
      warn('ページ保存は禁止されています');
      e.preventDefault();
      return;
    }

    // Ctrl/Cmd + Shift + S (Mac のスクリーンショット系・FireFoxのスクショ)
    if (ctrl && e.shiftKey && (k === 'S' || k === 's')) {
      warn('スクリーンショットは禁止されています');
      e.preventDefault();
      return;
    }

    // Mac: Cmd + Shift + 3 / 4 / 5 (スクリーンショット)
    if (e.metaKey && e.shiftKey && (k === '3' || k === '4' || k === '5')) {
      warn('スクリーンショットは禁止されています');
      e.preventDefault();
      return;
    }

    // 開発者ツール抑止(F12 / Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+U)
    if (k === 'F12') { warn('この操作は無効です'); e.preventDefault(); return; }
    if (ctrl && e.shiftKey && (k === 'I' || k === 'i' || k === 'J' || k === 'j' || k === 'C' || k === 'c')) {
      warn('この操作は無効です'); e.preventDefault(); return;
    }
    if (ctrl && (k === 'u' || k === 'U')) { // ソース表示
      warn('この操作は無効です'); e.preventDefault(); return;
    }
  }, true);

  // keyup 側でも PrintScreen を検知(OSによってkeydownで取れない場合あり)
  document.addEventListener('keyup', function (e) {
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
      clearClipboard();
      warn('スクリーンショットは禁止されています');
    }
  }, true);

  // 右クリックメニュー抑止
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    warn('右クリックは無効です');
  }, true);

  // コピー・カット・ドラッグ抑止
  ['copy', 'cut', 'dragstart', 'selectstart'].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      // 入力フィールド内は許可
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
      e.preventDefault();
    }, true);
  });

  // beforeprint で再警告(ブラウザのメニューから印刷を起動された場合)
  window.addEventListener('beforeprint', function () {
    warn('印刷は禁止されています');
  });

  // タブが非アクティブになった時(スクリーンショットツール起動の可能性)に
  // 画面を一瞬ぼかす ── 任意の抑止策
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      document.documentElement.style.filter = 'blur(20px)';
    } else {
      document.documentElement.style.filter = '';
    }
  });
})();
