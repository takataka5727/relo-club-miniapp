# FUJIFILM イベント カメラスタンプラリー ミニアプリモック

富士フイルムのイベント会場で、6つのブースを回ってカメラスタンプを集めるLINEミニアプリ想定のローカルモックです。

## 確認方法

このフォルダーでPowerShellを開き、次を実行します。

```powershell
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

表示されたURLをブラウザで開きます。

```text
http://localhost:5174
```

「QRコードを読み取る」画面を開くと、約1.5秒のスキャン演出後に自動で読み取り成功になります。カメラ権限や実物のQRコードは不要です。

## 体験できる流れ

1. スタンプラリーを開始
2. 会場マップやブース詳細を確認
3. QRコード読み取り演出後にカメラ型スタンプを自動獲得
4. 6個目の獲得後にコンプリート演出を表示
5. スタッフ提示用の景品交換画面を表示
6. スタッフ操作で「交換済み」に変更

状態はブラウザの `localStorage` に保存されます。右上メニューの「最初から体験する」でリセットできます。

## QRコードに設定する値

現在のモックは疑似読み取りで自動成功します。本番用QRコードを作る場合は、各ブースに `app-config.js` の `qrValue` を設定します。

- `FUJIFILM-STAMP:x100vi`
- `FUJIFILM-STAMP:xt5`
- `FUJIFILM-STAMP:xm5`
- `FUJIFILM-STAMP:gfx100sii`
- `FUJIFILM-STAMP:instax-mini-evo`
- `FUJIFILM-STAMP:instax-wide-evo`

URL形式の場合は `?stamp=x100vi` のような値も利用できます。現在は端末やブラウザにかかわらず疑似読み取りが動作します。

## 内容を変える場所

- `app-config.js`: イベント名、ブース、カメラ画像、スタンプ色、景品、QR値
- `styles.css`: 見た目、演出、スマホフレーム
- `assets/`: カメラ・チェキの商品画像
- `IMAGE_SOURCES.md`: 商品画像の出典と利用上の注意
- `app.js`: 画面遷移、疑似QR読み取り、状態保存

## 本番化するとき

現在は端末内保存のモックです。実運用ではLIFF初期化、LINEログイン、サーバー側のスタンプ発行・不正取得防止、景品交換のサーバー記録、在庫管理、利用規約・プライバシーポリシーが必要です。


