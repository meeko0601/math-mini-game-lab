# STRUCTURE

## 設計境界

- `config/` は**画像パス、キャラクターの表情と配役、題材、言葉、難易度、色**を持つ。子どもの希望はまずここへ反映する。
- `games/` は**その遊び固有の操作と正解条件**だけを持つ。
- `core/` は**問題生成、DOM生成、画像／絵文字の表示切替、キャラクター表示、音、共通フィードバック**を持つ。`characters.js` が会話・ホーム・結果表示の共通レイアウトを担当する。
- `core/pwa.js` は本番ビルドだけでService Workerを登録し、設定から受け取った全ゲーム画像のキャッシュ完了を通知する。
- `public/sw.js` はアプリシェル、ビルド後のCSS・JavaScript、manifest、アイコン、ゲーム画像をキャッシュし、オフライン時の応答を担当する。
- `main.js` は**画面切り替え、ゲーム登録、PWA準備状態の表示**を担当する。
- `styles.css` は共通UI、透過PNGの表示枠、ゲーム設定から渡されるCSS変数を扱う。

## ゲームモジュール契約

洞窟ゲームは `games/caveGame.js` がDOM表示と音声・タイマーの破棄を担当します。
`games/cave/` はManus引き継ぎ版の純粋な問題生成・状態遷移をJavaScriptへ変換したものです。
素材・数の範囲は `config/cave.js`、配役とカードは `config/games.js`、文言は `games/cave/copy.js` に置きます。
引き継ぎ版のReact/Tailwind UIは持ち込まず、このアプリのHTML/CSS/JavaScript構成を維持しています。

ゲームは `mountXGame({ stage, feedback, config, nextRound, soundEnabled })` をexportし、破棄処理関数を返す。正解／再挑戦は `createFeedbackController` を再利用する。ゲーム固有の題材や数字を直書きせず、`config` から受け取る。
