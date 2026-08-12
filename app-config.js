/*
 * ブランド、文言、会員情報、画像、クーポンはこのファイルで差し替えられます。
 * 本番化するときは、この設定オブジェクトをAPIのレスポンスへ置き換えます。
 */
window.MINI_APP_CONFIG = {
  brand: {
    name: "リロクラブ",
    subName: "ミニアプリ",
    romanName: "RELO CLUB",
    facilityName: "福利厚生倶楽部",
    initial: "R",
  },

  theme: {
    primary: "#3b7de3",
    primaryStrong: "#2864c7",
    primarySoft: "#eaf2ff",
    primaryPale: "#f5f8ff",
    accent: "#50c6e8",
    background: "#f7f7f7",
    surface: "#ffffff",
    text: "#252934",
    muted: "#737b87",
  },

  copy: {
    verifyTitle: "初回 会員情報入力",
    verifyBody: "ご本人の情報を入力してください。",
    successTitle: "会員登録が完了しました",
    successBody: "次回からはLINEから会員証とクーポンをすぐにご利用いただけます。",
    greeting: "{lastName}さま、こんにちは",
    couponHeading: "すぐに使えるクーポンを検索！",
  },

  lineConsent: {
    localPreviewOnly: true,
    title: "認証",
    appName: "リロクラブ",
    lead: "このサービスは、以下の情報へのアクセスをリクエストしています。",
    permissionTitle: "プロフィール情報",
    permissionDetail: "表示名、プロフィール画像、ユーザー識別情報",
    purpose: "取得した情報は、会員情報との連携およびサービス提供のために利用します。",
    allowLabel: "許可する",
    cancelLabel: "キャンセル",
  },

  member: {
    fullName: "山田 花子",
    lastName: "山田",
    memberId: "9990001234",
    tier: "RELO CLUB MEMBER",
    tierJa: "リロクラブ会員",
    validThrough: "2027年3月31日",
    dailyValidityLabel: "※本日限り有効",
    joined: "2024年4月",
    points: 2480,
    pointsValidThrough: "2027年3月31日",
    cardImage: "./assets/member-card.png",
    instruction: "この画面をご提示ください",
    instructionDetail: "サービスご利用時にご提示をお願いいたします。",
  },

  facility: {
    todayHours: "10:00 – 21:00",
    lastEntry: "最終受付 20:00",
    phone: "0120-982291",
  },

  nativeApp: {
    // 正式なアプリページが決まったら、このURLだけを差し替えてください。
    appStoreUrl: "https://apps.apple.com/jp/search?term=%E3%83%AA%E3%83%AD%E3%82%AF%E3%83%A9%E3%83%96",
    icon: "./assets/native-app-icon.png",
  },

  verification: {
    // ローカル版では形式のみを確認します。
    exampleMemberId: "9990001234",
    exampleBirthDate: "1990-04-18",
    exampleEmail: "hanako.yamada@example.com",
    examplePassword: "relo1234",
  },

  notices: [
    {
      date: "2026.08.08",
      title: "夏季休業期間のお知らせ",
      body: "一部サービスの受付時間が変更になります。詳しくは各サービス詳細をご確認ください。",
    },
    {
      date: "2026.08.01",
      title: "8月のおすすめ特集を公開しました",
      body: "レジャー・グルメなど、夏のおでかけに使える優待を掲載しています。",
    },
  ],

  gacha: {
    title: "毎日ガチャチャレンジ",
    description: "1日1回、ガチャを回してポイントを獲得できます。",
    prizes: [
      { id: "point-1", label: "1ポイント", points: 1, weight: 40 },
      { id: "point-5", label: "5ポイント", points: 5, weight: 30 },
      { id: "point-10", label: "10ポイント", points: 10, weight: 18 },
      { id: "point-30", label: "30ポイント", points: 30, weight: 9 },
      { id: "point-100", label: "100ポイント", points: 100, weight: 3 },
    ],
  },

  couponFilters: ["おすすめ", "グルメ", "エンタメ", "レジャー", "健康"],

  coupons: [
    {
      id: "matsuya-50",
      featured: true,
      code: "RLC-MTY50-2609",
      category: "グルメ",
      title: "定番の牛めし ※対象商品限定",
      shortTitle: "松屋 牛めし50円OFF",
      service: "松屋",
      benefit: "50円\nOFF",
      description: "松屋の対象牛めしを通常価格から50円引きでご利用いただけます。",
      expires: "2026.09.30",
      expiresLabel: "2026年9月30日まで",
      image: "./assets/logo-matsuya.png",
      visual: "food",
      terms: [
        "店内・お持ち帰りの対象商品にご利用いただけます。",
        "期間中1回限り有効です。",
        "他の割引・優待との併用はできません。",
        "ご注文時にスタッフへ画面をご提示ください。",
      ],
    },
    {
      id: "cocos-drink-100",
      code: "RLC-CCS10-2609",
      category: "グルメ",
      title: "プレミアムドリンクバーセット",
      shortTitle: "ココス ドリンクバー100円OFF",
      service: "ココス",
      benefit: "100円\nOFF",
      description: "対象のプレミアムドリンクバーセットを100円引きでご利用いただけます。",
      expires: "2026.09.30",
      expiresLabel: "2026年9月30日まで",
      image: "./assets/logo-cocos.png",
      visual: "food",
      terms: [
        "店内でお食事をご注文の方が対象です。",
        "会員ご本人さまを含む1グループでご利用いただけます。",
        "他の割引・優待との併用はできません。",
      ],
    },
    {
      id: "owndays-10",
      featured: true,
      code: "RLC-OWN10-2609",
      category: "健康",
      title: "メガネ・サングラスのオンデーズ",
      shortTitle: "OWNDAYS メガネ・サングラス10%OFF",
      service: "OWNDAYS",
      benefit: "10%\nOFF",
      description: "対象のメガネ・サングラスを店頭価格から10%割引でご購入いただけます。",
      expires: "2026.09.30",
      expiresLabel: "2026年9月30日まで",
      image: "./assets/logo-owndays.png",
      visual: "shopping",
      terms: [
        "対象店舗の会計時に画面をご提示ください。",
        "一部対象外の商品・サービスがあります。",
        "他の割引・キャンペーンとの併用はできません。",
      ],
    },
    {
      id: "komeda-100",
      code: "RLC-KMD10-2609",
      category: "グルメ",
      title: "店内ご飲食のお会計から",
      shortTitle: "コメダ珈琲店 お会計から100円OFF",
      service: "コメダ珈琲店",
      benefit: "100円\nOFF",
      description: "店内ご飲食のお会計から100円引きでご利用いただけます。",
      expires: "2026.09.30",
      expiresLabel: "2026年9月30日まで",
      image: "./assets/logo-komeda.png",
      visual: "cafe",
      terms: [
        "店内ご飲食のお会計が対象です。",
        "期間中1回限り有効です。",
        "他の割引・優待との併用はできません。",
      ],
    },
    {
      id: "toho-movie-200",
      code: "RLC-THO20-2609",
      category: "エンタメ",
      title: "映画鑑賞料金 ※一般料金対象",
      shortTitle: "TOHOシネマズ 映画鑑賞200円OFF",
      service: "TOHOシネマズ",
      benefit: "200円\nOFF",
      description: "一般の映画鑑賞料金を通常価格から200円引きでご利用いただけます。",
      expires: "2026.09.30",
      expiresLabel: "2026年9月30日まで",
      image: "./assets/logo-toho.jpg",
      visual: "entertainment",
      terms: [
        "対象劇場の窓口で画面をご提示ください。",
        "特別興行・一部作品は対象外です。",
        "他の割引・優待との併用はできません。",
      ],
    },
    {
      id: "fujiq-pass-500",
      code: "RLC-FQH50-2609",
      category: "レジャー",
      title: "フリーパス ※対象券種限定",
      shortTitle: "富士急ハイランド フリーパス500円OFF",
      service: "富士急ハイランド",
      benefit: "500円\nOFF",
      description: "対象のフリーパスを通常価格から500円引きでご購入いただけます。",
      expires: "2026.09.30",
      expiresLabel: "2026年9月30日まで",
      image: "./assets/logo-fujiq.png",
      visual: "leisure",
      terms: [
        "チケット窓口で画面をご提示ください。",
        "会員ご本人さまを含む5名さままでご利用いただけます。",
        "休園日・特別営業日は対象外となる場合があります。",
      ],
    },
  ],
};
