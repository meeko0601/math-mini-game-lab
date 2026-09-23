# さんすう あそび（仮）

4歳くらいの子ども本人と相談しながら、短い算数ミニゲームを素早く作り変えるための**開発用の土台**です。完成した教材や正式な世界観ではありません。Todo Mathのような「短い算数遊びを選ぶ」という教育アイデアだけを参考にし、画像・音声・デザイン・コードは使用していません。

外部API、アカウント、サーバー、データベースはありません。ローカルの透過PNG、絵文字、CSS図形、ブラウザ標準のWeb Audio APIだけで動きます。PWA対応済みで、初回のキャッシュ完了後はオフラインでも3ゲームを遊べます。

## 1. 起動方法

Node.js 20以上とpnpmを用意し、プロジェクトのルートで次を実行します。

```bash
pnpm install
pnpm dev
```

表示されたURL（通常は `http://localhost:3000`）をブラウザで開いてください。ファイルを保存すると、ViteのHot Module Replacementにより画面へすぐ反映されます。

開発サーバーではキャッシュ事故を防ぐためService Workerを登録しません。PWAを確認するときは本番ビルドをプレビューします。

```bash
pnpm build
pnpm preview
```

通常は `http://localhost:4173` で開き、ホーム下部に「✓ オフラインで あそべます」と表示されるまで待ちます。

テストと本番用ビルドは次のコマンドです。

```bash
pnpm test
pnpm build
# または両方まとめて
pnpm check
```

## 2. 技術構成とファイル構成

追加ランタイム依存を持たない、**Vite + HTML + CSS + Vanilla JavaScript**です。Reactやゲームエンジンは使っていません。

```text
math-mini-game-lab/
├── client/
│   ├── index.html                 # ブラウザの入口
│   ├── public/manifest.json        # PWA名、表示形式、アイコン
│   ├── public/sw.js                # オフラインキャッシュ
│   ├── public/assets/              # ゲーム画像とPWAアイコン
│   └── src/
│       ├── main.js                # ホーム画面、画面切り替え、ゲーム登録
│       ├── styles.css             # 共通UI、タッチ領域、演出、レスポンシブ表示
│       ├── config/
│       │   └── games.js           # 最初に触る設定ファイル
│       ├── core/
│       │   ├── audio.js           # Web Audio APIによる短い効果音
│       │   ├── dom.js             # 小さなDOM生成ヘルパー
│       │   ├── feedback.js        # 正解・再挑戦・つぎへの共通UI
│       │   ├── pwa.js             # Service Worker登録とキャッシュ完了通知
│       │   └── questions.js       # 問題のランダム生成
│       └── games/
│           ├── countGame.js       # A：数える
│           ├── moveGame.js        # B：指定数をドラッグ／タップで動かす
│           └── chooseGame.js      # C：条件に合うものを選ぶ
├── test/
│   └── questions.test.js          # 問題生成の最低限の自動テスト
├── README.md
├── PLAN.md                        # 実装方針と確認基準
├── STRUCTURE.md                   # 設計上の境界
├── MEMORY.md                      # 判断理由と次回の注意点
├── ASSETS.md                      # 仮素材の扱い
├── VISUAL_QA.md                   # 画面サイズ別・実操作の確認記録
├── package.json
├── pnpm-workspace.yaml            # esbuildだけをビルド許可
└── vite.config.js
```

WebDevの雛形互換用として `server/` と `shared/` が残っていますが、このアプリからは参照せず、起動・ビルドにも使いません。別環境へ渡す配布ZIPには含めていません。

## iPadへインストールする前提

Service Workerは安全な接続でのみ動作するため、iPadから使う公開先には **HTTPS** が必要です。PC上の `localhost` はPC内だけの確認用で、そのURLをiPadへ入力しても利用できません。

GitHubとVercelを使う場合は、リポジトリへこのフォルダーをアップロードし、VercelでFramework Presetを `Vite`、Build Commandを `pnpm build`、Output Directoryを `dist` に設定します。発行されたHTTPS URLをiPadのSafariで一度開き、「✓ オフラインで あそべます」を確認してから、共有ボタンの「ホーム画面に追加」を選びます。その後はホーム画面のアイコンから起動でき、機内モードでも遊べます。

