# PR #11 — Add share/examples/fileio

このプルリクは以下の機能を追加します。

## 追加機能

1. URL シェア (Share ボタン)
   - 現在のエディタ内容を Base64 エンコードして URL ハッシュに埋め込み、クリップボードへコピーします。
   - ハッシュがある場合、ページ読み込み時にコードを自動復元します。

2. サンプルコードパネル (Examples ボタン)
   - カテゴリ別サンプル（20 種類）を表示するモーダルを追加。
   - ホバーでコードプレビュー、クリックでエディタに読み込み。
   - ファイル: `src/components/ExamplesModal.tsx`, サンプル定義は `src/utils/codeFormatter.ts` に追加。

3. ファイル保存/読み込み
   - 現在のコードを `code.rb` としてダウンロード。
   - .rb/.txt ファイルをアップロードしてエディタに読み込み。

## 変更ファイル
- src/utils/codeFormatter.ts
- src/components/ExamplesModal.tsx (新規)
- src/App.tsx

## テスト & ビルド
- npm run build : ビルド OK
- npm test : 全 59 テスト通過

## 確認方法
1. ローカルで起動: `npm install` && `npm run dev`
2. エディタでコードを書き、Share ボタンで URL を取得
3. Examples でサンプルを読み込み、Upload/Download を試す

## 備考
- スクリーンショットは後で追加できます。
- もし PR 本文を直接編集したければ GitHub の PR 編集画面で追記ください。

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
