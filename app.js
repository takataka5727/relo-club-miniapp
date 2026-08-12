(function () {
  "use strict";

  const config = window.MINI_APP_CONFIG;
  const app = document.getElementById("app");
  const STORAGE = {
    lineConsent: "relo-line-consent-v1",
    linked: "relo-member-linked-v2",
    usedCoupons: "relo-used-coupons-v2",
    favoriteCoupons: "relo-favorite-coupons-v1",
    gacha: "relo-daily-gacha-v1",
  };

  if (!config || !app) throw new Error("アプリ設定を読み込めませんでした。");
  const isLineClient = typeof navigator !== "undefined" && /\bLine\//i.test(navigator.userAgent || "");
  const requiresLocalConsent = config.lineConsent.localPreviewOnly && !isLineClient && localStorage.getItem(STORAGE.lineConsent) !== "true";

  const state = {
    screen: requiresLocalConsent ? "line-consent" : localStorage.getItem(STORAGE.linked) === "true" ? "app" : "verify",
    tab: "home",
    couponFilter: "おすすめ",
    selectedCouponId: null,
    modal: null,
    error: "",
    toast: "",
    usedCoupons: readUsedCoupons(),
    gacha: readGachaState(),
    gachaPhase: "ready",
    gachaPrizeId: null,
    favoriteCoupons: readFavoriteCoupons(),
  };

  const icons = {
    back: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    more: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></svg>',
    close: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    home: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></svg>',
    card: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
    ticket: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9a3 3 0 0 0 0 6v3h20v-3a3 3 0 0 0 0-6V6H2Z"/><path d="M13 6v2m0 3v2m0 3v2"/></svg>',
    menu: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    lock: '<svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    eye: '<svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    check: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
    calendar: '<svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    download: '<svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/></svg>',
    bell: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
    user: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    help: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.1 2.2c-.9.4-.9 1.1-.9 1.8M12 17h.01"/></svg>',
    phone: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1Z"/></svg>',
    logout: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></svg>',
    arrow: '<svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    barcode: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5v14M7 5v14M10 5v14M15 5v14M18 5v14M21 5v14"/></svg>',
    cart: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M3 4h2l2.5 11h11l2-7H7"/></svg>',
    star: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/></svg>',
    starFilled: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="currentColor" d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/></svg>',
  };

  applyTheme();
  render();

  app.addEventListener("click", handleClick);
  app.addEventListener("submit", handleSubmit);
  app.addEventListener("input", handleInput);
  app.addEventListener("keydown", handleKeydown);

  function readUsedCoupons() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE.usedCoupons) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_error) {
      return [];
    }
  }

  function readFavoriteCoupons() {
    const initial = config.coupons[0] ? [config.coupons[0].id] : [];
    try {
      const stored = localStorage.getItem(STORAGE.favoriteCoupons);
      if (stored === null) return initial;
      const value = JSON.parse(stored);
      return Array.isArray(value) ? value : initial;

    } catch (_error) {
      return initial;
    }
  }

  function createEmptyGachaState() {
    return { lastPlayedDate: "", totalPoints: 0, lastPrizeId: null };
  }

  function readGachaState() {
    const initial = createEmptyGachaState();
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE.gacha) || "{}");
      const totalPoints = Number(stored.totalPoints);
      return {
        lastPlayedDate: typeof stored.lastPlayedDate === "string" ? stored.lastPlayedDate : initial.lastPlayedDate,
        totalPoints: Number.isFinite(totalPoints) && totalPoints >= 0 ? totalPoints : initial.totalPoints,
        lastPrizeId: typeof stored.lastPrizeId === "string" ? stored.lastPrizeId : initial.lastPrizeId,
      };
    } catch (_error) {
      return initial;
    }
  }

  function applyTheme() {
    const themeVariables = {
      "--color-primary": config.theme.primary,
      "--color-primary-strong": config.theme.primaryStrong,
      "--color-primary-soft": config.theme.primarySoft,
      "--color-primary-pale": config.theme.primaryPale,
      "--color-accent": config.theme.accent,
      "--color-bg": config.theme.background,
      "--color-surface": config.theme.surface,
      "--color-text": config.theme.text,
      "--color-muted": config.theme.muted,
    };
    Object.entries(themeVariables).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", config.theme.primary);
    document.title = `${config.brand.name} ${config.brand.subName}`;
  }

  function handleClick(event) {
    const actionElement = event.target.closest("[data-action]");
    if (!actionElement) {
      if (event.target.classList.contains("overlay")) closeModal();
      return;
    }
    if (actionElement.tagName === "A") event.preventDefault();

    const action = actionElement.dataset.action;
    if (action === "approve-line-consent") {
      localStorage.setItem(STORAGE.lineConsent, "true");
      state.error = "";
      state.screen = localStorage.getItem(STORAGE.linked) === "true" ? "app" : "verify";
      state.tab = "home";
      render();
      return;
    }
    if (action === "decline-line-consent") {
      state.error = "サービスを利用するには、プロフィール情報へのアクセス許可が必要です。";
      render();
      return;
    }
    if (action === "show-line-consent") {
      state.error = "";
      state.screen = "line-consent";
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
      return;
    }
    if (action === "change-tab") {
      state.tab = actionElement.dataset.tab;
      state.modal = null;
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
      return;
    }
    if (action === "open-gacha") {
      state.tab = "gacha";
      state.modal = null;
      state.gachaPhase = isGachaPlayedToday() ? "result" : "ready";
      state.gachaPrizeId = isGachaPlayedToday() ? state.gacha.lastPrizeId : null;
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
      return;
    }
    if (action === "start-gacha") {
      if (state.gachaPhase === "spinning") return;
      if (isGachaPlayedToday()) {
        state.gachaPhase = "result";
        state.gachaPrizeId = state.gacha.lastPrizeId;
        render();
        return;
      }
      state.gachaPhase = "spinning";
      state.gachaPrizeId = null;
      render();
      window.setTimeout(completeGacha, 1650);
      return;
    }
    if (action === "coupon-filter") {
      state.couponFilter = actionElement.dataset.filter;
      render();
      return;
    }
    if (action === "toggle-favorite") {
      const id = actionElement.dataset.id;
      state.favoriteCoupons = state.favoriteCoupons.includes(id)
        ? state.favoriteCoupons.filter((couponId) => couponId !== id)
        : [...state.favoriteCoupons, id];
      localStorage.setItem(STORAGE.favoriteCoupons, JSON.stringify(state.favoriteCoupons));
      render();
      return;
    }
    if (action === "open-coupon") {
      state.selectedCouponId = actionElement.dataset.id;
      state.modal = "coupon";
      render();
    }
    if (action === "confirm-use") {
      state.modal = "confirm-coupon";
      render();
      return;
    }
    if (action === "show-coupon-code") {
      state.modal = "coupon-code";
      render();
      return;
    }
    if (action === "use-coupon") {
      useSelectedCoupon();
      return;
    }
    if (action === "open-barcode") {
      state.modal = "barcode";
      render();
      return;
    }
    if (action === "open-notices") {
      state.modal = "notices";
      render();
      return;
    }
    if (action === "close-modal") {
      closeModal();
      return;
    }
    if (action === "open-info") {
      state.modal = actionElement.dataset.modal;
      render();
      return;
    }
    if (action === "unlink") {
      state.modal = "confirm-unlink";
      render();
      return;
    }
    if (action === "confirm-unlink") {
      localStorage.removeItem(STORAGE.linked);
      localStorage.removeItem(STORAGE.usedCoupons);
      state.usedCoupons = [];
      state.modal = null;
      localStorage.removeItem(STORAGE.favoriteCoupons);
      localStorage.removeItem(STORAGE.gacha);
      state.screen = "verify";
      state.favoriteCoupons = config.coupons[0] ? [config.coupons[0].id] : [];
      state.gacha = createEmptyGachaState();
      state.gachaPhase = "ready";
      state.gachaPrizeId = null;
      state.tab = "home";
      render();
      return;
    }
    if (action === "open-app") {
      state.screen = "app";
      state.tab = "home";
      render();
      return;
    }
    if (action === "toggle-password") {
      const field = document.getElementById(actionElement.dataset.target);
      if (field) field.type = field.type === "password" ? "text" : "password";
      return;
    }
    if (action === "show-toast") showToast(actionElement.dataset.message || "準備中です");
  }

  function handleSubmit(event) {
    if (event.target.id !== "verification-form") return;
    event.preventDefault();

    const data = new FormData(event.target);
    const memberId = String(data.get("memberId") || "").replace(/\s/g, "");
    const birthDate = String(data.get("birthDate") || "");
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    const passwordConfirm = String(data.get("passwordConfirm") || "");

    if (memberId.length < 8 || !birthDate || !email.includes("@") || password.length < 8) {
      state.error = "入力内容を確認してください。";
      render();
      return;
    }
    if (password !== passwordConfirm) {
      state.error = "確認用パスワードが一致していません。";
      render();
      return;
    }


    state.error = "";
    state.screen = "processing";
    render();
    window.setTimeout(() => {
      localStorage.setItem(STORAGE.linked, "true");
      state.screen = "success";
      render();
    }, 850);
  }

  function handleInput(event) {
    const form = event.target.closest("#verification-form");
    if (!form) return;
    const button = form.querySelector('button[type="submit"]');
    const values = ["memberId", "birthDate", "email", "password", "passwordConfirm"].map((name) => form.elements[name]?.value || "");
    if (button) button.disabled = values.some((value) => !value) || values[3].length < 8 || values[3] !== values[4] || !values[2].includes("@");
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && state.modal) closeModal();
  }

  function closeModal() {
    state.modal = null;
    render();
  }

  function useSelectedCoupon() {
    const coupon = getSelectedCoupon();
    if (!coupon || state.usedCoupons.includes(coupon.id)) return;
    state.usedCoupons = [...state.usedCoupons, coupon.id];
    localStorage.setItem(STORAGE.usedCoupons, JSON.stringify(state.usedCoupons));
    state.modal = null;
    showToast("クーポンを使用済みにしました");
  }

  function showToast(message) {
    state.toast = message;
    render();
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      state.toast = "";
      render();
    }, 2300);
  }

  function getSelectedCoupon() {
    return config.coupons.find((coupon) => coupon.id === state.selectedCouponId);
  }

  function getTodayKey() {
    const today = new Date();
    return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
  }

  function isGachaPlayedToday() {
    return state.gacha.lastPlayedDate === getTodayKey();
  }

  function getCurrentPoints() {
    return Number(config.member.points) + Number(state.gacha.totalPoints || 0);
  }

  function getGachaPrize(id) {
    return config.gacha.prizes.find((prize) => prize.id === id) || null;
  }

  function drawGachaPrize() {
    const prizes = config.gacha.prizes;
    const totalWeight = prizes.reduce((sum, prize) => sum + Number(prize.weight || 0), 0);
    let cursor = Math.random() * totalWeight;
    for (const prize of prizes) {
      cursor -= Number(prize.weight || 0);
      if (cursor < 0) return prize;
    }
    return prizes[prizes.length - 1] || null;
  }

  function completeGacha() {
    if (state.gachaPhase !== "spinning") return;
    const prize = drawGachaPrize();
    if (!prize) {
      state.gachaPhase = "ready";
      render();
      return;
    }
    state.gacha = {
      lastPlayedDate: getTodayKey(),
      totalPoints: Number(state.gacha.totalPoints || 0) + Number(prize.points),
      lastPrizeId: prize.id,
    };
    localStorage.setItem(STORAGE.gacha, JSON.stringify(state.gacha));
    state.gachaPrizeId = prize.id;
    state.gachaPhase = "result";
    render();
  }

  function render() {
    let content = "";
    if (state.screen === "line-consent") content = renderLineConsent();
    if (state.screen === "verify") content = renderVerify();
    if (state.screen === "processing") content = renderProcessing();
    if (state.screen === "success") content = renderSuccess();
    if (state.screen === "app") content = renderApp();
    app.innerHTML = `${renderDeviceStatus()}${content}<span class="device-home-indicator" aria-hidden="true"></span>`;
  }

  function renderDeviceStatus() {
    return `
      <div class="device-status-bar" aria-hidden="true">
        <strong>9:41</strong>
        <span class="device-status-icons">
          <span class="device-signal"><i></i><i></i><i></i><i></i></span>
          <svg class="device-wifi" viewBox="0 0 20 14"><path d="M2 4.5a12 12 0 0 1 16 0M5 8a7.5 7.5 0 0 1 10 0M8.5 11.2a2.6 2.6 0 0 1 3 0"/></svg>
          <span class="device-battery"></span>
        </span>
      </div>`;
  }

  function renderHeader() {
    return `
      <header class="mini-header">
        <button class="header-button" type="button" data-action="show-toast" data-message="LINEに戻ります" aria-label="戻る">${icons.back}</button>
        <div class="mini-header__brand">
          <strong>${escapeHtml(config.brand.name)}</strong>
          <small>${escapeHtml(config.brand.subName)}</small>
        </div>
        <div class="header-actions">
          <button class="header-button" type="button" data-action="show-toast" data-message="メニューを準備中です" aria-label="その他のメニュー">${icons.more}</button>
          <button class="header-button" type="button" data-action="show-toast" data-message="LINEに戻ります" aria-label="閉じる">${icons.close}</button>
        </div>
      </header>`;
  }

  function renderLineConsent() {
    const consent = config.lineConsent;
    return `
      <main class="line-consent-screen screen">
        <header class="line-consent-header">
          <button type="button" data-action="decline-line-consent" aria-label="閉じる">${icons.close}</button>
          <strong>${escapeHtml(consent.title)}</strong>
          <span aria-hidden="true"></span>
        </header>
        <div class="line-consent-content">
          <div class="line-consent-app-icon" aria-hidden="true">${escapeHtml(config.brand.initial)}</div>
          <h1>${escapeHtml(consent.appName)}</h1>
          <p class="line-consent-lead">${escapeHtml(consent.lead)}</p>
          <section class="line-permission-card" aria-labelledby="line-permission-title">
            <span class="line-permission-icon">${icons.user}</span>
            <div>
              <h2 id="line-permission-title">${escapeHtml(consent.permissionTitle)}</h2>
              <p>${escapeHtml(consent.permissionDetail)}</p>
            </div>
          </section>
          <p class="line-consent-purpose">${escapeHtml(consent.purpose)}</p>
          <p class="line-consent-links"><a href="#" data-action="show-toast" data-message="利用規約は公開時に接続します">利用規約</a><span>・</span><a href="#" data-action="show-toast" data-message="プライバシーポリシーは公開時に接続します">プライバシーポリシー</a></p>
          ${state.error ? `<p class="line-consent-error" role="alert">${escapeHtml(state.error)}</p>` : ""}
          <div class="line-consent-actions">
            <button class="line-allow-button" type="button" data-action="approve-line-consent">${escapeHtml(consent.allowLabel)}</button>
            <button class="line-cancel-button" type="button" data-action="decline-line-consent">${escapeHtml(consent.cancelLabel)}</button>
          </div>
        </div>
      </main>
      ${renderToast()}`;
  }

  function renderVerify() {
    return `
      <main class="registration-screen screen">
        ${renderHeader()}
        <div class="registration-content">
          <ol class="progress-steps" aria-label="会員登録の進捗">
            <li class="progress-step is-active"><span class="progress-step__circle">1</span>会員情報入力</li>
            <li class="progress-step"><span class="progress-step__circle">2</span>内容確認</li>
            <li class="progress-step"><span class="progress-step__circle">3</span>登録完了</li>
          </ol>
          <section class="registration-hero">
            <p class="registration-hero__brand">${escapeHtml(config.brand.romanName)}</p>
            <h1><span class="registration-hero__prefix">初回</span>${escapeHtml(config.copy.verifyTitle.replace("初回 ", ""))}</h1>
            <p>${escapeHtml(config.copy.verifyBody)}</p>
            <div class="registration-illustration" aria-hidden="true">
              <span class="registration-illustration__head"></span>
              <span class="registration-illustration__body"></span>
              <span class="registration-illustration__leaf">♢</span>
            </div>
          </section>
          <form class="registration-form" id="verification-form" novalidate>
            ${renderField("member-id", "memberId", "組合員等記号番号（10桁）", "例）9990001234", "数字のみで入力してください", "text")}
            ${renderField("birth-date", "birthDate", "生年月日（8桁）", "", "生年月日を選択してください", "date")}
            ${renderField("email", "email", "メールアドレス", "例）sample@fukuri.jp", "ご登録完了後、本パスワード設定のご案内をお送りします", "email")}
            ${renderPasswordField("password", "password", "パスワード", "半角英数字 8〜16文字")}
            ${renderPasswordField("password-confirm", "passwordConfirm", "パスワード（確認用）", "もう一度入力してください")}
            ${state.error ? `<p class="form-error" role="alert">${escapeHtml(state.error)}</p>` : ""}
            <div class="consent-box">
              <span class="consent-box__lock">${icons.lock}</span>
              <p>ご入力いただいた情報は、リロクラブのサービス提供および本人確認の目的で利用します。<br /><a href="#" data-action="show-toast" data-message="プライバシーポリシーは公開時に接続します">プライバシーポリシーはこちら</a></p>
            </div>
            <button class="primary-button" type="submit">確認画面へ進む ${icons.arrow}</button>
          </form>
        </div>
      </main>
      ${renderToast()}`;
  }

  function renderField(id, name, label, placeholder, hint, type) {
    return `
      <div class="field">
        <div class="field__label-row"><label for="${id}">${label}</label><span class="required-badge">必須</span></div>
        <input id="${id}" name="${name}" type="${type}" value="${escapeHtml(name === "memberId" ? config.verification.exampleMemberId : name === "birthDate" ? config.verification.exampleBirthDate : config.verification.exampleEmail)}" placeholder="${placeholder}" autocomplete="off" />
        <p class="field__hint">※${hint}</p>
      </div>`;
  }

  function renderPasswordField(id, name, label, placeholder) {
    return `
      <div class="field">
        <div class="field__label-row"><label for="${id}">${label}</label><span class="required-badge">必須</span></div>
        <div class="password-wrap">
          <input id="${id}" name="${name}" type="password" value="${escapeHtml(config.verification.examplePassword)}" placeholder="${placeholder}" autocomplete="new-password" />
          <button class="password-toggle" type="button" data-action="toggle-password" data-target="${id}" aria-label="パスワードを表示">${icons.eye}</button>
        </div>
      </div>`;
  }

  function renderProcessing() {
    return `<main class="processing-screen screen"><div class="processing-screen__content"><div class="spinner" aria-hidden="true"></div><p>会員情報を確認しています</p></div></main>`;
  }

  function renderSuccess() {
    return `
      <main class="success-screen screen">
        <div class="success-screen__content">
          <div class="success-mark">${icons.check}</div>
          <h1>${escapeHtml(config.copy.successTitle)}</h1>
          <p>${escapeHtml(config.copy.successBody)}</p>
          <button class="primary-button" type="button" data-action="open-app">ホームへ進む ${icons.arrow}</button>
        </div>
      </main>`;
  }

  function renderApp() {
    return `
      <div class="app-shell screen">
        ${renderHeader()}
        ${state.tab === "member" || state.tab === "coupons" ? renderServiceTabs() : ""}
        <main class="main-content">
          ${state.tab === "home" ? renderHome() : ""}
          ${state.tab === "member" ? renderMember() : ""}
          ${state.tab === "coupons" ? renderCoupons() : ""}
          ${state.tab === "menu" ? renderMenu() : ""}
          ${state.tab === "gacha" ? renderGacha() : ""}
        </main>
        ${renderBottomNav()}
        ${renderModal()}
        ${renderToast()}
      </div>`;
  }

  function renderServiceTabs() {
    return `
      <nav class="service-tabs" aria-label="会員サービス">
        <button class="service-tab ${state.tab === "member" ? "is-active" : ""}" type="button" data-action="change-tab" data-tab="member">${icons.card}<span>会員証</span></button>
        <button class="service-tab ${state.tab === "coupons" ? "is-active" : ""}" type="button" data-action="change-tab" data-tab="coupons">${icons.ticket}<span>クーポン</span></button>
      </nav>`;
  }

  function renderHome() {
    const greeting = config.copy.greeting.replace("{lastName}", config.member.lastName);
    const availableCount = config.coupons.length - state.usedCoupons.length;
    const playedToday = isGachaPlayedToday();
    const todayPrize = getGachaPrize(state.gacha.lastPrizeId);
    return `
      <section class="home-page" aria-labelledby="home-title">
        <div class="home-banner">
          <p class="home-banner__brand">${escapeHtml(config.brand.romanName)}</p>
          <h1 id="home-title">${escapeHtml(greeting)}</h1>
          <p>会員証やお得なクーポンを<br />すぐにご利用いただけます。</p>
          <div class="home-banner__circles" aria-hidden="true">
            <span class="home-banner__circle">${icons.cart}</span>
            <span class="home-banner__circle">${icons.ticket}</span>
            <span class="home-banner__circle">${icons.card}</span>
          </div>
        </div>
        <div class="section-title"><h2>会員証</h2><button class="text-button" type="button" data-action="change-tab" data-tab="member">詳しく見る</button></div>
        <button class="home-member-card" type="button" data-action="change-tab" data-tab="member">
          <img src="${escapeHtml(config.member.cardImage)}" alt="" />
          <span>
            <span class="home-member-card__label">MEMBER</span>
            <span class="home-member-card__name">${escapeHtml(config.member.fullName)} さま</span>
            <span class="home-member-card__id">No. ${escapeHtml(config.member.memberId)}</span>
          </span>
        </button>
        <div class="section-title"><h2>便利なサービス</h2></div>
        <div class="quick-grid">
          <button class="quick-tile" type="button" data-action="change-tab" data-tab="coupons">
            <span class="quick-tile__icon">${icons.ticket}</span><span><strong>クーポン</strong><small>利用可能 ${availableCount}枚</small></span>
          </button>
          <button class="quick-tile" type="button" data-action="open-notices">
            <span class="quick-tile__icon">${icons.bell}</span><span><strong>お知らせ</strong><small>最新情報を確認</small></span>
          </button>
        </div>
        <button class="daily-gacha-card ${playedToday ? "is-complete" : ""}" type="button" data-action="open-gacha">
          <span class="daily-gacha-card__copy">
            <span class="daily-gacha-card__badge">1日1回</span>
            <strong>${escapeHtml(config.gacha.title)}</strong>
            <small>ガチャを回して最大100ポイント</small>
            <span class="daily-gacha-card__status">${playedToday && todayPrize ? `本日は${Number(todayPrize.points).toLocaleString()}ポイント獲得済み` : "今日のチャレンジに参加する"} ${icons.arrow}</span>
          </span>
          <span class="daily-gacha-card__visual" aria-hidden="true">
            <span class="daily-gacha-card__dome"><i></i><i></i><i></i><b>R</b></span>
            <span class="daily-gacha-card__base"><i></i></span>
          </span>
        </button>
      </section>`;
  }

  function renderGacha() {
    const playedToday = isGachaPlayedToday();
    const phase = state.gachaPhase === "spinning" ? "spinning" : playedToday ? "result" : "ready";
    const prize = getGachaPrize(state.gachaPrizeId || state.gacha.lastPrizeId);
    return `
      <section class="gacha-page" aria-labelledby="gacha-title">
        <header class="gacha-page__header">
          <button class="gacha-back-button" type="button" data-action="change-tab" data-tab="home" aria-label="ホームへ戻る">${icons.back}</button>
          <div><p>DAILY CHANCE</p><h1 id="gacha-title">${escapeHtml(config.gacha.title)}</h1></div>
          <span class="gacha-point-balance"><small>保有</small>${getCurrentPoints().toLocaleString()}P</span>
        </header>
        <div class="gacha-stage">
          <p class="gacha-stage__lead">1日1回無料<br /><strong>最大100ポイント</strong>が当たる！</p>
          <div class="gacha-machine is-${phase}" aria-hidden="true">
            <div class="gacha-machine__sign">RELO CLUB GACHA</div>
            <div class="gacha-machine__drum">
              <span class="gacha-ball gacha-ball--1">1</span><span class="gacha-ball gacha-ball--2">5</span><span class="gacha-ball gacha-ball--3">10</span>
              <span class="gacha-ball gacha-ball--4">30</span><span class="gacha-ball gacha-ball--5">100</span><span class="gacha-ball gacha-ball--6">P</span>
              <span class="gacha-machine__rotor">R</span>
            </div>
            <div class="gacha-machine__base">
              <span class="gacha-machine__handle"><i></i></span>
              <span class="gacha-machine__chute"><i class="gacha-capsule"></i></span>
            </div>
          </div>
          ${phase === "ready" ? `<div class="gacha-action"><p>今日のチャンスはまだ残っています</p><button class="primary-button gacha-spin-button" type="button" data-action="start-gacha">ガチャを回す</button><small>抽選後、ポイントはすぐに加算されます</small></div>` : ""}
          ${phase === "spinning" ? `<div class="gacha-drawing" role="status" aria-live="polite"><span></span><strong>抽選中...</strong><small>カプセルが出るまでお待ちください</small></div>` : ""}
          ${phase === "result" && prize ? `<div class="gacha-result" role="status" aria-live="polite"><p>おめでとうございます！</p><strong>${Number(prize.points).toLocaleString()}<small>ポイント</small></strong><span>獲得しました</span><div>現在の保有ポイント <b>${getCurrentPoints().toLocaleString()}P</b></div><button class="secondary-button" type="button" data-action="change-tab" data-tab="home">ホームへ戻る</button><small>次回は明日チャレンジできます</small></div>` : ""}
        </div>
        <section class="gacha-prize-list" aria-labelledby="gacha-prize-title">
          <div><p>PRIZE LINEUP</p><h2 id="gacha-prize-title">当たるポイント</h2></div>
          <ul>${config.gacha.prizes.map((item) => `<li class="${Number(item.points) === 100 ? "is-jackpot" : ""}"><strong>${Number(item.points).toLocaleString()}</strong><span>ポイント</span></li>`).join("")}</ul>
          <p>獲得したポイントは会員証画面で確認できます。</p>
        </section>
      </section>`;
  }

  function renderMember() {
    return `
      <section class="member-page" aria-labelledby="member-title">
        <h1 id="member-title" class="visually-hidden">デジタル会員証</h1>
        <div class="member-card-image"><img src="${escapeHtml(config.member.cardImage)}" alt="${escapeHtml(config.brand.name)} 会員証" /></div>
        <div class="member-presentation-copy">
          <strong>${escapeHtml(config.member.instruction)}</strong>
          <p>${escapeHtml(config.member.instructionDetail)}</p>
        </div>
        <div class="member-credential-card">
          <section class="credential-block">
            <div class="credential-label">有効期限</div>
            <div class="credential-date"><span>${escapeHtml(config.member.dailyValidityLabel)}</span><strong>${formatToday()}</strong></div>
            <p class="credential-caption">Valid for the date shown only.</p>
          </section>
          <section class="credential-block">
            <div class="credential-label">会員ID / MEMBER ID</div>
            <strong class="member-id-number">${escapeHtml(config.member.memberId)}</strong>
            <button class="member-inline-barcode" type="button" data-action="open-barcode" aria-label="会員証バーコードを拡大">
              ${renderBarcode(config.member.memberId)}
            </button>
          </section>
        </div>
        <div class="points-panel">
          <div class="points-panel__balance">
            <span>保有ポイント</span>
            <strong>${getCurrentPoints().toLocaleString()}<small>P</small></strong>
            <span class="points-panel__expiry">有効期限 ${escapeHtml(config.member.pointsValidThrough)}</span>
          </div>
          <button class="points-use-button" type="button" data-action="open-info" data-modal="native-app">ポイント利用</button>
        </div>
        <div class="member-account-summary">
          <div><span>会員名</span><strong>${escapeHtml(config.member.fullName)} さま</strong></div>
          <div><span>会員種別</span><strong>${escapeHtml(config.member.tierJa)}</strong></div>
        </div>
      </section>`;
  }

  function renderCoupons() {
    const selected = state.couponFilter;
    const isRecommended = selected === "おすすめ";
    const visible = isRecommended
      ? config.coupons.filter((coupon) => coupon.featured)
      : config.coupons.filter((coupon) => coupon.category === selected);
    const panelTitle = isRecommended ? "おすすめクーポン" : `${selected}のクーポン`;
    return `
      <section class="coupon-page" aria-labelledby="coupon-title">
        <header class="coupon-list-header">
          <h1 id="coupon-title">${escapeHtml(config.copy.couponHeading)}</h1>
          <p>利用できるクーポン ${config.coupons.length}件</p>
        </header>
        <nav class="coupon-category-tabs" role="tablist" aria-label="クーポンのジャンル">
          ${config.couponFilters.map((filter) => `<button class="coupon-category-tab ${selected === filter ? "is-active" : ""}" type="button" role="tab" aria-selected="${selected === filter}" aria-controls="coupon-tab-panel" data-action="coupon-filter" data-filter="${escapeHtml(filter)}">${escapeHtml(filter)}</button>`).join("")}
        </nav>
        <section class="coupon-section coupon-tab-panel" id="coupon-tab-panel" role="tabpanel" aria-labelledby="coupon-tab-title">
          <div class="coupon-section-heading"><h2 id="coupon-tab-title">${escapeHtml(panelTitle)}</h2><span>${visible.length}件</span></div>
          ${visible.length === 0 ? `<p class="empty-state">このジャンルで利用できるクーポンはありません。</p>` : isRecommended ? `<div class="recommended-coupon-scroll">${visible.map(renderRecommendedCoupon).join("")}</div>` : `<div class="coupon-list">${visible.map(renderCouponItem).join("")}</div>`}
        </section>
      </section>`;
  }

  function renderRecommendedCoupon(coupon) {
    const used = state.usedCoupons.includes(coupon.id);
    const benefit = coupon.benefit.replace(/\s+/g, " ");
    return `
      <article class="recommended-coupon-card ${used ? "is-used" : ""}">
        <button type="button" data-action="open-coupon" data-id="${escapeHtml(coupon.id)}">
          <span class="recommended-coupon-card__image"><img src="${escapeHtml(coupon.image)}" alt="" /></span>
          <span class="recommended-coupon-card__body">
            <span class="category-badge">${escapeHtml(coupon.category)}</span>
            <strong>${escapeHtml(coupon.service)}</strong>
            <span>${escapeHtml(coupon.title)} <em>${used ? "使用済み" : escapeHtml(benefit)}</em></span>
          </span>
        </button>
      </article>`;
  }

  function renderCouponItem(coupon) {
    const used = state.usedCoupons.includes(coupon.id);
    const favorite = state.favoriteCoupons.includes(coupon.id);
    const benefit = coupon.benefit.replace(/\s+/g, " ");
    return `
      <article class="coupon-item ${used ? "is-used" : ""}">
        <button class="coupon-item__content" type="button" data-action="open-coupon" data-id="${escapeHtml(coupon.id)}">
          <span class="coupon-item__image-shell"><img class="coupon-item__image" src="${escapeHtml(coupon.image)}" alt="" /></span>
          <span class="coupon-item__main">
            <span class="coupon-item__expiry"><b>有効期限</b>${escapeHtml(formatCouponExpiry(coupon.expires))}</span>
            <span class="category-badge category-badge--${escapeHtml(coupon.category)}">${escapeHtml(coupon.category)}</span>
            <strong class="coupon-item__service">${escapeHtml(coupon.service)}</strong>
            <span class="coupon-item__offer">${escapeHtml(coupon.title)} <em>${used ? "使用済み" : escapeHtml(benefit)}</em></span>
          </span>
        </button>
        <button class="favorite-button ${favorite ? "is-favorite" : ""}" type="button" data-action="toggle-favorite" data-id="${escapeHtml(coupon.id)}" aria-label="${favorite ? "お気に入りから削除" : "お気に入りに追加"}">${favorite ? icons.starFilled : icons.star}</button>
      </article>`;
  }

  function renderMenu() {
    return `
      <section class="menu-page" aria-labelledby="menu-title">
        <h1 class="menu-title" id="menu-title">メニュー</h1>
        <div class="profile-card">
          <span class="profile-avatar">${escapeHtml(config.member.lastName.slice(0,1))}</span>
          <div><p class="profile-name">${escapeHtml(config.member.fullName)} さま</p><p class="profile-meta">${escapeHtml(config.member.tierJa)} ・ ${escapeHtml(config.member.memberId)}</p></div>
        </div>
        <section class="menu-section">
          <h2>会員情報</h2>
          <div class="menu-list">
            ${renderMenuRow("user", "登録情報の確認・変更", "show-toast", "会員情報ページは準備中です")}
            ${renderMenuRow("card", "会員ステータス", "open-info", "", "membership")}
            ${renderMenuRow("user", "LINE連携・アクセス権限", "show-line-consent")}
          </div>
        </section>
        <section class="menu-section">
          <h2>サポート</h2>
          <div class="menu-list">
            ${renderMenuRow("help", "よくあるご質問", "show-toast", "よくあるご質問は準備中です")}
            ${renderMenuRow("phone", "お問い合わせ", "open-info", "", "contact")}
          </div>
        </section>
        <section class="menu-section"><div class="menu-list"><button class="menu-row menu-row--danger" type="button" data-action="unlink">${icons.logout}<span class="menu-row__label">会員情報の連携を解除</span>${icons.arrow}</button></div></section>
      </section>`;
  }

  function renderMenuRow(icon, label, action, message, modal) {
    return `<button class="menu-row" type="button" data-action="${action}" ${message ? `data-message="${escapeHtml(message)}"` : ""} ${modal ? `data-modal="${escapeHtml(modal)}"` : ""}>${icons[icon]}<span class="menu-row__label">${escapeHtml(label)}</span>${icons.arrow}</button>`;
  }

  function renderBottomNav() {
    const tabs = [["home","home","ホーム"],["member","card","会員証"],["coupons","ticket","クーポン"],["menu","menu","メニュー"]];
    return `
      <nav class="bottom-nav" aria-label="メインメニュー">
        ${tabs.map(([tab,icon,label]) => `<button class="nav-button ${state.tab === tab ? "is-active" : ""}" type="button" data-action="change-tab" data-tab="${tab}" ${state.tab === tab ? 'aria-current="page"' : ""}>${icons[icon]}<span>${label}</span></button>`).join("")}
      </nav>`;
  }

  function renderModal() {
    if (!state.modal) return "";
    if (state.modal === "coupon") return renderCouponModal();
    if (state.modal === "confirm-coupon") return renderConfirmCouponModal();
    if (state.modal === "coupon-code") return renderCouponCodeModal();
    if (state.modal === "barcode") return renderBarcodeModal();
    if (state.modal === "notices") return renderNoticesModal();
    if (state.modal === "confirm-unlink") return renderUnlinkModal();
    if (state.modal === "membership") return renderMembershipModal();
    if (state.modal === "native-app") return renderNativeAppModal();
    if (state.modal === "contact") return renderContactModal();
    return "";
  }

  function renderSheet(content, id) {
    return `<div class="overlay" role="presentation"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="${id}"><div class="sheet__handle" aria-hidden="true"></div>${content}</section></div>`;
  }

  function renderSheetHeader(title, id) {
    return `<header class="sheet__header"><h2 id="${id}">${escapeHtml(title)}</h2><button class="sheet__close" type="button" data-action="close-modal" aria-label="閉じる">${icons.close}</button></header>`;
  }

  function renderCouponModal() {
    const coupon = getSelectedCoupon();
    if (!coupon) return "";
    const used = state.usedCoupons.includes(coupon.id);
    const content = `
      ${renderSheetHeader("クーポン詳細", "coupon-modal-title")}
      <div class="coupon-detail">
        <img class="coupon-detail-image" src="${escapeHtml(coupon.image)}" alt="" />
        <span class="coupon-detail-benefit">${used ? "使用済み" : escapeHtml(coupon.benefit)}</span>
        <h3>${escapeHtml(coupon.shortTitle)}</h3>
        <p class="coupon-detail__description">${escapeHtml(coupon.description)}</p>
        <div class="coupon-detail__expiry">${icons.calendar}<span>有効期限 ${escapeHtml(coupon.expiresLabel)}</span></div>
        <ul class="coupon-detail__terms">${coupon.terms.map((term) => `<li>${escapeHtml(term)}</li>`).join("")}</ul>
        <button class="primary-button" type="button" data-action="${used ? "close-modal" : "confirm-use"}" ${used ? "disabled" : ""}>${used ? "使用済み" : "このクーポンを使う"}</button>
      </div>`;
    return renderSheet(content, "coupon-modal-title");
  }

  function renderConfirmCouponModal() {
    const content = `<div class="confirmation"><div class="confirmation__icon">${icons.ticket}</div><h2 id="confirm-coupon-title">クーポンを使用しますか？</h2><p>バーコードとクーポンコードを表示します。<br />スタッフの前で操作してください。</p><div class="confirmation__actions"><button class="primary-button" type="button" data-action="show-coupon-code">コードを表示する</button><button class="secondary-button" type="button" data-action="close-modal">キャンセル</button></div></div>`;
    return renderSheet(content, "confirm-coupon-title");
  }


  function renderCouponCodeModal() {
    const coupon = getSelectedCoupon();
    if (!coupon) return "";
    const content = `
      ${renderSheetHeader("クーポンを提示", "coupon-code-modal-title")}
      <div class="coupon-pass">
        <p class="coupon-pass__eyebrow">STAFF PRESENTATION</p>
        <div class="coupon-pass__summary">
          <img src="${escapeHtml(coupon.image)}" alt="" />
          <div>
            <span class="coupon-pass__benefit">${escapeHtml(coupon.benefit)}</span>
            <h3>${escapeHtml(coupon.shortTitle)}</h3>
          </div>
        </div>
        <p class="coupon-pass__instruction">スタッフに下のバーコードまたはクーポンコードをご提示ください。</p>
        <div class="coupon-pass__barcode">${renderBarcode(coupon.code)}</div>
        <p class="coupon-pass__code-label">クーポンコード</p>
        <p class="coupon-pass__code">${escapeHtml(coupon.code)}</p>
        <p class="coupon-pass__note">会計処理が終わるまで「利用を完了する」を押さないでください。</p>
        <div class="coupon-pass__actions">
          <button class="primary-button" type="button" data-action="use-coupon">利用を完了する</button>
          <button class="secondary-button" type="button" data-action="close-modal">あとで使う</button>
        </div>
      </div>`;
    return renderSheet(content, "coupon-code-modal-title");
  }
  function renderBarcodeModal() {
    const content = `${renderSheetHeader("デジタル会員証", "barcode-modal-title")}<div class="barcode-modal"><p>受付スタッフにこの画面をご提示ください。</p><div class="barcode-modal__code">${renderBarcode(config.member.memberId)}</div></div>`;
    return renderSheet(content, "barcode-modal-title");
  }

  function renderNoticesModal() {
    const content = `${renderSheetHeader("お知らせ", "notices-modal-title")}<div>${config.notices.map((notice) => `<article class="notice-item"><p class="notice-date">${escapeHtml(notice.date)}</p><h3 class="notice-title">${escapeHtml(notice.title)}</h3><p class="notice-body">${escapeHtml(notice.body)}</p></article>`).join("")}</div>`;
    return renderSheet(content, "notices-modal-title");
  }

  function renderUnlinkModal() {
    const content = `<div class="confirmation"><div class="confirmation__icon">${icons.logout}</div><h2 id="unlink-modal-title">連携を解除しますか？</h2><p>会員証を表示するには、再度会員情報の入力が必要になります。</p><div class="confirmation__actions"><button class="primary-button" type="button" data-action="confirm-unlink">連携を解除する</button><button class="secondary-button" type="button" data-action="close-modal">キャンセル</button></div></div>`;
    return renderSheet(content, "unlink-modal-title");
  }

  function renderMembershipModal() {
    const content = `${renderSheetHeader("会員ステータス", "membership-modal-title")}<div><article class="notice-item"><p class="notice-date">会員種別</p><h3 class="notice-title">${escapeHtml(config.member.tierJa)}</h3></article><article class="notice-item"><p class="notice-date">会員番号</p><h3 class="notice-title">${escapeHtml(config.member.memberId)}</h3></article><article class="notice-item"><p class="notice-date">有効期限</p><h3 class="notice-title">${escapeHtml(config.member.validThrough)}</h3></article></div>`;
    return renderSheet(content, "membership-modal-title");
  }

  function renderNativeAppModal() {
    const content = `${renderSheetHeader("ポイント利用", "native-app-modal-title")}<div class="native-app-sheet"><img class="native-app-sheet__icon" src="${escapeHtml(config.nativeApp.icon)}" alt="RELO CLUB アプリアイコン" /><p class="native-app-sheet__eyebrow">NATIVE APP ONLY</p><h3>ポイント利用はアプリから</h3><p class="native-app-sheet__description">ポイントを利用するには、リロクラブ公式アプリが必要です。App Storeからアプリを開いてお手続きください。</p><div class="native-app-sheet__points"><span>現在の保有ポイント</span><strong>${getCurrentPoints().toLocaleString()}P</strong></div><a class="app-store-button" href="${escapeHtml(config.nativeApp.appStoreUrl)}" target="_blank" rel="noopener noreferrer">App Storeで開く ${icons.arrow}</a><button class="secondary-button" type="button" data-action="close-modal">キャンセル</button></div>`;
    return renderSheet(content, "native-app-modal-title");
  }

  function renderContactModal() {
    const content = `${renderSheetHeader("お問い合わせ", "contact-modal-title")}<div class="confirmation"><div class="confirmation__icon">${icons.phone}</div><h2>${escapeHtml(config.brand.facilityName)}</h2><p>受付時間 10:00〜18:00<br />${escapeHtml(config.facility.phone)}</p><button class="primary-button" type="button" data-action="show-toast" data-message="電話発信は公開時に接続します">電話をかける</button></div>`;
    return renderSheet(content, "contact-modal-title");
  }

  function formatCouponExpiry(value) {
    return `${String(value).replaceAll(".", "/")} 23:59`;
  }

  function formatToday() {
    const today = new Date();
    return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("/");
  }

  function renderBarcode(value) {
    const patterns = [
      "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212",
      "112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131",
      "311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321",
      "112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133121",
      "313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
      "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114",
      "122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212",
      "124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113",
      "114311","411113","411311","113141","114131","311141","411131","211412","211214","211232","2331112",
    ];
    const text = String(value);
    const useCodeC = /^\d+$/.test(text) && text.length % 2 === 0;
    const startCode = useCodeC ? 105 : 104;
    const dataCodes = useCodeC
      ? text.match(/.{2}/g).map(Number)
      : Array.from(text, (char) => Math.min(94, Math.max(0, char.charCodeAt(0) - 32)));
    const checksum = (startCode + dataCodes.reduce((sum, code, index) => sum + code * (index + 1), 0)) % 103;
    const pattern = [startCode, ...dataCodes, checksum, 106].map((code) => patterns[code]).join("");
    const totalModules = Array.from(pattern).reduce((sum, module) => sum + Number(module), 0);
    const bars = Array.from(pattern, (module, index) => `<span style="width:${(Number(module) / totalModules * 100).toFixed(4)}%;background-color:${index % 2 === 0 ? "#111" : "transparent"}"></span>`).join("");
    return `<span class="barcode barcode--code128" aria-hidden="true">${bars}</span><span class="barcode-number">${escapeHtml(text)}</span>`;
  }

  function renderToast() {
    return state.toast ? `<div class="toast" role="status">${escapeHtml(state.toast)}</div>` : "";
  }

  function escapeHtml(value) {
    return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }
})();
