# Rebuild Roadmap

## 方針

UIと確定済みドキュメント状態はReact、Canvas描画・Pointer操作・画像処理はPure TypeScriptへ分離する。AI機能、外部生成API、プロンプト、参照画像、AI解析状態は新アプリへ持ち込まない。

## Phase 1 — Foundation（実装済み）

- 旧HTML保存
- React / TypeScript / Vite初期化
- 3カラムUIとデザイントークン
- AppDocument v2、Reducer、Undo / Redo
- GitHub Pagesワークフロー

## Phase 2 — Vertical Slice（実装済み）

- 画像読込
- Canvas描画
- 選択・移動・パン・ズーム
- コメント・レイヤー同期
- JSON / PNG出力

## Phase 3 — Annotation Tools

1. 共通 `CanvasTool` インターフェース
2. 四角・円・矢印
3. ペン
4. テキスト・吹き出し
5. カラータグ
6. 図形選択、移動、リサイズ、削除
7. 線色、太さ、破線、矢印端設定

完成条件：すべての図形操作がUndoでき、コメント番号とエクスポートへ反映される。

## Phase 4 — Image Adjustments

1. トリミング
2. 透明度のプレビュー／確定分離
3. 色置換
4. 2階調化
5. スポイト
6. 主要色抽出
7. 色割合分析

完成条件：キャンセル時は元画像不変、確定時だけ履歴へ1件追加。

## Phase 5 — Local Retouch

1. `RetouchSession` と作業用Canvas
2. 消去ブラシ（destination-out）
3. 単色塗り（source-over）
4. ソフトブラシと硬さ
5. ぼかし画像＋マスク合成
6. ブラシサイズ、不透明度、ぼかし強度
7. 押している間だけ修正前を表示
8. モーダル内Undo / Redo
9. 適用時に元画像へ直接反映
10. メインUndoで適用前へ復元

完成条件：大画像でもPointer移動中にReact再レンダリングを発生させず、キャンセルで完全復元。

## Phase 6 — Review Workflow

- 上から順／作成順の番号切替
- 未入力コメント抽出
- Markdownコピー
- コメントと図形の双方向スクロール
- レイヤー表示・ロック・並び替え
- 空コメント警告

## Phase 7 — Export and Recovery

- PNGプレビュー
- 白・黒・透過背景
- 番号あり／なし
- ファイル名管理
- IndexedDB自動一時保存
- 復元導線
- 大容量Blob履歴のメモリ上限

## Phase 8 — Quality

- Vitest：座標、ヒットテスト、履歴、マイグレーション、画像処理
- Playwright：画像読込→コメント→保存→再読込→PNG出力
- Chrome / Edge、高DPI、小型ノートPC、大画像の確認
- アクセシビリティとショートカットヘルプ
