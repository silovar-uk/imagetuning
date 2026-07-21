# AppDocument schemaVersion 2

```ts
type AppDocument = {
  schemaVersion: 2;
  canvas: {
    width: number;
    height: number;
    background: 'transparent' | 'white' | 'black';
  };
  images: ImageObject[];
  shapes: ShapeObject[];
  comments: CommentObject[];
};
```

画像本体は現在Data URLで保持する。ローカル画像修正と自動保存を導入する段階で、実行時キャッシュはImageBitmap、ピクセル履歴はBlob、永続化はIndexedDBへ分離する。

旧JSONに含まれるAI解析、プロンプト、生成画像、参照画像、APIレスポンスなどのフィールドは読み込み時に無視する。
