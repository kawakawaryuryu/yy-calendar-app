# 日々 / yy-calendar-app

Android・iOSでの操作性を比較するためのカレンダーモックです。PWA版（React + TypeScript + Vite）とReact Native版（Expo）を同じリポジトリに置いています。

## PWA版の起動

Node.js 24.3以上の24系（推奨）、または22.18以上の22系とpnpmを使用します。

```sh
pnpm install
pnpm dev
```

Viteが表示するLocal URLを開きます。同じWi-Fiのスマートフォンでは、表示されたNetwork URLを開いてください。開発用サーバーではService Workerを登録しません。

性能・オフライン起動は、本番ビルドで比較してください。

```sh
pnpm build
pnpm preview --port 4173 --strictPort
```

## 両モックで実装済みの操作

- 日曜始まり・6週固定の月カレンダー。左右のタッチスワイプ、矢印、年月指定、今日へ戻る。
- 日付欄の天気アイコン、カレンダー別の色分け、予定2件と省略件数。
- 選択日の下部に、天気・最高／最低気温・降水確率とスクロールできる予定一覧。
- 予定の追加・編集・削除。終日、日をまたぐ予定、場所・メモ。
- 複数カレンダーの表示切り替え、天気地域の切り替え。
- 繰り返し予定とYahooの過去予定を想定した、読み取り専用の詳細表示。
- 端末内の変更・設定の保存。
- 「表示と設定」で予定を1日24件追加する負荷シナリオ、描画応答の参考値表示、リセット。

**予定・天気はすべて仮データです。Google・Yahoo・天気APIへの接続はありません。ウィジェットは実装していません。** 登録・編集した予定は、PWA版ではブラウザーのlocalStorage、React Native版ではアプリ内のAsyncStorageに保存します。両者のデータは独立しています。モックの小さな差分データに用途を絞り、本番の予定保存・同期基盤は未実装です。

PWA版にはService Workerによるオフライン起動、インストール用マニフェスト・アイコンもあります。

## React Native版をスマートフォンで試す

```sh
pnpm --dir native install
pnpm --dir native exec expo login
pnpm native
```

