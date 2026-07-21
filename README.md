# Image Tuning

画像へコメントや修正指示を付け、PNGとJSONで共有するブラウザアプリ。旧版のAI機能を撤去し、React + TypeScriptで再構築中。

## 開発

```bash
npm install
npm run dev
```

## 確認

```bash
npm run check
```

## 現在の実装範囲

- 画像読込（PNG / JPEG / WEBP / PSD）
- 選択・移動・パン・ズーム
- コメント・レイヤー
- Undo / Redo
- JSON保存・読込
- PNG出力

詳細は `docs/roadmap.md` と `docs/feature-matrix.md` を参照。
