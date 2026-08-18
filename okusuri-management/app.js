(function () {
  "use strict";

  var config = window.MINI_APP_CONFIG;
  var app = document.getElementById("app");
  if (!config || !app) {
    throw new Error("MINI_APP_CONFIG または #app が見つかりません。");
  }

  var validViews = config.navigation.map(function (item) {
    return item.id;
  });
  var today = startOfDay(new Date());
  var ui = {
    modal: null,
    editingMedicineId: null,
    productId: null,
    draftName: "",
    searchQuery: "",
    calendarOffset: 0,
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date, amount) {
    var result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    result.setDate(result.getDate() + amount);
    return result;
  }

  function dateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function parseDate(value) {
    var parts = String(value).split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function sameDay(first, second) {
    return dateKey(first) === dateKey(second);
  }

  function formatToday(date) {
    var weekdays = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
    return date.getMonth() + 1 + "月" + date.getDate() + "日 " + weekdays[date.getDay()];
  }

  function formatShortDate(date) {
    var weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return date.getMonth() + 1 + "月" + date.getDate() + "日（" + weekdays[date.getDay()] + "）";
  }

  function timingById(id) {
    return (
      config.timings.find(function (timing) {
        return timing.id === id;
      }) || config.timings[0]
    );
  }

  function slotKey(medicineId, timingId) {
    return medicineId + "--" + timingId;
  }

  function moodById(id) {
    return (
      config.health.moods.find(function (mood) {
        return mood.id === id;
      }) || config.health.moods[1]
    );
  }

  function currentTimeValue() {
    var now = new Date();
    return String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  }

  function scheduleForDate(date, medicines) {
    var key = dateKey(date);
    var schedule = [];
    (medicines || []).forEach(function (medicine) {
      if (medicine.startDate && key < medicine.startDate) return;
      if (medicine.endDate && key > medicine.endDate) return;
      (medicine.timings || []).forEach(function (timingId) {
        var timing = timingById(timingId);
        schedule.push({
          key: slotKey(medicine.id, timingId),
          medicine: medicine,
          timing: timing,
        });
      });
    });
    return schedule.sort(function (first, second) {
      return first.timing.time.localeCompare(second.timing.time);
    });
  }

  function buildInitialState() {
    var medicines = config.defaultMedicines.map(function (medicine) {
      return {
        id: medicine.id,
        productId: medicine.productId,
        name: medicine.name,
        maker: medicine.maker,
        category: medicine.category,
        color: medicine.color,
        image: medicine.image || null,
        timings: medicine.timings.slice(),
        startDate: dateKey(addDays(today, -Math.abs(medicine.registeredDaysAgo || 0))),
        endDate: medicine.endDate || null,
      };
    });
    var records = {};

    for (var offset = 1; offset <= 18; offset += 1) {
      var targetDate = addDays(today, -offset);
      var key = dateKey(targetDate);
      var schedule = scheduleForDate(targetDate, medicines);
      records[key] = {};
      schedule.forEach(function (slot, index) {
        var status = "taken";
        if (offset % 9 === 0 && index === 0) status = "missed";
        if (offset % 7 === 0 && index === 0) status = "later";
        records[key][slot.key] = status;
      });
    }

    return {
      medicines: medicines,
      records: records,
      healthLogs: {},
      recordTimes: {},
      notificationEnabled: true,
    };
  }

  function migrateSavedState(saved) {
    var records = saved.records;
    var medicines = saved.medicines.map(function (medicine) {
      if (medicine.id === "medicine-vitamin-c") {
        var heparize = config.defaultMedicines.find(function (item) {
          return item.productId === "heparize-plus";
        });
        if (heparize) {
          return {
            id: heparize.id,
            productId: heparize.productId,
            name: heparize.name,
            maker: heparize.maker,
            category: heparize.category,
            color: heparize.color,
            image: heparize.image,
            timings: medicine.timings || heparize.timings.slice(),
            startDate: medicine.startDate,
            endDate: medicine.endDate,
          };
        }
      }
      var product = config.productCatalog.find(function (item) {
        return item.id === medicine.productId;
      });
      return Object.assign({}, medicine, {
        image: product ? product.image : medicine.image || null,
      });
    });

    Object.keys(records).forEach(function (dayKey) {
      Object.keys(records[dayKey]).forEach(function (key) {
        if (key.indexOf("medicine-vitamin-c--") === 0) {
          var migratedKey = key.replace("medicine-vitamin-c--", "medicine-heparize--");
          records[dayKey][migratedKey] = records[dayKey][key];
          delete records[dayKey][key];
        }
      });
    });

    return {
      medicines: medicines,
      records: records,
      healthLogs: saved.healthLogs || {},
      recordTimes: saved.recordTimes || {},
      notificationEnabled: saved.notificationEnabled !== false,
    };
  }

  var storage = {
    load: function () {
      try {
        var saved = JSON.parse(localStorage.getItem(config.storageKey) || "null");
        if (
          saved &&
          Array.isArray(saved.medicines) &&
          saved.records &&
          typeof saved.records === "object"
        ) {
          return migrateSavedState(saved);
        }
      } catch (error) {
        // 壊れたローカルデータは初期状態へ戻す。
      }
      return buildInitialState();
    },
    save: function (value) {
      localStorage.setItem(config.storageKey, JSON.stringify(value));
    },
    clear: function () {
      localStorage.removeItem(config.storageKey);
    },
  };
  var state = storage.load();
  storage.save(state);

  function applyConfig() {
    Object.keys(config.theme).forEach(function (key) {
      var cssName = "--" + key.replace(/[A-Z]/g, function (letter) {
        return "-" + letter.toLowerCase();
      });
      document.documentElement.style.setProperty(cssName, config.theme[key]);
    });
    document.title = config.brand.name + "｜" + config.brand.company;
    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", config.theme.primary);
  }

  function icon(name) {
    var paths = {
      home: '<path d="M3 10.8 12 3l9 7.8v9.1a1.1 1.1 0 0 1-1.1 1.1h-5.4v-6.5h-5V21H4.1A1.1 1.1 0 0 1 3 19.9z"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      arrow: '<path d="m9 18 6-6-6-6"/>',
      chevronLeft: '<path d="m15 18-6-6 6-6"/>',
      chevronRight: '<path d="m9 18 6-6-6-6"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
      edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
      history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
      shield: '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/>',
      spark: '<path d="m12 3 1.5 4.2L18 9l-4.5 1.8L12 15l-1.5-4.2L6 9l4.5-1.8z"/>',
      trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
    };
    return (
      '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      (paths[name] || paths.spark) +
      "</svg>"
    );
  }

  function currentView() {
    var hashView = window.location.hash.replace("#", "");
    return validViews.indexOf(hashView) >= 0 ? hashView : "home";
  }

  function navigate(view) {
    if (validViews.indexOf(view) < 0) return;
    ui.modal = null;
    if (view !== "register") ui.searchQuery = "";
    if (currentView() === view) {
      render();
      return;
    }
    window.location.hash = view;
  }

  function statusFor(date, key) {
    var dayRecords = state.records[dateKey(date)] || {};
    return dayRecords[key] || null;
  }

  function updateRecord(date, key, status) {
    var dayKey = dateKey(date);
    if (!state.records[dayKey]) state.records[dayKey] = {};
    state.records[dayKey][key] = status;
    storage.save(state);
  }

  function dailyStatus(date) {
    var schedule = scheduleForDate(date, state.medicines);
    if (!schedule.length) return null;
    var statuses = schedule.map(function (slot) {
      return statusFor(date, slot.key);
    });
    if (
      statuses.length &&
      statuses.every(function (status) {
        return status === "taken";
      })
    ) {
      return "taken";
    }
    if (sameDay(date, today)) {
      return statuses.some(function (status) {
        return status === "later";
      })
        ? "later"
        : null;
    }
    if (date > today) return null;
    if (
      statuses.some(function (status) {
        return status === "later";
      }) &&
      !statuses.some(function (status) {
        return status === "missed" || status === null;
      })
    ) {
      return "later";
    }
    return "missed";
  }

  function currentStreak() {
    var cursor = today;
    var dates = [];
    if (dailyStatus(cursor) !== "taken") cursor = addDays(cursor, -1);
    while (dates.length < 365 && dailyStatus(cursor) === "taken") {
      dates.push(dateKey(cursor));
      cursor = addDays(cursor, -1);
    }
    return {
      count: dates.length,
      dates: dates,
    };
  }

  function streakEncouragement(count) {
    if (count >= 30) return "すごい！すっかり毎日の習慣です";
    if (count >= 7) return "1週間達成！この調子です";
    if (count >= 3) return "いいリズムで続いています";
    if (count > 0) return "いいスタートです";
    return "今日の記録から始まります";
  }

  function greetingText() {
    var hour = new Date().getHours();
    var greeting = hour < 11 ? "おはようございます" : hour < 18 ? "こんにちは" : "こんばんは";
    return config.profile.firstName + "さん、" + greeting;
  }

  function renderMedicineVisual(medicine) {
    if (medicine.image) {
      return (
        '<span class="medicine-visual medicine-visual--photo"><img src="' +
        escapeHtml(medicine.image) +
        '" alt="' +
        escapeHtml(medicine.name + "の商品画像") +
        '" loading="lazy" /></span>'
      );
    }
    return (
      '<span class="medicine-visual" style="--medicine-color:' +
      escapeHtml(medicine.color || config.theme.primary) +
      '" aria-hidden="true"></span>'
    );
  }

  function renderHeader() {
    return (
      '<header class="app-header">' +
      '<div class="brand-lockup"><span class="brand-mark">' +
      escapeHtml(config.brand.mark) +
      '</span><span class="brand-lockup__copy"><strong>' +
      escapeHtml(config.brand.name) +
      "</strong><small>" +
      escapeHtml(config.brand.company) +
      '</small></span></div><span class="header-cheer"><i>✦</i> 毎日コツコツ</span></header>'
    );
  }

  function renderScheduleCard(slot) {
    var status = statusFor(today, slot.key);
    var isRecorded = status === "taken" || status === "missed";
    var statusHtml =
      status === "taken"
        ? '<span class="status-mark status-mark--taken" aria-label="服用済み">✓</span>'
        : status === "later"
          ? '<span class="status-mark status-mark--later" aria-label="あとで記録">△</span>'
          : status === "missed"
            ? '<span class="status-mark status-mark--missed" aria-label="服用しなかった">×</span>'
            : '<span class="status-mark status-mark--pending" aria-hidden="true"></span>';

    var dayKey = dateKey(today);
    var healthLog = state.healthLogs[dayKey] || null;
    var recordedMood = healthLog ? moodById(healthLog.mood) : null;
    var recordedTime = (state.recordTimes[dayKey] || {})[slot.key] || "";
    var recordedTitle =
      status === "missed"
        ? healthLog
          ? "服用しなかった・体調を記録済み"
          : "服用しなかったと記録済み"
        : healthLog
          ? "服用・体調を記録済み"
          : "服用を記録しました";
    var recordedDetail = healthLog
      ? (recordedTime ? recordedTime + "・" : "") + recordedMood.label
      : "タップして記録を編集できます";
    var actions = isRecorded
      ? '<button class="recorded-state' +
        (status === "missed" ? " recorded-state--missed" : "") +
        '" type="button" data-record="' +
        escapeHtml(slot.key) +
        '" data-status="taken" aria-label="服用・体調記録を編集">' +
        (status === "taken" ? icon("check") : '<span class="recorded-state__symbol">×</span>') +
        "<span><strong>" +
        escapeHtml(recordedTitle) +
        "</strong><small>" +
        escapeHtml(recordedDetail) +
        "</small></span>" +
        (recordedMood ? '<b class="recorded-mood">' + escapeHtml(recordedMood.emoji) + "</b>" : "") +
        "</button>"
      : '<button class="primary-button" type="button" data-record="' +
        escapeHtml(slot.key) +
        '" data-status="taken">' +
        icon("check") +
        '<span>服用しました</span></button><button class="ghost-button" type="button" data-record="' +
        escapeHtml(slot.key) +
        '" data-status="later">あとで</button>';

    return (
      '<article class="medicine-card' +
      (status === "taken" ? " is-taken is-recorded" : status === "missed" ? " is-missed is-recorded" : "") +
      '"><div class="medicine-card__main">' +
      renderMedicineVisual(slot.medicine) +
      '<div class="medicine-card__copy"><h3>' +
      escapeHtml(slot.medicine.name) +
      '</h3><div class="medicine-meta"><span class="time-badge">' +
      icon("clock") +
      escapeHtml(slot.timing.label + " " + slot.timing.time) +
      "</span><span>" +
      escapeHtml(slot.medicine.category || "おくすり") +
      "</span></div></div>" +
      statusHtml +
      '</div><div class="medicine-card__actions">' +
      actions +
      "</div></article>"
    );
  }
  function renderHome() {
    var schedule = scheduleForDate(today, state.medicines);
    var takenCount = schedule.filter(function (slot) {
      return statusFor(today, slot.key) === "taken";
    }).length;
    var percent = schedule.length ? Math.round((takenCount / schedule.length) * 100) : 0;
    var completed = schedule.length > 0 && takenCount === schedule.length;
    var summaryTitle = completed ? config.copy.completeTitle : config.copy.homeTitle;
    var summaryBody = completed
      ? config.copy.completeBody
      : "本日は" + schedule.length + "回の服用予定があります";
    var streak = currentStreak();
    var streakHtml =
      streak.count > 0
        ? '<div class="streak-pill"><span class="streak-pill__fire">🔥</span><span><strong>' +
          escapeHtml(config.copy.streakActive.replace("{count}", streak.count)) +
          "</strong><small>" +
          escapeHtml(streakEncouragement(streak.count)) +
          "</small></span></div>"
        : '<div class="streak-pill streak-pill--new"><span class="streak-pill__fire">✦</span><span><strong>' +
          escapeHtml(config.copy.streakStart) +
          "</strong><small>ひとつずつ、楽しく続けましょう</small></span></div>";

    var scheduleHtml = schedule.length
      ? schedule.map(renderScheduleCard).join("")
      : '<div class="empty-panel"><span class="empty-panel__icon">' +
        icon("plus") +
        "</span><h3>服用予定はありません</h3><p>おくすりを登録すると、今日の予定がここに表示されます。</p>" +
        '<button class="primary-button" type="button" data-view="register">おくすりを登録する</button></div>';

    return (
      '<section class="page page--home">' +
      '<div class="today-row"><div><p>' +
      escapeHtml(greetingText()) +
      '</p><h1>今日のおくすり</h1></div><time class="today-row__date" datetime="' +
      escapeHtml(dateKey(today)) +
      '">' +
      escapeHtml(formatToday(today)) +
      '</time></div><div class="daily-summary"><div class="daily-summary__copy"><small>DAILY CARE</small><h2>' +
      escapeHtml(summaryTitle) +
      "</h2><p>" +
      escapeHtml(summaryBody) +
      "</p>" +
      streakHtml +
      '</div><div class="progress-ring" style="--progress:' +
      percent * 3.6 +
      'deg" aria-label="今日の達成度 ' +
      percent +
      '%"><span class="progress-ring__value">' +
      percent +
      "%<small>" +
      takenCount +
      " / " +
      schedule.length +
      '</small></span></div></div><div class="section-heading"><div><span class="section-label">TODAY</span><h2>服用スケジュール</h2><p>ボタンを押すだけで記録できます</p></div><button class="text-button" type="button" data-view="register">追加 ' +
      icon("plus") +
      '</button></div><div class="schedule-list">' +
      scheduleHtml +
      '</div><button class="mini-calendar-link" type="button" data-view="calendar"><span class="mini-calendar-link__icon">' +
      icon("calendar") +
      '</span><span class="mini-calendar-link__copy"><strong>服用カレンダーを見る</strong><small>これまでの継続状況を確認できます</small></span>' +
      icon("arrow") +
      "</button></section>"
    );
  }

  function productMatches(product, query) {
    if (!query) return true;
    var text = [product.name, product.maker, product.category, product.description]
      .join(" ")
      .toLowerCase();
    return text.indexOf(query.toLowerCase()) >= 0;
  }

  function renderProductResults(query) {
    var products = config.productCatalog
      .filter(function (product) {
        return productMatches(product, query);
      })
      .sort(function (first, second) {
        return first.priority - second.priority;
      });

    var productHtml = products
      .map(function (product) {
        var registered = state.medicines.find(function (medicine) {
          return medicine.productId === product.id;
        });
        return (
          '<article class="product-card">' +
          renderMedicineVisual(product) +
          '<div class="product-card__copy"><span class="product-card__maker">' +
          (product.maker === config.brand.company ? "✓ " : "") +
          escapeHtml(product.maker) +
          "</span><h3>" +
          escapeHtml(product.name) +
          "</h3><p>" +
          escapeHtml(product.description) +
          '</p></div><button class="product-add' +
          (registered ? " is-registered" : "") +
          '" type="button" ' +
          (registered
            ? 'data-edit-medicine="' + escapeHtml(registered.id) + '" aria-label="登録内容を編集"'
            : 'data-open-product="' + escapeHtml(product.id) + '" aria-label="このおくすりを追加"') +
          ">" +
          icon(registered ? "edit" : "plus") +
          "</button></article>"
        );
      })
      .join("");

    if (!products.length) {
      productHtml =
        '<div class="no-results">一致するおくすりが見つかりませんでした。<br />手動登録をご利用ください。</div>';
    }

    var manualLabel = query
      ? "「" + escapeHtml(query) + "」を手動で登録"
      : "一覧にないおくすりを手動で登録";
    return (
      productHtml +
      '<button class="manual-add" type="button" data-open-manual><span>' +
      icon("plus") +
      "</span><span>" +
      manualLabel +
      "</span></button>"
    );
  }

  function renderRegister() {
    return (
      '<section class="page"><div class="page-intro"><span class="page-intro__eyebrow">ADD MEDICINE</span><h1>おくすりを登録</h1><p>名前を検索するか、一覧にないものは手動で登録できます。</p></div>' +
      '<div class="search-field">' +
      icon("search") +
      '<label class="sr-only" for="medicine-search">おくすりを検索</label><input id="medicine-search" type="search" autocomplete="off" placeholder="おくすり・サプリメント名で検索" value="' +
      escapeHtml(ui.searchQuery) +
      '" /><button class="search-clear" type="button" data-clear-search aria-label="検索語を消去">' +
      icon("close") +
      '</button></div><p class="search-helper">' +
      icon("info") +
      "<span>ゼリア新薬の製品を優先して表示しています</span></p>" +
      '<div id="product-results" class="product-list">' +
      renderProductResults(ui.searchQuery) +
      "</div></section>"
    );
  }

  function nextPendingSlot() {
    return scheduleForDate(today, state.medicines).find(function (slot) {
      return statusFor(today, slot.key) !== "taken";
    });
  }

  function renderReminders() {
    var pending = nextPendingSlot();
    var bubbleContent;
    if (pending) {
      bubbleContent =
        '<div class="chat-bubble__body"><small>服用リマインド</small><h2>' +
        escapeHtml(pending.timing.time + " おくすりの時間です") +
        "</h2><p>飲み終わったら、下のボタンから記録しましょう。</p>" +
        '<div class="chat-medicine">' +
        renderMedicineVisual(pending.medicine) +
        '<span class="chat-medicine__copy"><strong>' +
        escapeHtml(pending.medicine.name) +
        "</strong><span>" +
        escapeHtml(pending.timing.label + "の服用") +
        '</span></span></div></div><div class="chat-bubble__actions"><button class="chat-action" type="button" data-record="' +
        escapeHtml(pending.key) +
        '" data-status="taken">服用を記録する</button><button class="chat-action chat-action--secondary" type="button" data-record="' +
        escapeHtml(pending.key) +
        '" data-status="later">あとで知らせる</button></div>';
    } else {
      bubbleContent =
        '<div class="chat-bubble__body"><small>TODAY</small><h2>今日の記録は完了です</h2><p>おつかれさまでした。明日も服用時間にお知らせします。</p></div>';
    }

    var nextText = pending
      ? pending.timing.time + "　" + pending.medicine.name
      : "今日の通知はすべて完了しました";

    return (
      '<section class="page"><div class="page-intro"><span class="page-intro__eyebrow">LINE REMINDER</span><h1>服用リマインド</h1><p>LINEに届くメッセージから、そのまま服用を記録できます。</p></div>' +
      '<div class="line-preview"><div class="line-preview__topbar"><span>ゼリア新薬</span><span class="official-badge">公式</span></div><div class="line-chat"><span class="chat-time">今日</span><div class="chat-row"><span class="chat-avatar">Z</span><div class="chat-bubble">' +
      bubbleContent +
      '</div></div></div></div><div class="notification-info"><div class="info-row"><span class="info-row__icon">' +
      icon("bell") +
      '</span><span class="info-row__copy"><strong>LINE通知 ' +
      (state.notificationEnabled ? "オン" : "オフ") +
      "</strong><small>" +
      (state.notificationEnabled
        ? "登録した時間に公式アカウントからお知らせします"
        : "マイページから通知をオンにできます") +
      '</small></span></div><div class="info-row"><span class="info-row__icon">' +
      icon("clock") +
      '</span><span class="info-row__copy"><strong>次のリマインド</strong><small>' +
      escapeHtml(nextText) +
      "</small></span></div></div></section>"
    );
  }

  function monthDate() {
    return new Date(today.getFullYear(), today.getMonth() + ui.calendarOffset, 1);
  }

  function monthStats(targetMonth) {
    var year = targetMonth.getFullYear();
    var month = targetMonth.getMonth();
    var lastDay = new Date(year, month + 1, 0).getDate();
    var tracked = 0;
    var taken = 0;
    for (var day = 1; day <= lastDay; day += 1) {
      var date = new Date(year, month, day);
      if (date > today) continue;
      var status = dailyStatus(date);
      if (status) {
        tracked += 1;
        if (status === "taken") taken += 1;
      }
    }
    return {
      tracked: tracked,
      taken: taken,
      rate: tracked ? Math.round((taken / tracked) * 100) : 0,
    };
  }

  function renderCalendarGrid(targetMonth) {
    var year = targetMonth.getFullYear();
    var month = targetMonth.getMonth();
    var firstWeekday = new Date(year, month, 1).getDay();
    var lastDay = new Date(year, month + 1, 0).getDate();
    var cells = "";

    for (var empty = 0; empty < firstWeekday; empty += 1) {
      cells += '<span class="calendar-day is-empty" aria-hidden="true"></span>';
    }

    for (var day = 1; day <= lastDay; day += 1) {
      var date = new Date(year, month, day);
      var status = dailyStatus(date);
      var isFuture = date > today;
      var isActiveStreak = currentStreak().dates.indexOf(dateKey(date)) >= 0;
      var mark =
        status === "taken" && isActiveStreak
          ? '<span class="calendar-day__status calendar-day__status--streak" aria-label="連続服用を継続中">🔥</span>'
          : status === "taken"
            ? '<span class="calendar-day__status calendar-day__status--taken" aria-label="服用済み">○</span>'
            : status === "later"
              ? '<span class="calendar-day__status calendar-day__status--later" aria-label="あとで記録">△</span>'
              : status === "missed"
                ? '<span class="calendar-day__status calendar-day__status--missed" aria-label="未服用">×</span>'
                : '<span class="calendar-day__status" aria-hidden="true"></span>';

      cells +=
        '<button class="calendar-day' +
        (sameDay(date, today) ? " is-today" : "") +
        (isFuture ? " is-future" : "") +
        '" type="button" data-day="' +
        escapeHtml(dateKey(date)) +
        '"><span>' +
        day +
        "</span>" +
        mark +
        "</button>";
    }
    return cells;
  }

  function renderCalendar() {
    var targetMonth = monthDate();
    var stats = monthStats(targetMonth);
    var streak = currentStreak();
    var streakTitle = streak.count > 0 ? streak.count + "日連続で継続中！" : "今日からスタート！";
    var streakBadge = streak.count > 0 ? "継続中" : "はじめよう";
    var streakIcon = streak.count > 0 ? "🔥" : "✦";
    return (
      '<section class="page"><div class="page-intro"><span class="page-intro__eyebrow">HISTORY</span><h1>服用カレンダー</h1><p>毎日の記録と、今月の継続状況を確認できます。</p></div>' +
      '<div class="streak-hero"><span class="streak-hero__fire">' +
      streakIcon +
      '</span><span class="streak-hero__copy"><small>CURRENT STREAK</small><strong>' +
      escapeHtml(streakTitle) +
      "</strong><span>" +
      escapeHtml(streakEncouragement(streak.count)) +
      '</span></span><i class="streak-hero__badge">' +
      escapeHtml(streakBadge) +
      "</i></div>" +
      '<div class="calendar-summary"><div class="stat-card stat-card--primary"><small>この月の継続率</small><strong>' +
      stats.rate +
      '<span>%</span></strong></div><div class="stat-card"><small>達成日数</small><strong>' +
      stats.taken +
      "<span> / " +
      stats.tracked +
      '日</span></strong></div></div><div class="calendar-card"><div class="calendar-header"><button type="button" data-calendar-shift="-1" aria-label="前の月">' +
      icon("chevronLeft") +
      "</button><h2>" +
      targetMonth.getFullYear() +
      "年 " +
      (targetMonth.getMonth() + 1) +
      '月</h2><button type="button" data-calendar-shift="1" aria-label="次の月">' +
      icon("chevronRight") +
      '</button></div><div class="calendar-weekdays" aria-hidden="true"><span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span></div><div class="calendar-grid">' +
      renderCalendarGrid(targetMonth) +
      '</div><div class="calendar-legend"><span><i class="legend-symbol legend-symbol--streak">🔥</i>継続中</span><span><i class="legend-symbol legend-symbol--taken">○</i>服用済み</span><span><i class="legend-symbol legend-symbol--later">△</i>あとで</span><span><i class="legend-symbol legend-symbol--missed">×</i>未服用</span></div></div></section>'
    );
  }

  function timingSummary(medicine) {
    return medicine.timings
      .map(function (timingId) {
        var timing = timingById(timingId);
        return timing.label + " " + timing.time;
      })
      .join("・");
  }

  function recentHistory(limit) {
    var results = [];
    for (var offset = 0; offset <= 45 && results.length < limit; offset += 1) {
      var date = addDays(today, -offset);
      var schedule = scheduleForDate(date, state.medicines);
      schedule.forEach(function (slot) {
        var status = statusFor(date, slot.key);
        if (status && results.length < limit) {
          results.push({
            date: date,
            slot: slot,
            status: status,
          });
        }
      });
    }
    return results;
  }

  function statusLabel(status) {
    return status === "taken" ? "服用済み" : status === "later" ? "あとで" : "未服用";
  }

  function renderMyPage() {
    var medicines = state.medicines
      .map(function (medicine) {
        return (
          '<div class="settings-medicine">' +
          renderMedicineVisual(medicine) +
          '<span class="settings-medicine__copy"><strong>' +
          escapeHtml(medicine.name) +
          "</strong><small>" +
          escapeHtml(timingSummary(medicine)) +
          '</small></span><button class="row-action" type="button" data-edit-medicine="' +
          escapeHtml(medicine.id) +
          '" aria-label="' +
          escapeHtml(medicine.name) +
          'を編集">' +
          icon("edit") +
          "</button></div>"
        );
      })
      .join("");
    if (!medicines) {
      medicines =
        '<div class="empty-panel"><h3>登録中のおくすりはありません</h3><p>服用を続けたいおくすりを追加しましょう。</p><button class="primary-button" type="button" data-view="register">登録する</button></div>';
    }

    var streak = currentStreak();
    var history = recentHistory(7)
      .map(function (item) {
        return (
          '<div class="history-row"><span class="history-row__copy"><strong>' +
          escapeHtml(item.slot.medicine.name) +
          "</strong><small>" +
          escapeHtml(formatShortDate(item.date) + "・" + item.slot.timing.label + " " + item.slot.timing.time) +
          '</small></span><span class="history-status history-status--' +
          escapeHtml(item.status) +
          '">' +
          escapeHtml(statusLabel(item.status)) +
          "</span></div>"
        );
      })
      .join("");

    return (
      '<section class="page"><div class="page-intro"><span class="page-intro__eyebrow">MY PAGE</span><h1>マイページ</h1><p>登録中のおくすりや通知設定を確認できます。</p></div>' +
      '<div class="profile-card"><span class="profile-avatar">' +
      escapeHtml(config.profile.displayName.charAt(0)) +
      '</span><span class="profile-copy"><strong>' +
      escapeHtml(config.profile.displayName) +
      "</strong><small>LINEアカウントで利用中</small></span></div>" +
      '<div class="my-streak-card"><span>' +
      (streak.count > 0 ? "🔥" : "✦") +
      '</span><span><small>現在の連続記録</small><strong>' +
      (streak.count > 0 ? streak.count + "日連続" : "今日からスタート") +
      "</strong></span><em>" +
      (streak.count > 0 ? "継続中" : "はじめよう") +
      "</em></div>" +
      '<section class="settings-section"><div class="settings-section__heading"><h2>登録中のおくすり</h2><span>' +
      state.medicines.length +
      '件</span></div><div class="settings-list">' +
      medicines +
      '</div></section><section class="settings-section"><div class="settings-section__heading"><h2>通知設定</h2></div><div class="settings-list"><div class="settings-row"><span class="settings-row__icon">' +
      icon("bell") +
      '</span><span class="settings-row__copy"><strong>LINE服用リマインド</strong><small>登録した服用時間にお知らせします</small></span><button class="toggle ' +
      (state.notificationEnabled ? "is-on" : "") +
      '" type="button" role="switch" aria-checked="' +
      String(state.notificationEnabled) +
      '" data-toggle-notifications><span class="sr-only">LINE通知を切り替える</span></button></div></div></section>' +
      '<section class="settings-section"><div class="settings-section__heading"><h2>服用履歴</h2><span>最新7件</span></div><div class="settings-list">' +
      (history || '<div class="no-results">まだ服用履歴がありません</div>') +
      '</div></section><button class="local-reset" type="button" data-reset-request>記録を初期状態に戻す</button></section>'
    );
  }

  function renderNavigation(view) {
    return (
      '<nav class="bottom-nav" aria-label="メインメニュー">' +
      config.navigation
        .map(function (item) {
          var active = item.id === view;
          return (
            '<button type="button" data-view="' +
            escapeHtml(item.id) +
            '" class="' +
            (active ? "is-active " : "") +
            (item.featured ? "is-featured" : "") +
            '"' +
            (active ? ' aria-current="page"' : "") +
            '><span class="nav-icon">' +
            icon(item.icon) +
            "</span><span>" +
            escapeHtml(item.label) +
            "</span></button>"
          );
        })
        .join("") +
      "</nav>"
    );
  }

  function medicineForModal() {
    if (ui.editingMedicineId) {
      return (
        state.medicines.find(function (medicine) {
          return medicine.id === ui.editingMedicineId;
        }) || null
      );
    }
    if (ui.productId) {
      var product = config.productCatalog.find(function (item) {
        return item.id === ui.productId;
      });
      if (!product) return null;
      return {
        id: null,
        productId: product.id,
        name: product.name,
        maker: product.maker,
        category: product.category,
        color: product.color,
        image: product.image,
        timings: product.recommendedTimings.slice(),
        startDate: dateKey(today),
        endDate: null,
      };
    }
    return {
      id: null,
      productId: null,
      name: ui.draftName || "",
      maker: "手動登録",
      category: "おくすり・サプリメント",
      color: config.theme.primary,
      timings: ["morning"],
      startDate: dateKey(today),
      endDate: null,
    };
  }

  function renderMedicineForm() {
    var medicine = medicineForModal();
    if (!medicine) return "";
    var isEditing = Boolean(medicine.id);
    var frequency = Math.min(3, Math.max(1, medicine.timings.length));
    var frequencyOptions = [1, 2, 3]
      .map(function (count) {
        return (
          '<label><input type="radio" name="frequency" value="' +
          count +
          '"' +
          (count === frequency ? " checked" : "") +
          " /><span>" +
          count +
          "回</span></label>"
        );
      })
      .join("");
    var timingOptions = config.timings
      .map(function (timing) {
        return (
          '<label><input type="checkbox" name="timings" value="' +
          escapeHtml(timing.id) +
          '"' +
          (medicine.timings.indexOf(timing.id) >= 0 ? " checked" : "") +
          " /><span>" +
          escapeHtml(timing.label) +
          "<small>" +
          escapeHtml(timing.time) +
          "</small></span></label>"
        );
      })
      .join("");

    return (
      '<div class="sheet-backdrop"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="medicine-form-title"><div class="sheet-handle"></div><header class="sheet-header"><div><h2 id="medicine-form-title">' +
      (isEditing ? "登録内容を変更" : "服用内容を設定") +
      '</h2><p>服用回数とお知らせする時間を設定してください</p></div><button class="sheet-close" type="button" data-close-modal aria-label="閉じる">' +
      icon("close") +
      '</button></header><form id="medicine-form" class="sheet-body"><div class="form-field"><label for="medicine-name">おくすり名</label><input class="text-input" id="medicine-name" name="name" maxlength="40" required value="' +
      escapeHtml(medicine.name) +
      '"' +
      (medicine.productId ? " readonly" : "") +
      ' /></div><fieldset class="form-field"><legend>1日の服用回数</legend><div class="segmented">' +
      frequencyOptions +
      '</div></fieldset><fieldset class="form-field"><legend>服用タイミング <small>回数分を選択</small></legend><div class="timing-options">' +
      timingOptions +
      '</div><p class="form-note">' +
      icon("info") +
      '<span>服用タイミングは登録画面からいつでも変更できます。</span></p></fieldset><div class="form-field"><label for="duration">服用期間</label><select class="select-input" id="duration" name="duration"><option value="ongoing">終了日なし</option><option value="30">30日間</option><option value="60">60日間</option><option value="90">90日間</option></select></div><div class="form-actions"><button class="primary-button" type="submit">' +
      icon("check") +
      "<span>" +
      (isEditing ? "変更を保存する" : "この内容で登録する") +
      "</span></button>" +
      (isEditing
        ? '<button class="danger-button" type="button" data-delete-request="' +
          escapeHtml(medicine.id) +
          '">' +
          icon("trash") +
          "<span>この登録を削除する</span></button>"
        : "") +
      "</div></form></section></div>"
    );
  }

  function renderRecordForm() {
    var recordKey = ui.modal && ui.modal.recordKey;
    var slot = scheduleForDate(today, state.medicines).find(function (item) {
      return item.key === recordKey;
    });
    if (!slot) return "";

    var dayKey = dateKey(today);
    var healthLog = state.healthLogs[dayKey] || {};
    var selectedStatus = statusFor(today, recordKey) === "missed" ? "missed" : "taken";
    var selectedMood = healthLog.mood || "good";
    var selectedSymptoms = Array.isArray(healthLog.symptoms) ? healthLog.symptoms : [];
    var memo = healthLog.memo || "";
    var recordTime = (state.recordTimes[dayKey] || {})[recordKey] || currentTimeValue();

    var moodOptions = config.health.moods
      .map(function (mood) {
        return (
          '<label><input type="radio" name="mood" value="' +
          escapeHtml(mood.id) +
          '"' +
          (mood.id === selectedMood ? " checked" : "") +
          ' required /><span><b>' +
          escapeHtml(mood.emoji) +
          "</b><small>" +
          escapeHtml(mood.label) +
          "</small></span></label>"
        );
      })
      .join("");

    var symptomOptions = config.health.symptoms
      .map(function (symptom) {
        return (
          '<label><input type="checkbox" name="symptoms" value="' +
          escapeHtml(symptom) +
          '"' +
          (selectedSymptoms.indexOf(symptom) >= 0 ? " checked" : "") +
          " /><span>" +
          escapeHtml(symptom) +
          "</span></label>"
        );
      })
      .join("");

    return (
      '<div class="sheet-backdrop"><section class="sheet sheet--record" role="dialog" aria-modal="true" aria-labelledby="record-form-title">' +
      '<header class="record-sheet-header"><button class="record-sheet-close" type="button" data-close-modal aria-label="閉じる">' +
      icon("close") +
      '</button><strong id="record-form-title">' +
      escapeHtml(formatShortDate(today) + "の記録") +
      '</strong><button class="record-top-save" type="submit" form="record-form">保存</button></header>' +
      '<form id="record-form" class="record-form"><p class="record-section-label">お薬の記録</p>' +
      '<section class="record-card"><div class="record-medicine">' +
      renderMedicineVisual(slot.medicine) +
      '<span><strong>' +
      escapeHtml(slot.medicine.name) +
      "</strong><small>" +
      escapeHtml(slot.timing.label + "の服用") +
      '</small></span></div><label class="record-time-row"><span>服用した時間</span><span>' +
      icon("clock") +
      '<input type="time" name="recordTime" value="' +
      escapeHtml(recordTime) +
      '" required /></span></label><fieldset class="record-intake"><legend>今日の服用</legend><div><label><input type="radio" name="status" value="taken"' +
      (selectedStatus === "taken" ? " checked" : "") +
      ' /><span>' +
      icon("check") +
      '服用した</span></label><label><input type="radio" name="status" value="missed"' +
      (selectedStatus === "missed" ? " checked" : "") +
      ' /><span>服用しなかった</span></label></div></fieldset></section>' +
      '<p class="record-section-label">体調の記録</p><section class="health-record-card"><fieldset class="mood-field"><legend>今日の気分</legend><div class="mood-grid">' +
      moodOptions +
      '</div></fieldset><fieldset class="symptom-field"><legend>体の状態 <small>あてはまるものを選択</small></legend><div class="symptom-grid">' +
      symptomOptions +
      '</div></fieldset><label class="memo-field" for="record-memo"><span>メモ <small>任意</small></span><textarea id="record-memo" name="memo" maxlength="200" placeholder="今日の体調や気づいたことを書いてみましょう">' +
      escapeHtml(memo) +
      '</textarea><small class="memo-count">' +
      memo.length +
      " / 200</small></label></section>" +
      '<button class="record-save-button" type="submit">' +
      icon("check") +
      "<span>保存する</span></button></form></section></div>"
    );
  }

  function renderDayDetail() {
    var date = parseDate(ui.modal.date);
    var dayKey = dateKey(date);
    var schedule = scheduleForDate(date, state.medicines);
    var dayRecordTimes = state.recordTimes[dayKey] || {};
    var healthLog = state.healthLogs[dayKey] || null;
    var rows = schedule
      .map(function (slot) {
        var status = statusFor(date, slot.key);
        var timeCopy =
          status === "taken" && dayRecordTimes[slot.key]
            ? "服用 " + dayRecordTimes[slot.key]
            : "予定 " + slot.timing.label + " " + slot.timing.time;
        return (
          '<div class="detail-row">' +
          renderMedicineVisual(slot.medicine) +
          '<span class="detail-row__copy"><strong>' +
          escapeHtml(slot.medicine.name) +
          "</strong><small>" +
          escapeHtml(timeCopy) +
          '</small></span><span class="history-status history-status--' +
          escapeHtml(status || "missed") +
          '">' +
          escapeHtml(statusLabel(status || "missed")) +
          "</span></div>"
        );
      })
      .join("");

    var healthHtml =
      '<section class="detail-health' +
      (healthLog ? "" : " detail-health--empty") +
      '"><div class="detail-health__heading"><h3>体調の記録</h3>' +
      (healthLog ? '<span>記録済み</span>' : "") +
      "</div>";

    if (healthLog) {
      var mood = moodById(healthLog.mood);
      var symptoms = Array.isArray(healthLog.symptoms) ? healthLog.symptoms : [];
      healthHtml +=
        '<div class="detail-mood"><span>今日の気分</span><strong><b>' +
        escapeHtml(mood.emoji) +
        "</b>" +
        escapeHtml(mood.label) +
        "</strong></div>" +
        '<div class="detail-symptoms"><span>体の状態</span><div>' +
        (symptoms.length
          ? symptoms
              .map(function (symptom) {
                return "<em>" + escapeHtml(symptom) + "</em>";
              })
              .join("")
          : "<small>特に記録なし</small>") +
        "</div></div>" +
        (healthLog.memo
          ? '<div class="detail-memo"><span>メモ</span><p>' +
            escapeHtml(healthLog.memo) +
            "</p></div>"
          : "");
    } else {
      healthHtml += "<p>この日の体調はまだ記録されていません。</p>";
    }
    healthHtml += "</section>";

    return (
      '<div class="sheet-backdrop"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="day-detail-title"><div class="sheet-handle"></div><header class="sheet-header"><div><h2 id="day-detail-title">服用・体調記録</h2><p>' +
      escapeHtml(formatShortDate(date)) +
      '</p></div><button class="sheet-close" type="button" data-close-modal aria-label="閉じる">' +
      icon("close") +
      '</button></header><div class="sheet-body"><p class="detail-date">この日の服用状況</p>' +
      (rows
        ? '<div class="detail-list">' + rows + "</div>"
        : '<div class="empty-panel"><h3>服用予定はありません</h3><p>この日に登録されているおくすりはありません。</p></div>') +
      healthHtml +
      "</div></section></div>"
    );
  }
  function renderConfirmModal(type) {
    var isDelete = type === "delete";
    return (
      '<div class="sheet-backdrop"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><div class="sheet-handle"></div><header class="sheet-header"><div><h2 id="confirm-title">' +
      (isDelete ? "登録を削除しますか？" : "記録を初期状態に戻しますか？") +
      '</h2></div><button class="sheet-close" type="button" data-close-modal aria-label="閉じる">' +
      icon("close") +
      '</button></header><div class="sheet-body"><p class="confirm-copy">' +
      (isDelete
        ? "このおくすりの今後の服用予定が表示されなくなります。"
        : "この端末に保存された服用記録・登録内容・通知設定が初期状態に戻ります。") +
      '</p><div class="confirm-actions"><button class="ghost-button" type="button" data-close-modal>キャンセル</button><button class="danger-button" type="button" ' +
      (isDelete ? "data-confirm-delete" : "data-confirm-reset") +
      ">" +
      (isDelete ? "削除する" : "初期状態に戻す") +
      "</button></div></div></section></div>"
    );
  }

  function renderModal() {
    if (!ui.modal) return "";
    if (ui.modal.type === "record") return renderRecordForm();
    if (ui.modal.type === "medicine") return renderMedicineForm();
    if (ui.modal.type === "day") return renderDayDetail();
    if (ui.modal.type === "confirmDelete") return renderConfirmModal("delete");
    if (ui.modal.type === "confirmReset") return renderConfirmModal("reset");
    return "";
  }

  function render() {
    var view = currentView();
    var viewHtml =
      view === "calendar" ? renderCalendar() : view === "register" ? renderRegister() : renderHome();

    app.innerHTML =
      '<div class="phone-shell">' +
      renderHeader() +
      '<main class="app-main" id="main-content">' +
      viewHtml +
      "</main>" +
      renderNavigation(view) +
      renderModal() +
      "</div>";

    if (ui.modal) {
      window.setTimeout(function () {
        var focusTarget = document.querySelector(".sheet input:not([readonly]), .sheet button");
        if (focusTarget) focusTarget.focus();
      }, 20);
    }
  }

  function showToast(message) {
    var oldToast = document.querySelector(".toast");
    if (oldToast) oldToast.remove();
    var shell = document.querySelector(".phone-shell");
    if (!shell) return;
    var toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = icon("check") + "<span>" + escapeHtml(message) + "</span>";
    shell.appendChild(toast);
    window.setTimeout(function () {
      toast.classList.add("is-visible");
    }, 10);
    window.setTimeout(function () {
      toast.classList.remove("is-visible");
      window.setTimeout(function () {
        toast.remove();
      }, 220);
    }, 2400);
  }

  function showCelebration() {
    var shell = document.querySelector(".phone-shell");
    if (!shell) return;
    var oldCelebration = document.querySelector(".celebration");
    if (oldCelebration) oldCelebration.remove();
    var celebration = document.createElement("div");
    celebration.className = "celebration";
    celebration.setAttribute("aria-hidden", "true");
    var symbols = ["✦", "●", "♥", "✦", "●", "♥", "✦", "●", "✦"];
    celebration.innerHTML = symbols
      .map(function (symbol, index) {
        return (
          '<i style="--celebration-x:' +
          (10 + index * 10) +
          '%;--celebration-delay:' +
          index * 0.035 +
          's">' +
          symbol +
          "</i>"
        );
      })
      .join("");
    shell.appendChild(celebration);
    window.setTimeout(function () {
      celebration.remove();
    }, 1250);
  }

  function openMedicineForm(options) {
    ui.editingMedicineId = options.editingId || null;
    ui.productId = options.productId || null;
    ui.draftName = options.draftName || "";
    ui.modal = { type: "medicine" };
    render();
  }

  function cleanDeletedMedicineRecords(medicineId) {
    Object.keys(state.records).forEach(function (dayKey) {
      Object.keys(state.records[dayKey]).forEach(function (key) {
        if (key.indexOf(medicineId + "--") === 0) delete state.records[dayKey][key];
      });
    });
  }

  app.addEventListener("click", function (event) {
    var viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      navigate(viewButton.getAttribute("data-view"));
      return;
    }

    var recordButton = event.target.closest("[data-record]");
    if (recordButton) {
      var recordKey = recordButton.getAttribute("data-record");
      var recordStatus = recordButton.getAttribute("data-status") || "taken";
      if (recordStatus === "taken") {
        ui.modal = { type: "record", recordKey: recordKey };
        render();
        return;
      }
      updateRecord(today, recordKey, recordStatus);
      render();
      showToast("あとでお知らせするよう設定しました");
      return;
    }

    var shiftButton = event.target.closest("[data-calendar-shift]");
    if (shiftButton) {
      ui.calendarOffset += Number(shiftButton.getAttribute("data-calendar-shift"));
      render();
      return;
    }

    var dayButton = event.target.closest("[data-day]");
    if (dayButton) {
      ui.modal = { type: "day", date: dayButton.getAttribute("data-day") };
      render();
      return;
    }

    var productButton = event.target.closest("[data-open-product]");
    if (productButton) {
      openMedicineForm({ productId: productButton.getAttribute("data-open-product") });
      return;
    }

    var editButton = event.target.closest("[data-edit-medicine]");
    if (editButton) {
      openMedicineForm({ editingId: editButton.getAttribute("data-edit-medicine") });
      return;
    }

    if (event.target.closest("[data-open-manual]")) {
      openMedicineForm({ draftName: ui.searchQuery });
      return;
    }

    if (event.target.closest("[data-clear-search]")) {
      ui.searchQuery = "";
      var search = document.getElementById("medicine-search");
      var results = document.getElementById("product-results");
      if (search) {
        search.value = "";
        search.focus();
      }
      if (results) results.innerHTML = renderProductResults("");
      return;
    }

    var deleteRequest = event.target.closest("[data-delete-request]");
    if (deleteRequest) {
      ui.modal = {
        type: "confirmDelete",
        medicineId: deleteRequest.getAttribute("data-delete-request"),
      };
      render();
      return;
    }

    if (event.target.closest("[data-confirm-delete]")) {
      var deletingId = ui.modal && ui.modal.medicineId;
      if (deletingId) {
        state.medicines = state.medicines.filter(function (medicine) {
          return medicine.id !== deletingId;
        });
        cleanDeletedMedicineRecords(deletingId);
        storage.save(state);
      }
      ui.modal = null;
      ui.editingMedicineId = null;
      render();
      showToast("登録を削除しました");
      return;
    }

    if (event.target.closest("[data-toggle-notifications]")) {
      state.notificationEnabled = !state.notificationEnabled;
      storage.save(state);
      render();
      showToast("LINE通知を" + (state.notificationEnabled ? "オン" : "オフ") + "にしました");
      return;
    }

    if (event.target.closest("[data-reset-request]")) {
      ui.modal = { type: "confirmReset" };
      render();
      return;
    }

    if (event.target.closest("[data-confirm-reset]")) {
      storage.clear();
      state = buildInitialState();
      storage.save(state);
      ui.modal = null;
      ui.calendarOffset = 0;
      render();
      showToast("記録を初期状態に戻しました");
      return;
    }

    if (event.target.closest("[data-close-modal]")) {
      ui.modal = null;
      render();
    }
  });

  app.addEventListener("input", function (event) {
    if (event.target.id === "record-memo") {
      var counter = document.querySelector(".memo-count");
      if (counter) counter.textContent = event.target.value.length + " / 200";
      return;
    }
    if (event.target.id !== "medicine-search") return;
    ui.searchQuery = event.target.value.trim();
    var results = document.getElementById("product-results");
    if (results) results.innerHTML = renderProductResults(ui.searchQuery);
  });

  app.addEventListener("change", function (event) {
    if (event.target.name !== "frequency") return;
    var count = Number(event.target.value);
    var checkboxes = Array.prototype.slice.call(
      document.querySelectorAll('#medicine-form input[name="timings"]'),
    );
    checkboxes.forEach(function (checkbox, index) {
      checkbox.checked = index < count;
    });
  });

  app.addEventListener("submit", function (event) {
    if (event.target.id === "record-form") {
      event.preventDefault();
      var recordFormData = new FormData(event.target);
      var recordKey = ui.modal && ui.modal.recordKey;
      var recordStatus = String(recordFormData.get("status") || "taken");
      var mood = String(recordFormData.get("mood") || "good");
      var symptoms = recordFormData.getAll("symptoms").map(String);
      var memo = String(recordFormData.get("memo") || "").trim().slice(0, 200);
      var recordTime = String(recordFormData.get("recordTime") || currentTimeValue());
      var dayKey = dateKey(today);

      if (!recordKey) return;
      if (!state.recordTimes[dayKey]) state.recordTimes[dayKey] = {};
      state.recordTimes[dayKey][recordKey] = recordTime;
      state.healthLogs[dayKey] = {
        mood: mood,
        symptoms: symptoms,
        memo: memo,
        updatedAt: new Date().toISOString(),
      };
      updateRecord(today, recordKey, recordStatus);
      storage.save(state);
      ui.modal = null;
      render();

      if (recordStatus === "taken") {
        var todayIsComplete = dailyStatus(today) === "taken";
        var activeStreak = currentStreak();
        showCelebration();
        showToast(
          todayIsComplete
            ? "服用と体調を記録しました！ " + activeStreak.count + "日連続です 🔥"
            : "服用と体調を記録しました",
        );
      } else {
        showToast("今日の体調と服用状況を保存しました");
      }
      return;
    }

    if (event.target.id !== "medicine-form") return;
    event.preventDefault();
    var formData = new FormData(event.target);
    var name = String(formData.get("name") || "").trim();
    var frequency = Number(formData.get("frequency"));
    var timings = formData.getAll("timings").map(String);

    if (!name) {
      showToast("おくすり名を入力してください");
      return;
    }
    if (timings.length !== frequency) {
      showToast("服用回数と同じ数のタイミングを選択してください");
      return;
    }

    var modalMedicine = medicineForModal();
    var duration = String(formData.get("duration") || "ongoing");
    var endDate =
      duration === "ongoing" ? null : dateKey(addDays(today, Number(duration) - 1));
    var savedMedicine = {
      id: modalMedicine.id || "medicine-" + Date.now(),
      productId: modalMedicine.productId || null,
      name: name,
      maker: modalMedicine.maker,
      category: modalMedicine.category,
      color: modalMedicine.color,
      image: modalMedicine.image || null,
      timings: timings,
      startDate: modalMedicine.startDate || dateKey(today),
      endDate: endDate,
    };

    var existingIndex = state.medicines.findIndex(function (medicine) {
      return medicine.id === savedMedicine.id;
    });
    if (existingIndex >= 0) {
      state.medicines[existingIndex] = savedMedicine;
    } else {
      state.medicines.push(savedMedicine);
    }
    storage.save(state);
    ui.modal = null;
    ui.editingMedicineId = null;
    ui.productId = null;
    ui.searchQuery = "";
    var saveMessage = existingIndex >= 0 ? "登録内容を変更しました" : "おくすりを登録しました";
    if (currentView() === "home") {
      render();
      showToast(saveMessage);
    } else {
      window.location.hash = "home";
      window.setTimeout(function () {
        showToast(saveMessage);
      }, 60);
    }
  });

  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && ui.modal) {
      ui.modal = null;
      render();
    }
  });

  window.addEventListener("hashchange", function () {
    ui.modal = null;
    render();
    var main = document.getElementById("main-content");
    if (main) main.scrollTop = 0;
  });

  applyConfig();
  if (validViews.indexOf(window.location.hash.replace("#", "")) < 0) {
    window.history.replaceState(null, "", "#home");
  }
  render();
})();
