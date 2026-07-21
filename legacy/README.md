# Legacy source

旧版は約500KBの単一HTMLで、AI解析・リミックス・インペイントを含む。新アプリは旧コードを直接移植せず、動作仕様の確認にだけ利用する。

公開版へはAI通信、プロンプト、参照画像、生成レスポンス、AI専用UIを持ち込まない。必要な非AI機能は `docs/feature-matrix.md` に沿ってReact + TypeScriptで再実装する。
