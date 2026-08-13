(function () {
  'use strict';

  var config = window.MINI_APP_CONFIG;
  var app = document.getElementById('app');
  var STORAGE_KEY = 'fujifilm-camera-stamp-rally-v1';
  if (!config || !app) throw new Error('アプリ設定を読み込めませんでした。');

  var saved = readState();
  var state = {
    started: Boolean(saved.started),
    screen: saved.screen || (saved.started ? 'rally' : 'welcome'),
    activeTab: saved.activeTab || 'stamps',
    collected: Array.isArray(saved.collected) ? saved.collected.filter(isBoothId) : [],
    rewardCode: saved.rewardCode || '',
    exchanged: Boolean(saved.exchanged),
    exchangedAt: saved.exchangedAt || '',
    modal: null,
    pendingComplete: false
  };
  if (!state.started) state.screen = 'welcome';
  if (state.screen === 'reward' && state.collected.length !== config.booths.length) state.screen = 'rally';

  var cameraStream = null;
  var scannerFrame = 0;
  var barcodeDetector = null;
  var mockScanTimer = 0;

  var icons = {
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
    qr: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"/><path d="M15 14h2v2h-2zM19 14h1v3h-3v3h-3v-2M19 19h1v1h-1z"/></svg>',
    location: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.4"/></svg>',
    camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
    gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13"/><path d="M12 7H8.5a2.5 2.5 0 1 1 2.2-3.7L12 7Zm0 0h3.5a2.5 2.5 0 1 0-2.2-3.7L12 7Z"/></svg>',
    route: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6Z"/><path d="m9 12 2 2 4-5"/></svg>',
    reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/></svg>'
  };

  applyTheme();
  render();
  app.addEventListener('click', handleClick);
  window.addEventListener('beforeunload', stopCamera);
  setInterval(updateLiveTimes, 1000);

  function readState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_error) {
      return {};
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      started: state.started,
      screen: state.screen,
      activeTab: state.activeTab,
      collected: state.collected,
      rewardCode: state.rewardCode,
      exchanged: state.exchanged,
      exchangedAt: state.exchangedAt
    }));
  }

  function applyTheme() {
    Object.keys(config.theme).forEach(function (key) {
      var cssKey = key.replace(/[A-Z]/g, function (letter) { return '-' + letter.toLowerCase(); });
      document.documentElement.style.setProperty('--color-' + cssKey, config.theme[key]);
    });
  }

  function render() {
    stopCamera();
    var page = state.screen === 'welcome' ? renderWelcome()
      : state.screen === 'complete' ? renderComplete()
      : state.screen === 'reward' ? renderReward()
      : renderRally();
    app.innerHTML = deviceChrome(page);
    if (state.modal) app.insertAdjacentHTML('beforeend', renderModal());
    updateLiveTimes();
  }

  function deviceChrome(content) {
    return '<div class="device-status" aria-hidden="true"><strong data-live-time>' + formatTime(new Date()) +
      '</strong><span class="device-status__icons">● ᯤ ▰</span></div>' + content +
      '<span class="device-home-indicator" aria-hidden="true"></span>';
  }

  function brandHeader(options) {
    options = options || {};
    var back = options.back ? '<button class="icon-button" type="button" data-action="' +
      (options.backAction || 'back-rally') + '" aria-label="戻る">' + icons.back + '</button>' : '';
    var menu = options.menu ? '<button class="icon-button" type="button" data-action="open-menu" aria-label="メニュー">' +
      icons.more + '</button>' : '';
    return '<header class="app-header' + (options.transparent ? ' app-header--transparent' : '') + '">' +
      '<div class="app-header__side">' + back + '</div>' +
      '<div class="brand-lockup" aria-label="' + E(config.brand.eventName) + '"><span class="brand-wordmark">' +
      E(config.brand.name) + '</span><span class="brand-event">' + E(config.brand.shortEventName) + '</span></div>' +
      '<div class="app-header__side app-header__side--right">' + menu + '</div></header>';
  }

  function renderWelcome() {
    return '<main class="screen welcome-screen">' + brandHeader({ transparent: true }) +
      '<section class="welcome-hero"><div class="welcome-hero__type" aria-hidden="true">' +
      '<span>MEET</span><span>SHOOT</span><span>COLLECT</span></div>' +
      '<div class="welcome-hero__camera"><img src="' + E(config.booths[0].image) + '" alt=""></div>' +
      '<div class="welcome-hero__stamp" aria-hidden="true">' + icons.camera + '<b>6</b><span>STAMPS</span></div>' +
      '<p class="welcome-hero__caption">X100VI / SILVER</p></section>' +
      '<section class="welcome-copy"><p class="eyebrow">' + E(config.welcome.eyebrow) + '</p>' +
      '<h1>' + LB(config.welcome.title) + '</h1><p class="welcome-copy__description">' + E(config.welcome.description) + '</p>' +
      '<dl class="event-meta"><div><dt>DATE</dt><dd>' + E(config.welcome.eventDate) + '</dd></div>' +
      '<div><dt>VENUE</dt><dd>' + E(config.welcome.venue) + '</dd></div></dl>' +
      '<button class="primary-button" type="button" data-action="start"><span>' + E(config.welcome.startLabel) + '</span>' +
      icons.arrow + '</button><p class="welcome-note">' + icons.qr + '<span>各ブースのQRコードをカメラで読み取ります</span></p>' +
      '</section></main>';
  }

  function renderRally() {
    var complete = state.collected.length === config.booths.length;
    var action = complete ? 'show-complete' : 'open-reward-hint';
    return '<main class="screen rally-screen">' + brandHeader({ menu: true }) +
      '<section class="rally-lead"><div><p class="eyebrow">' + E(config.rally.progressTitle) +
      '</p><h1>カメラスタンプを<br>集めよう。</h1></div>' + progressRing() + '</section>' +
      '<nav class="rally-tabs" aria-label="スタンプラリーメニュー">' +
      '<button type="button" data-action="set-tab" data-tab="stamps" class="' + (state.activeTab === 'stamps' ? 'is-active' : '') + '">' +
      icons.camera + '<span>スタンプ</span></button>' +
      '<button type="button" data-action="set-tab" data-tab="booths" class="' + (state.activeTab === 'booths' ? 'is-active' : '') + '">' +
      icons.route + '<span>ブース</span></button>' +
      '<button type="button" data-action="' + action + '">' + icons.gift + '<span>特典</span></button></nav>' +
      (state.activeTab === 'booths' ? renderBoothGuide() : renderStampCollection()) +
      (complete ? '<aside class="complete-banner"><span>' + icons.gift + '</span><div><b>ALL COMPLETE!</b><strong>' +
        E(config.rally.completeMessage) + '</strong></div><button type="button" data-action="show-complete" aria-label="コンプリート画面へ">' +
        icons.arrow + '</button></aside>'
        : '<button class="scan-fab" type="button" data-action="open-scanner"><span>' + icons.qr + '</span><b>' +
          E(config.rally.scanButton) + '</b></button>') + '</main>';
  }

  function progressRing() {
    var count = state.collected.length;
    var degrees = (count / config.booths.length) * 360;
    return '<div class="progress-ring" style="--progress:' + degrees + 'deg" role="progressbar" aria-valuemin="0" aria-valuemax="' +
      config.booths.length + '" aria-valuenow="' + count + '"><div><strong>' + count + '</strong><span>/ ' +
      config.booths.length + '</span><small>STAMP</small></div></div>';
  }

  function renderStampCollection() {
    return '<section class="stamp-section"><div class="section-heading"><div><p>' + E(config.rally.totalLabel) +
      '</p><h2>STAMP CARD</h2></div><span>' + state.collected.length + ' / ' + config.booths.length + '</span></div>' +
      '<div class="stamp-grid">' + config.booths.map(function (booth) {
        return stampCard(booth, state.collected.indexOf(booth.id) >= 0);
      }).join('') + '</div><p class="rally-tip"><b>HOW TO PLAY</b> ブースの体験後、掲示されたQRコードを読み取るとスタンプが押されます。</p></section>';
  }

  function stampCard(booth, collected) {
    var center = collected ? cameraStamp(booth, 'small')
      : '<span class="stamp-placeholder">' + icons.camera + '<b>?</b></span>';
    return '<button class="stamp-card' + (collected ? ' is-collected' : '') +
      '" type="button" data-booth-details="' + E(booth.id) + '" style="--stamp-color:' + E(booth.stampColor) +
      ';--stamp-accent:' + E(booth.accentColor) + '"><span class="stamp-card__number">' + E(booth.number) +
      '</span>' + center + '<span class="stamp-card__zone">' + E(booth.zone) + '</span><strong>' +
      (collected ? E(booth.name) : '未獲得') + '</strong>' +
      (collected ? '<span class="stamp-card__check">' + icons.check + '</span>' : '') + '</button>';
  }

  function cameraStamp(booth, size) {
    return '<span class="camera-stamp camera-stamp--' + size + '" style="--stamp-color:' + E(booth.stampColor) +
      ';--stamp-accent:' + E(booth.accentColor) + '"><span class="camera-stamp__sparkle camera-stamp__sparkle--one">✦</span>' +
      '<span class="camera-stamp__sparkle camera-stamp__sparkle--two">•</span><span class="camera-stamp__ring">' +
      '<span class="camera-stamp__face"><img src="' + E(booth.image) + '" alt="' + E(booth.name) + '"><i></i><i></i></span>' +
      '<b>' + E(booth.stampTitle) + '</b></span></span>';
  }

  function renderBoothGuide() {
    var pins = config.booths.map(function (booth, index) {
      var visited = state.collected.indexOf(booth.id) >= 0;
      var x = index % 2 === 0 ? 10 : 56;
      var y = 12 + Math.floor(index / 2) * 29;
      return '<button type="button" class="venue-map__pin ' + (visited ? 'is-visited' : '') +
        '" data-booth-details="' + E(booth.id) + '" style="--pin-x:' + x + '%;--pin-y:' + y +
        '%"><span>' + E(booth.number) + '</span><b>' + E(booth.name) + '</b></button>';
    }).join('');
    var rows = config.booths.map(function (booth) {
      var visited = state.collected.indexOf(booth.id) >= 0;
      return '<button type="button" class="booth-row" data-booth-details="' + E(booth.id) +
        '"><span class="booth-row__number">' + E(booth.number) + '</span><span class="booth-row__copy"><small>' +
        E(booth.zone) + ' / ' + E(booth.boothName) + '</small><strong>' + E(booth.name) + '</strong><em>' +
        icons.location + E(booth.location) + '</em></span><span class="booth-row__status ' +
        (visited ? 'is-visited' : '') + '">' + (visited ? icons.check : icons.arrow) + '</span></button>';
    }).join('');
    return '<section class="booth-section"><div class="section-heading"><div><p>' + E(config.rally.mapTitle) +
      '</p><h2>会場ブース案内</h2></div></div><p class="booth-section__intro">' + E(config.rally.mapDescription) +
      '</p><div class="venue-map" aria-label="会場マップ"><div class="venue-map__aisle">MAIN AISLE</div>' +
      pins + '</div><div class="booth-list">' + rows + '</div></section>';
  }

  function renderComplete() {
    var confetti = Array.from({ length: 26 }, function (_item, index) {
      return '<i style="--i:' + index + ';--x:' + ((index * 37) % 100) + ';--d:' + ((index % 7) * 0.11) + 's"></i>';
    }).join('');
    return '<main class="screen complete-screen">' + brandHeader({ back: true }) +
      '<div class="confetti" aria-hidden="true">' + confetti + '</div><section class="complete-hero"><p class="eyebrow">' +
      E(config.completion.eyebrow) + '</p><div class="complete-burst"><span>' + icons.check + '</span></div><h1>' +
      E(config.completion.title) + '</h1><p>' + E(config.completion.description) + '</p></section>' +
      '<section class="complete-stamps">' + config.booths.map(function (booth) { return cameraStamp(booth, 'tiny'); }).join('') +
      '</section><section class="reward-preview"><div class="reward-preview__icon">' + icons.gift + '</div><p>' +
      E(config.reward.eyebrow) + '</p><h2>' + LB(config.reward.title) + '</h2><span>' + E(config.completion.instruction) +
      '</span></section><div class="complete-actions"><button class="primary-button" type="button" data-action="show-reward">' +
      E(config.completion.buttonLabel) + icons.arrow + '</button><button class="text-button" type="button" data-action="back-rally">' +
      'スタンプカードに戻る</button></div></main>';
  }

  function renderReward() {
    var code = state.rewardCode || createRewardCode();
    var productImages = config.booths.slice(0, 3).map(function (booth, index) {
      return '<img src="' + E(booth.image) + '" alt="" style="--reward-index:' + index + '">';
    }).join('');
    var used = state.exchanged ? '<div class="used-stamp"><strong>' + E(config.reward.exchangedTitle) +
      '</strong><span>' + formatDateTime(state.exchangedAt) + '</span></div>' : '';
    var action = state.exchanged
      ? '<section class="exchange-result"><span>' + icons.check + '</span><div><h2>' + E(config.reward.exchangedDescription) +
        '</h2><p>' + formatDateTime(state.exchangedAt) + '</p></div></section>'
      : '<section class="staff-panel"><p>' + icons.shield + '<span>' + E(config.reward.caution) +
        '</span></p><button type="button" data-action="exchange-confirm">' + E(config.reward.staffButton) + '</button></section>';
    return '<main class="screen reward-screen' + (state.exchanged ? ' is-exchanged' : '') + '">' +
      brandHeader({ back: true, menu: true }) + '<section class="reward-heading"><p class="eyebrow">' +
      E(config.reward.eyebrow) + '</p><h1>' + E(config.reward.staffInstruction) + '</h1><span class="reward-live"><i></i> LIVE <b data-live-time>' +
      formatTime(new Date()) + '</b></span></section><section class="reward-ticket"><div class="reward-ticket__top">' +
      '<div class="reward-ticket__stamp">' + icons.camera + '<span>6 / 6</span></div><div><p>' +
      E(config.reward.description) + '</p><h2>' + LB(config.reward.title) + '</h2></div></div>' +
      '<div class="reward-ticket__art">' + productImages + '<span>PHOTO<br><b>EXPERIENCE</b><br>2026</span></div>' +
      '<dl class="reward-ticket__meta"><div><dt>EXCHANGE COUNTER</dt><dd>' + E(config.reward.counter) +
      '</dd></div><div><dt>REWARD ID</dt><dd>' + E(code) + '</dd></div></dl><span class="reward-ticket__cut reward-ticket__cut--left"></span>' +
      '<span class="reward-ticket__cut reward-ticket__cut--right"></span>' + used + '</section>' + action +
      '<p class="reward-footer-note">FUJIFILM PHOTO EXPERIENCE 2026</p></main>';
  }

  function renderModal() {
    if (state.modal.type === 'scanner') return renderScanner();
    if (state.modal.type === 'stamp') return renderStampModal(state.modal.boothId, state.modal.duplicate);
    if (state.modal.type === 'booth') return renderBoothModal(state.modal.boothId);
    if (state.modal.type === 'exchange-confirm') return renderExchangeConfirm();
    if (state.modal.type === 'menu') return renderMenu();
    if (state.modal.type === 'reset-confirm') return renderResetConfirm();
    if (state.modal.type === 'reward-hint') return renderRewardHint();
    return '';
  }

  function modalShell(content, className) {
    return '<div class="overlay ' + (className || '') + '"><button class="overlay__backdrop" type="button" data-action="close-modal" aria-label="閉じる"></button>' +
      content + '</div>';
  }

  function renderScanner() {
    var pending = config.booths.filter(function (booth) { return state.collected.indexOf(booth.id) < 0; });
    var buttons = pending.length ? pending.map(function (booth) {
      return '<button type="button" data-action="simulate-stamp" data-booth-id="' + E(booth.id) + '"><span>' +
        E(booth.number) + '</span><div><small>' + E(booth.zone) + '</small><b>' + E(booth.name) + '</b></div>' + icons.qr + '</button>';
    }).join('') : '<p>すべてのスタンプを獲得済みです。</p>';
    return '<div class="scanner-overlay"><video id="scanner-video" autoplay muted playsinline aria-label="QRコード読み取りカメラ"></video>' +
      '<div class="scanner-fallback" aria-hidden="true">' + icons.camera + '</div><div class="scanner-shade scanner-shade--top"></div>' +
      '<div class="scanner-shade scanner-shade--left"></div><div class="scanner-shade scanner-shade--right"></div>' +
      '<div class="scanner-shade scanner-shade--bottom"></div><div class="scanner-frame"><i></i><i></i><i></i><i></i><span></span></div>' +
      '<header class="scanner-header"><button type="button" data-action="close-modal" aria-label="閉じる">' + icons.close +
      '</button><div><b>QR CODE SCAN</b><span>ブースのQRコードを枠内に合わせてください</span></div><span></span></header>' +
      '<p id="scanner-status" class="scanner-status">QRコードを探しています…</p><section class="scanner-demo">' +
      '<button class="scanner-demo__toggle" type="button" data-action="toggle-demo"><span>ローカル確認用</span>' +
      '<b>読み取るQRを選ぶ</b>' + icons.arrow + '</button><div class="scanner-demo__list" id="scanner-demo-list">' +
      buttons + '</div></section></div>';
  }

  function renderStampModal(boothId, duplicate) {
    var booth = findBooth(boothId);
    if (!booth) return '';
    return modalShell('<section class="stamp-modal"><div class="stamp-modal__rays" aria-hidden="true"></div>' +
      '<button class="stamp-modal__close" type="button" data-action="stamp-close" aria-label="閉じる">' + icons.close +
      '</button><p class="eyebrow">' + (duplicate ? 'ALREADY COLLECTED' : 'NEW STAMP!') + '</p>' +
      cameraStamp(booth, 'large') + '<span class="stamp-modal__booth">BOOTH ' + E(booth.number) + ' / ' + E(booth.zone) +
      '</span><h2>' + (duplicate ? 'このスタンプは獲得済みです' : E(booth.name) + ' をゲット！') + '</h2><p>' +
      (duplicate ? '別のブースのQRコードを探してみよう。' : E(booth.description)) +
      '</p><button class="primary-button" type="button" data-action="stamp-close">' +
      (state.pendingComplete ? 'コンプリートを見る' : 'スタンプカードを見る') + icons.arrow + '</button></section>', 'overlay--center');
  }

  function renderBoothModal(boothId) {
    var booth = findBooth(boothId);
    if (!booth) return '';
    var collected = state.collected.indexOf(booth.id) >= 0;
    var button = collected
      ? '<button class="secondary-button" type="button" data-action="close-modal">' + icons.check + 'スタンプ獲得済み</button>'
      : '<button class="primary-button" type="button" data-action="open-scanner" data-booth-id="' + E(booth.id) + '">' + icons.qr + 'このブースのQRを読み取る</button>';
    return modalShell('<section class="bottom-sheet booth-sheet"><span class="sheet-handle"></span>' +
      '<div class="booth-sheet__visual" style="--stamp-color:' + E(booth.stampColor) + '"><span>' + E(booth.number) +
      '</span><img src="' + E(booth.image) + '" alt="' + E(booth.name) + '"></div><p class="eyebrow">' + E(booth.zone) +
      ' / ' + E(booth.boothName) + '</p><h2>' + E(booth.name) + '</h2><p>' + E(booth.description) +
      '</p><div class="booth-sheet__location">' + icons.location + '<span><b>' + E(booth.location) +
      '</b>会場マップのブース ' + E(booth.number) + '</span></div>' + button + '</section>');
  }

  function renderExchangeConfirm() {
    return modalShell('<section class="bottom-sheet confirm-sheet"><span class="sheet-handle"></span>' +
      '<div class="confirm-sheet__icon">' + icons.gift + '</div><p class="eyebrow">FOR EVENT STAFF</p><h2>' +
      E(config.reward.confirmTitle) + '</h2><p>' + E(config.reward.confirmDescription) +
      '</p><button class="danger-button" type="button" data-action="exchange-now">' + E(config.reward.exchangeButton) +
      '</button><button class="secondary-button" type="button" data-action="close-modal">キャンセル</button></section>');
  }

  function renderMenu() {
    return modalShell('<section class="bottom-sheet menu-sheet"><span class="sheet-handle"></span>' +
      '<p class="eyebrow">EVENT INFORMATION</p><h2>' + E(config.brand.eventName) + '</h2><dl>' +
      '<div><dt>開催日</dt><dd>' + E(config.welcome.eventDate) + '</dd></div><div><dt>会場</dt><dd>' +
      E(config.welcome.venue) + '</dd></div><div><dt>獲得スタンプ</dt><dd>' + state.collected.length + ' / ' +
      config.booths.length + '</dd></div></dl><button class="menu-reset" type="button" data-action="reset-confirm">' +
      icons.reset + '<span>最初から体験する</span>' + icons.arrow + '</button><button class="secondary-button" type="button" data-action="close-modal">閉じる</button></section>');
  }

  function renderResetConfirm() {
    return modalShell('<section class="bottom-sheet confirm-sheet"><span class="sheet-handle"></span>' +
      '<div class="confirm-sheet__icon confirm-sheet__icon--muted">' + icons.reset + '</div><h2>スタンプをリセットしますか？</h2>' +
      '<p>獲得したスタンプと景品交換状態を消して、最初の画面に戻ります。</p>' +
      '<button class="danger-button" type="button" data-action="reset-now">リセットする</button>' +
      '<button class="secondary-button" type="button" data-action="close-modal">キャンセル</button></section>');
  }

  function renderRewardHint() {
    return modalShell('<section class="bottom-sheet reward-hint-sheet"><span class="sheet-handle"></span>' +
      '<div class="confirm-sheet__icon">' + icons.gift + '</div><p class="eyebrow">COMPLETE REWARD</p><h2>' +
      LB(config.reward.title) + '</h2><p>あと <b>' + (config.booths.length - state.collected.length) +
      '個</b> のスタンプで交換画面が開きます。</p><div class="mini-progress"><span style="width:' +
      ((state.collected.length / config.booths.length) * 100) + '%"></span></div>' +
      '<button class="primary-button" type="button" data-action="open-scanner">' + icons.qr + 'QRコードを読み取る</button></section>');
  }

  function handleClick(event) {
    var target = event.target.closest('[data-action], [data-booth-details]');
    if (!target) return;
    if (target.dataset.boothDetails) {
      state.modal = { type: 'booth', boothId: target.dataset.boothDetails };
      render();
      return;
    }

    var action = target.dataset.action;
    if (action === 'start') {
      state.started = true;
      state.screen = 'rally';
      saveState();
      render();
    } else if (action === 'set-tab') {
      state.activeTab = target.dataset.tab || 'stamps';
      saveState();
      render();
    } else if (action === 'open-scanner') {
      state.modal = { type: 'scanner', boothId: target.dataset.boothId || '' };
      render();
      startMockScan();
    } else if (action === 'close-modal') {
      state.modal = null;
      render();
    } else if (action === 'toggle-demo') {
      var list = document.getElementById('scanner-demo-list');
      var toggle = target.closest('.scanner-demo__toggle');
      if (list) list.classList.toggle('is-open');
      if (toggle) toggle.classList.toggle('is-open');
    } else if (action === 'simulate-stamp') {
      collectStamp(target.dataset.boothId);
    } else if (action === 'stamp-close') {
      state.modal = null;
      if (state.pendingComplete) {
        state.pendingComplete = false;
        state.screen = 'complete';
      } else {
        state.screen = 'rally';
        state.activeTab = 'stamps';
      }
      saveState();
      render();
    } else if (action === 'show-complete') {
      state.modal = null;
      state.screen = 'complete';
      saveState();
      render();
    } else if (action === 'show-reward') {
      state.screen = 'reward';
      createRewardCode();
      saveState();
      render();
    } else if (action === 'back-rally') {
      state.screen = 'rally';
      state.activeTab = 'stamps';
      state.modal = null;
      saveState();
      render();
    } else if (action === 'open-reward-hint') {
      state.modal = { type: 'reward-hint' };
      render();
    } else if (action === 'exchange-confirm') {
      state.modal = { type: 'exchange-confirm' };
      render();
    } else if (action === 'exchange-now') {
      state.exchanged = true;
      state.exchangedAt = new Date().toISOString();
      state.modal = null;
      saveState();
      if (navigator.vibrate) navigator.vibrate([80, 50, 120]);
      render();
    } else if (action === 'open-menu') {
      state.modal = { type: 'menu' };
      render();
    } else if (action === 'reset-confirm') {
      state.modal = { type: 'reset-confirm' };
      render();
    } else if (action === 'reset-now') {
      stopCamera();
      localStorage.removeItem(STORAGE_KEY);
      state.started = false;
      state.screen = 'welcome';
      state.activeTab = 'stamps';
      state.collected = [];
      state.rewardCode = '';
      state.exchanged = false;
      state.exchangedAt = '';
      state.modal = null;
      state.pendingComplete = false;
      render();
    }
  }

  function startMockScan() {
    var preferred = state.modal && findBooth(state.modal.boothId);
    var booth = preferred && state.collected.indexOf(preferred.id) < 0
      ? preferred
      : config.booths.find(function (item) { return state.collected.indexOf(item.id) < 0; });

    if (!booth) {
      setScannerStatus('すべてのスタンプを獲得済みです。');
      return;
    }

    setScannerStatus('QRコードを検出中… そのままお待ちください');
    mockScanTimer = setTimeout(function () {
      if (!state.modal || state.modal.type !== 'scanner') return;
      setScannerStatus('読み取りました！');
      mockScanTimer = setTimeout(function () {
        if (state.modal && state.modal.type === 'scanner') collectStamp(booth.id);
      }, 260);
    }, 1350);
  }
  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScannerStatus('この端末ではカメラを起動できません。下の確認用ボタンをお使いください。', true);
      return;
    }
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (!state.modal || state.modal.type !== 'scanner') {
        stopCamera();
        return;
      }
      var video = document.getElementById('scanner-video');
      if (!video) {
        stopCamera();
        return;
      }
      video.srcObject = cameraStream;
      await video.play();
      var scanner = document.querySelector('.scanner-overlay');
      if (scanner) scanner.classList.add('has-camera');
      if ('BarcodeDetector' in window) {
        try {
          barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
          setScannerStatus('QRコードを枠内に合わせてください');
          scannerFrame = requestAnimationFrame(scanVideoFrame);
        } catch (_error) {
          setScannerStatus('QRが反応しない場合は下の確認用ボタンをお使いください。');
        }
      } else {
        setScannerStatus('QR読み取り非対応のブラウザでは確認用ボタンをお使いください。');
      }
    } catch (_error) {
      setScannerStatus('カメラを利用できませんでした。下の確認用ボタンから動作を確認できます。', true);
    }
  }

  async function scanVideoFrame() {
    var video = document.getElementById('scanner-video');
    if (!video || !barcodeDetector || !state.modal || state.modal.type !== 'scanner') return;
    if (video.readyState >= 2) {
      try {
        var codes = await barcodeDetector.detect(video);
        var matched = null;
        codes.some(function (code) {
          matched = boothFromQr(code.rawValue);
          return Boolean(matched);
        });
        if (matched) {
          collectStamp(matched.id);
          return;
        }
        if (codes.length) setScannerStatus('対象ブースのQRコードではありません。');
      } catch (_error) {
      }
    }
    scannerFrame = requestAnimationFrame(scanVideoFrame);
  }

  function boothFromQr(value) {
    var raw = String(value || '').trim();
    var booth = config.booths.find(function (item) { return item.qrValue === raw; });
    if (booth) return booth;
    try {
      var url = new URL(raw);
      booth = findBooth(url.searchParams.get('stamp'));
      if (booth) return booth;
    } catch (_error) {
    }
    var match = raw.match(/FUJIFILM-STAMP:([a-z0-9-]+)/i);
    return match ? findBooth(match[1]) : null;
  }

  function collectStamp(boothId) {
    var booth = findBooth(boothId);
    if (!booth) {
      setScannerStatus('対象ブースのQRコードではありません。', true);
      return;
    }
    stopCamera();
    var duplicate = state.collected.indexOf(booth.id) >= 0;
    if (!duplicate) {
      state.collected.push(booth.id);
      if (state.collected.length === config.booths.length) {
        state.pendingComplete = true;
        createRewardCode();
      }
      saveState();
      if (navigator.vibrate) navigator.vibrate([45, 35, 90]);
    }
    state.modal = { type: 'stamp', boothId: booth.id, duplicate: duplicate };
    render();
  }

  function stopCamera() {
    if (mockScanTimer) clearTimeout(mockScanTimer);
    mockScanTimer = 0;
    if (scannerFrame) cancelAnimationFrame(scannerFrame);
    scannerFrame = 0;
    barcodeDetector = null;
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (track) { track.stop(); });
      cameraStream = null;
    }
  }

  function setScannerStatus(message, isError) {
    var element = document.getElementById('scanner-status');
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('is-error', Boolean(isError));
  }

  function createRewardCode() {
    if (!state.rewardCode) {
      var day = new Intl.DateTimeFormat('ja-JP', { month: '2-digit', day: '2-digit' }).format(new Date()).replace('/', '');
      state.rewardCode = 'FPX-' + day + '-' + String(Math.floor(1000 + Math.random() * 9000));
    }
    return state.rewardCode;
  }

  function findBooth(id) {
    return config.booths.find(function (booth) { return booth.id === id; });
  }

  function isBoothId(id) {
    return Boolean(findBooth(id));
  }

  function updateLiveTimes() {
    document.querySelectorAll('[data-live-time]').forEach(function (element) {
      element.textContent = formatTime(new Date());
    });
  }

  function formatTime(date) {
    return new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  }

  function formatDateTime(value) {
    if (!value) return '';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(date);
  }

  function LB(value) {
    return E(value).replace(/\n/g, '<br>');
  }

  function E(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }
})();