`expo login`で開くブラウザーからExpoアカウントへログインします。アカウントがなければ[無料のExpoアカウントを作成](https://expo.dev/signup)してください。iPhoneのExpo Goでも、ホーム画面右上のアカウントアイコンから**PCのExpo CLIと同じアカウント**にログインします。iPhone実機で開発サーバーのプロジェクトを開くために必要な条件です（[Expo公式のログイン要件](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/)）。

PCとスマートフォンを同じWi-Fiにつなぎ、スマートフォンに **Expo Go** を入れます。両方のログインが済んだら、ターミナルに表示されるQRコードを、iPhoneではカメラ、AndroidではExpo Goから読み取ります。Expo Goでのモック試用にApple Developer Programへの加入は不要です。開発サーバーを動かしたまま試してください。

### 「You need to be signed in to Expo Go and Expo CLI」と表示される場合

依存パッケージのインストールとサーバー起動だけではログインされません。PCで次を実行してログインし、アカウント名を確認します。

```sh
pnpm --dir native exec expo login
pnpm --dir native exec expo whoami
```

iPhoneのExpo Goにも同じアカウントでログインして、エラー画面の「Try Again」を押すか、QRを開き直してください。未ログインからのログインだけならサーバーは起動したままで構いません。CLIのアカウントを切り替えた場合は、起動中のターミナルで`Ctrl+C`を押してから`pnpm native`で再起動します。

### QRをカメラで認識しない場合

`pnpm native`では、Expo CLIのQR描画を一般的な半ブロック文字へ固定しています。Ghostty等で使われる小さいsextant文字のQRは、端末フォントによって認識しにくい場合があるためです。

それでも認識できない場合は、別のターミナルで次を実行し、生成された`artifacts/expo-go-qr.png`をPCで開いて読み取ってください。URLは起動中のターミナルの`Metro:`行をそのまま指定します。IPやポートが変わったら作り直してください。

```sh
pnpm native:qr exp://192.168.0.155:8081
```

QR生成はローカルで行い、外部のQRサービスには接続しません。

### インストール後にMetroのファイル追跡エラーが出る場合

`Detected addition or modification of file ... node_modules/expo, but it is tracked as a non-empty directory`は、依存パッケージの配置を変えた後に古いMetroキャッシュが残ると発生することがあります。QRが表示されても、このエラーが出ていればバンドルを配信できません。

起動中のExpoを`Ctrl+C`で停止してから：

```sh
pnpm --dir native install
pnpm native --clear
```

pnpm 11では依存配置の`nodeLinker`を`.npmrc`から読みません（[pnpm公式設定仕様](https://pnpm.io/settings)）。`native/pnpm-workspace.yaml`で`nodeLinker: hoisted`を設定し、PWAとは独立した依存配置にしています。初期モックの古い`.npmrc`だけがある状態から更新した場合は、上の再インストールとキャッシュクリアを一度行ってください。

QRが認識され、リンクを開いた後に接続が止まる場合は、同じWi-Fiへの接続とExpo Goのローカルネットワーク許可を確認します。

2026-10-25に、iPhoneのExpo Goが対応するSDK 58へ更新しました（Expo 58、React Native 0.88、React 19.3）。Expo GoとプロジェクトのSDKは一致させる必要があります。今後「Expo GoはSDK X、プロジェクトはSDK Y」というエラーが出た場合は、[Expo公式の更新手順](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)に沿って`native/`のExpoと関連パッケージをまとめて更新し、`pnpm native --clear`で起動し直してください。

React Native版は`native/`にあります。画面はReact Nativeの部品で実装し、月移動に横の`ScrollView`、予定一覧に`FlatList`、編集画面に`Modal`、日付・時刻入力にOS標準ピッカーを使います。端末保存はAsyncStorageです。ネット接続のない状態でも起動中のモックの仮データと保存内容は使えますが、**Expo Goからのオフライン再起動は比較対象にしません**。アプリ本体を組み込んだ単体ビルドで別途確認します。

Expo Goは操作の確認に使います。最終的な滑らかさは、同じ端末のPWA本番ビルドとReact Nativeのリリースビルドで比較してください。Expo Goの開発実行には開発用の処理が入り、リリース版と性能が異なります。単体ビルドにはiOS側でXcodeと署名、Android側でAndroid SDKが必要です。

`native/`の依存パッケージはPWAとは別に管理しています。Metroは`shared/`を参照し、React Native用パッケージを`native/node_modules`から読み込みます。

```sh
pnpm native:typecheck
pnpm native:export
```

`native:export`はiOS・Android向けのJavaScript/Hermesバンドルを`native/dist/`へ出力します。ネイティブアプリのコンパイルや実機テストの代わりにはなりません。実機での起動時に問題があれば、まず`pnpm --dir native exec expo install --check`で依存バージョンを確認します。

## スマートフォンでPWAとして試す

HTTPのNetwork URLでもタップ・スワイプ・編集は試せます。ただし、Service Worker・オフライン起動・ホーム画面へのPWAインストールには、信頼済みHTTPSが必要です（PC自身のlocalhostを除く）。HTTPのLANアクセスだけでは、この部分は比較できません。

以下のいずれかを使ってください。

1. `dist/` をHTTPSの静的ホスティングへ配信する。
2. 開発用認証局（例：mkcert）で、MacのLAN IPを含む証明書を用意し、スマートフォン側でもその認証局を信頼する。証明書を `.certs/` に置いた場合は以下で起動する。

```sh
HTTPS_CERT=.certs/dev.pem HTTPS_KEY=.certs/dev-key.pem pnpm preview --port 4173 --strictPort
```

HTTPSのURLを開いたら、iPhoneはSafariの共有メニューから「ホーム画面に追加」、AndroidはChromeのメニューから「ホーム画面に追加」を選びます。最初にオンラインで開き、オフライン用のファイル保存が終わってから機内モードで再起動してください。端末のデータ削除で保存内容は失われます。

## React Native版と揃える条件

比較用の固定日は **2026-10-21**、シナリオは `hibi-2026-10-v1` です。実際の今日に合わせて動かす仕様ではありません。

`shared/calendar.ts` はブラウザーに依存しないデータ・日付計算・予定判定です。両モックがこのファイルを再利用して、同じ予定件数・天気・複数日予定を表示します。画面はそれぞれの部品で実装しています。

同じ端末で、通常データと「予定を多くする」の両方について次を比較してください。

1. 月を10回連続で送り、逆方向へ戻す。指への追従・慣性・停止位置・空白を確認。
2. 予定がある日を連続タップし、選択状態と下部一覧の反映を確認。
3. 下部一覧を上下にスクロールし、横の月移動との干渉を確認。
4. タイトル入力、日付・時刻入力、終日切り替え、保存・キャンセルを確認。
5. 画面回転・文字サイズ変更・ホーム画面からの起動・アプリ復帰を確認。

描画応答はタップ時刻から、React更新後の2回の`requestAnimationFrame`までの`performance.now()`の差です。JS側の参考値であり、画面への表示完了、INP、厳密なinput-to-photon遅延、FPSの測定ではありません。WebとReact Nativeでは描画の仕組みが違うため、この数値だけで優劣を判断しないでください。初回の起動時間や通信待ちは含みません。同じ日を再度押した場合は再計測しません。

PWAの月移動にはブラウザー標準の横スクロールとCSS Scroll Snap、React Nativeには`ScrollView`の`pagingEnabled`を使い、前・当・翌月の3ページを循環させています。小さい縦画面では月カレンダーの枠内も縦スクロールでき、横画面ではカレンダーと予定一覧を左右に並べます。

## 検証

```sh
pnpm test
pnpm build
pnpm exec playwright install chromium webkit
```

別のターミナルで`pnpm preview --port 4173 --strictPort`を起動してから：

```sh
pnpm test:browser
BROWSER=webkit pnpm test:browser
```

インストール済みChromeを使用する場合は`BROWSER_CHANNEL=chrome pnpm test:browser`でも実行できます。別のURLは`PREVIEW_URL`で指定できます。スクリーンショットはGit管理外の`artifacts/`へ保存します。

自動テストは月・年の境界、終日の終了境界、予定の絞り込み、追加・編集・削除・再起動後の保存、地域切り替え、予定多数、マニフェスト・アイコン、Service Workerでのオフライン再起動を確認します。Chromiumではタッチイベントによる月スワイプも確認します。WebKitでは`dist/`をテスト専用サーバーから配信し、そのサーバーを実際に停止してオフライン再起動を検証します。

ブラウザー自動テストのモバイル画面は実機そのものではありません。iOSのキーボード・ホーム画面・実際のスクロール感やFPSは、スマートフォン上で別途確認してください。

### React Native版のWeb出力によるUI検証

```sh
pnpm --dir native export:web
pnpm exec vite preview --outDir native/dist-web --host 0.0.0.0 --port 4174 --strictPort
```

別のターミナルで`BROWSER_CHANNEL=chrome pnpm test:native-web`を実行します。PlaywrightのChromiumを使う場合は環境変数を省略できます。別URLは`NATIVE_PREVIEW_URL`で指定します。月移動10回、日付選択、複数日・読み取り専用の予定、フォーム検証、追加・編集・削除・破棄・再起動後の保存、設定、予定多数、小画面・横画面を確認します。

**これはReact Native Webの表示・操作の確認です。ネイティブ実行時の性能比較には使いません。** Web出力の日付・時刻はテキスト入力、iOS・AndroidではOS標準ピッカーです。ネイティブのピッカー・キーボード・横スワイプ・復帰・文字サイズ変更はExpo Go、性能とオフライン再起動は単体のリリースビルドで実機確認します。

本番アプリの構成案は[PLAN.md](PLAN.md)を参照してください。