同じファイル名の画像を更新した場合は、古い端末キャッシュを確実に入れ替えるため `client/public/sw.js` の `CACHE_NAME`（例：`sansuu-asobi-v2`）を1つ進めてから再ビルドします。

## 3. ゲームを追加する方法

### 既存3種類と同じ遊びを増やす

`client/src/config/games.js` の `GAME_CONFIGS` に設定オブジェクトを追加します。`id` は重複しない英数字、`kind` は `count`、`move`、`choose` のどれかにします。これだけでホーム画面へカードが増え、同じ共通ロジックを再利用できます。

### 新しい遊び方を追加する

1. `client/src/games/` に `newGame.js` を作り、`mountNewGame({ stage, feedback, config, nextRound, soundEnabled })` の形で関数をexportします。
2. `client/src/main.js` の `gameMounts` に `new: mountNewGame` を追加します。
3. `client/src/config/games.js` に `kind: "new"` の設定を追加します。
4. 問題生成が必要なら、純粋関数を `client/src/core/questions.js` に追加し、`test/questions.test.js` へテストを追加します。

ゲーム側は `stage` に問題UIを置き、`createFeedbackController` の `success()` / `retry()` を呼ぶ構造にすると、共通の正解演出と「つぎへ」を再利用できます。

## 4. キャラクターや題材を変更する場所

基本的に **`client/src/config/games.js` だけ**を変更します。

| 変更したいもの | 設定名 | 例 |
|---|---|---|
| ゲーム名 | `title` | `かぞえよう` |
| ホームの絵 | `cardIcon` | `🍓` |
| キャラクター名・表情画像 | `CHARACTER_ASSETS` | `answer.expressions.thinking` など |
| ホームに出す4人 | `APP_CONFIG.characters` | `Object.values(CHARACTER_ASSETS)` |
| 各ゲームの2人組 | `castCycle` | 2組を問題ごとに交互表示 |
| カード画像 | `images.card` | 手がかり画像 |
| 数える画像3種 | `GAME_ITEM_ASSETS.count` | effectsの3画像 |
| 運ぶ画像3種 | `GAME_ITEM_ASSETS.move` | mascotsの3画像 |
| 見つける画像8種 | `GAME_ITEM_ASSETS.choose` | charactersの通常・成功画像 |
| 運ぶ先の画像 | `images.destination` | `null`なら絵文字 |
| 正解画像 | `images.success` | はなまる画像 |
| 運ぶ先 | `destinationIcon` | `🧺` |
| 問題文 | `prompt`, `instructionTemplate`, `promptTemplate` | `{count}こ あげよう` |
| 正解時の言葉 | `successMessages` | `["やったね！"]` |
| 再挑戦の言葉 | `retryMessage` | `ゆっくりで だいじょうぶ` |
| 色 | `theme` | `accent`, `background` など |

各題材は `id`、読み上げ用の `label`、`image`、画像が使えない場合の `icon` を持ちます。配列の並び順で問題ごとに循環するため、ランダムな偏りなく全画像が登場します。「みつけよう」の不正解候補も、同じ問題内では重複しません。

PNGのパスは同じファイルの `CHARACTER_ASSETS` と `IMAGE_ASSETS` に集約しています。4人には `smile`（ほほえみ）、`joy`（満面の笑顔）、`sad`（悲しい）、`thinking`（考える）の表情があります。問題文では1人目が `thinking`、2人目が `smile`、再挑戦では `sad` と `smile`、正解時は2人とも `joy` に自動で切り替わります。各ゲームの `castCycle` を変えるだけで、登場する2人組と交代順を変更できます。高解像度版は `assets/characters/expressions/`、ゲームが読む軽量版はその中の `web/` に分けています。

## 5. 難易度を変更する場所

`client/src/config/games.js` で調整します。

| ゲーム | 主な設定 | 内容 |
|---|---|---|
| 数える | `min`, `max` | 出る個数の範囲 |
| 数える | `answerChoices` | 答えボタンの数 |
| 運ぶ | `min`, `max` | 指定される個数の範囲 |
| 運ぶ | `extraItems` | 余分に置く物の数 |
| 選ぶ | `choiceCount` | 全選択肢の数 |
| 選ぶ | `targetCount` | 正解として見つける個数 |

