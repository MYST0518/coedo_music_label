# Coedo Music Labo — CD Online Shop

**"This is AI Sound"** コンピレーションアルバム公式オンラインショップ

---

## 🚀 クイックスタート

### 1. 依存パッケージのインストール
```bash
npm install
```

### 2. 環境変数の設定
```bash
# .env.example をコピーして .env を作成
copy .env.example .env
```

`.env` を編集し、[Square Developer Dashboard](https://developer.squareup.com/apps) から取得した値を入力：
```
SQUARE_ACCESS_TOKEN=YOUR_SANDBOX_ACCESS_TOKEN
SQUARE_APPLICATION_ID=YOUR_SANDBOX_APPLICATION_ID
SQUARE_LOCATION_ID=YOUR_SANDBOX_LOCATION_ID
SQUARE_ENVIRONMENT=sandbox
ALLOWED_ORIGIN=http://localhost:3000
SESSION_SECRET=（ランダムな32文字以上の文字列）
```

### 3. ローカル起動
```bash
npm run dev
# → http://localhost:3000 でアクセス
```

### 4. Sandboxテスト
Square Sandboxテストカード番号でテスト決済が可能：
```
カード番号: 4111 1111 1111 1111
有効期限:   任意の未来の月年（例: 12/26）
CVV:        任意3桁（例: 123）
郵便番号:   任意7桁（例: 1234567）
```

---

## ☁️ Vercelへのデプロイ

### 1. Vercel CLIのインストール
```bash
npm install -g vercel
```

### 2. Vercel環境変数の設定
Vercelダッシュボード → Project Settings → Environment Variables で以下を設定：
```
SQUARE_ACCESS_TOKEN    = （Squareから取得）
SQUARE_APPLICATION_ID  = （Squareから取得）
SQUARE_LOCATION_ID     = （Squareから取得）
SQUARE_ENVIRONMENT     = sandbox（本番は production）
ALLOWED_ORIGIN         = https://your-project.vercel.app
SESSION_SECRET         = （ランダム文字列）
NODE_ENV               = production
```

### 3. デプロイ
```bash
vercel --prod
```

> ⚠️ **重要**: Vercel デプロイ後、`ALLOWED_ORIGIN` をデプロイされたURLに更新してください。

---

## 🔒 セキュリティ対策

| 項目 | 実装 |
|------|------|
| カード情報の保護 | Square SDKのiframeで処理（当サーバーを通過しない・PCI DSS準拠） |
| 金額改ざん防止 | サーバーサイドで価格を再計算（フロントの金額を一切信頼しない） |
| CSP | Helmet.jsで厳格なContent Security Policy |
| HTTPS強制 | HSTS ヘッダーで強制 |
| レート制限 | 注文エンドポイントは15分に5回まで |
| XSS対策 | `textContent` / `escapeHtml` で入力を安全に表示 |
| 入力検証 | Joi によるサーバーサイドスキーマバリデーション |
| 環境変数 | Access Token は `.env` で管理、フロントエンドに非公開 |
| 冪等性 | Square APIへはUUIDによるidempotencyKeyを送信（二重請求防止） |

---

## 📁 ファイル構成

```
coedo-shop/
├── index.html          # 商品ページ
├── checkout.html       # チェックアウト
├── success.html        # 購入完了
├── album_cover.png     # アルバムアート
├── css/
│   ├── style.css       # メインCSS
│   └── checkout.css    # チェックアウトCSS
├── js/
│   ├── shop.js         # 商品ページJS
│   └── checkout.js     # Square決済JS
├── server/
│   ├── server.js       # Expressサーバー
│   └── routes/
│       └── payment.js  # Square Payment API
├── .env.example        # 環境変数テンプレート
├── .gitignore
├── vercel.json
└── package.json
```

---

## 💳 本番移行チェックリスト

- [ ] Square本番アカウントの審査完了
- [ ] `SQUARE_ENVIRONMENT=production` に変更
- [ ] 本番用 `SQUARE_ACCESS_TOKEN` / `SQUARE_APPLICATION_ID` / `SQUARE_LOCATION_ID` に更新
- [ ] `checkout.html` の Square SDK URLを本番用に変更:
  - `sandbox.web.squarecdn.com` → `web.squarecdn.com`
- [ ] カスタムドメインの設定
- [ ] HTTPS証明書の確認
- [ ] `ALLOWED_ORIGIN` を本番ドメインに更新

---

© 2026 Coedo Music Labo
