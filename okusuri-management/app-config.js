window.MINI_APP_CONFIG = {
  storageKey: "zeria-okusuri-management-v1",

  brand: {
    company: "ゼリア新薬",
    name: "おくすり管理",
    mark: "Z",
  },

  theme: {
    primary: "#c75f7d",
    primaryStrong: "#8d4059",
    primarySoft: "#fce8ef",
    accent: "#ff8c72",
    accentSoft: "#fff0e9",
    lineGreen: "#06c755",
    background: "#fff7fa",
    surface: "#ffffff",
    text: "#49343d",
    muted: "#8a737c",
    line: "#f0dde4",
  },

  profile: {
    firstName: "花子",
    displayName: "山田 花子",
  },

  copy: {
    homeGreeting: "{name}さん、おはようございます",
    homeTitle: "今日もいっしょに\n続けましょう",
    completeTitle: "今日もぜんぶできました！",
    completeBody: "すてきです。小さな積み重ねが習慣になっています。",
    streakActive: "{count}日連続で継続中",
    streakStart: "今日からストリークを始めよう",
  },

  health: {
    moods: [
      { id: "very-good", emoji: "😄", label: "とても良い" },
      { id: "good", emoji: "🙂", label: "良い" },
      { id: "normal", emoji: "😐", label: "ふつう" },
      { id: "low", emoji: "🙁", label: "やや悪い" },
      { id: "bad", emoji: "😣", label: "悪い" },
    ],
    symptoms: ["頭痛", "だるさ", "むくみ", "腹痛", "肌あれ", "イライラ", "肩こり", "眠気", "その他"],
  },

  timings: [
    { id: "morning", label: "朝", shortLabel: "朝", time: "08:00" },
    { id: "noon", label: "昼", shortLabel: "昼", time: "12:30" },
    { id: "evening", label: "夜", shortLabel: "夜", time: "20:00" },
  ],

  productCatalog: [
    {
      id: "prefemin",
      name: "プレフェミン",
      maker: "ゼリア新薬",
      category: "第2類医薬品",
      description: "月経前の不快な症状をやわらげるお薬",
      color: "#e85f82",
      image: "./assets/prefemin.png",
      recommendedTimings: ["morning"],
      priority: 1,
    },
    {
      id: "heparize-plus",
      name: "ヘパリーゼプラスII",
      maker: "ゼリア新薬",
      category: "第3類医薬品",
      description: "滋養強壮・肉体疲労時の栄養補給に",
      color: "#d98735",
      image: "./assets/heparize-plus-ii.png",
      recommendedTimings: ["morning", "evening"],
      priority: 2,
    },
    {
      id: "chondroitin-zs",
      name: "コンドロイチンZS錠",
      maker: "ゼリア新薬",
      category: "第3類医薬品",
      description: "関節痛・神経痛などの症状の緩和に",
      color: "#3c81b5",
      image: "./assets/chondroitin-zs.png",
      recommendedTimings: ["morning", "noon", "evening"],
      priority: 3,
    },
  ],

  defaultMedicines: [
    {
      id: "medicine-prefemin",
      productId: "prefemin",
      name: "プレフェミン",
      maker: "ゼリア新薬",
      category: "第2類医薬品",
      color: "#e85f82",
      image: "./assets/prefemin.png",
      timings: ["morning"],
      registeredDaysAgo: 72,
      endDate: null,
    },
    {
      id: "medicine-heparize",
      productId: "heparize-plus",
      name: "ヘパリーゼプラスII",
      maker: "ゼリア新薬",
      category: "第3類医薬品",
      color: "#d98735",
      image: "./assets/heparize-plus-ii.png",
      timings: ["evening"],
      registeredDaysAgo: 42,
      endDate: null,
    },
  ],

  navigation: [
    { id: "home", label: "ホーム", icon: "home" },
    { id: "register", label: "追加", icon: "plus", featured: true },
    { id: "calendar", label: "カレンダー", icon: "calendar" },
  ],
};