4歳児向けの初期値として、数えるゲームは1〜10、運ぶゲームは1〜5にしています。難しくする前に、本人が気持ちよく操作できるかを優先してください。

## 操作と実装上の考え方

すべての主要ボタンは大きいタップ領域を持ち、キーボードのフォーカス表示も残しています。運ぶゲームはPointer Eventsを使うため、マウス・ペン・タッチで同じコードが動きます。ドラッグが難しい場合は、物を**タップするだけでも運べる**ようにしています。不正解は減点や強い警告を出さず、短い言葉と小さな揺れだけで再挑戦を促します。

効果音は、ユーザー操作のあとにWeb Audio APIで短い音を合成します。音声ファイルはありません。ホーム／ゲーム画面右上のスピーカーボタンで、その場だけオン・オフできます。

## 次のAIコーディングエージェントへの引き継ぎ

### 1. 現在実装済みの機能

ホーム画面、3枚のゲームカード、設定から差し替えられるPNG画像枠、数える／指定数を動かす／条件に合うものを選ぶ3テンプレート、ランダム問題生成、タップ回答、Pointer Eventsによるドラッグ、タップによるドラッグ代替、正解判定、責めない再挑戦メッセージ、短い正解アニメーション、Web Audio APIの効果音、「つぎへ」、ホームへ戻る導線、スマートフォン／タブレット／PC向けレスポンシブ表示、`prefers-reduced-motion` 対応を実装済みです。

### 2. 仮実装になっている部分

正式なタイトル、絵文字、案内役、画像の担当、題材、配色、言葉、正解演出はすべて仮です。現在はチーム画像、ルーペ、手がかり、はなまるだけを共通表示し、個別キャラクターとマスコットは候補として登録するに留めています。効果音も最小の合成音です。進捗保存、ステージ制、得点、読み上げ、保護者画面、PWA化は意図的に実装していません。

### 3. 子どもと相談して後から決める部分

ゲーム全体の名前、主人公、各キャラクターの担当、世界観、何を数えるか、誰に何を運ぶ／食べさせるか、好きな色、正解時に起こること、本人独自のルールは未決定です。画像ZIP内のファイル名や素材マニフェストの担当案も完成案として扱わず、子ども本人との相談後に設定してください。

### 4. ゲーム内容を変更するときに触るファイル

最初は `client/src/config/games.js` だけを見てください。題材、言葉、個数、難易度、テーマの多くを変更できます。見た目の共通ルールは `client/src/styles.css`、ゲーム固有の操作変更は `client/src/games/*.js`、共通の正解演出は `client/src/core/feedback.js`、問題生成は `client/src/core/questions.js` です。

### 5. 新しいミニゲームを追加する方法

既存の操作型なら `GAME_CONFIGS` に設定を1件追加します。新しい操作型なら `games/` に `mount...Game` を追加し、`main.js` の `gameMounts` に登録します。DOMや演出を複製せず、`core/` のヘルパーを再利用してください。設定から変えられる要素をゲームファイルへ直接書かないことが、高速なバイブコーディングを保つポイントです。

### 6. 現在分かっている問題・未完成部分

物理端末での最終確認は今後必要です。ブラウザの自動再生制限により、最初のユーザー操作より前には音を鳴らせません（現在の実装は操作後に開始します）。iPhoneの小さい横画面では内容量によって縦スクロールが発生することがあります。ドラッグ中の物はDOM要素の範囲内で動かす簡易実装で、複雑な当たり判定や並べ替えはありません。状態は再読み込みでリセットされます。

## ライセンスと素材

Unicode絵文字とCSS図形に加え、`detective-precure-math-game-assets-web-ready.zip` の軽量・透過PNG 15枚を `client/public/assets/` に配置しています。素材ZIPの権利表示では、ファンメイドのAI生成プロトタイプ素材であり、キャラクターと作品の権利は各権利者に帰属するとされています。家庭内・個人用プロトタイプ以外で公開・配布・商用利用する前に、必要な許諾を確認してください。詳細は `ASSETS.md` を参照してください。
