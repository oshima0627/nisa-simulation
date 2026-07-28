# NISAシミュレーター

新NISA（2024年〜）の積立シミュレーションWebサイト。
毎月の積立額・想定利回り・期間から将来の資産と節税効果を試算し、
生涯非課税枠1,800万円の消化状況もあわせて可視化する。

- 公開URL: https://nisa.nexeed-lab.com
- 要件定義: [docs/requirements.md](docs/requirements.md)

## 開発

```bash
npm install
npm run dev        # 開発サーバー (http://localhost:3000)
npm test           # 計算エンジンのユニットテスト (Vitest)
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run build      # 本番ビルド
```

## 構成

| ディレクトリ | 内容 |
|---|---|
| `src/lib/simulation/` | 計算エンジン（UI非依存の純粋関数・テスト必須） |
| `src/lib/share/` | シミュレーション条件 ⇔ URLパラメータの変換 |
| `src/constants/` | 新NISAの制度定数（枠上限・税率）。制度改正時はここだけ直す |
| `src/components/` | UIコンポーネント |
| `src/app/` | ページ（トップ＝シミュレーター、`/guide`＝制度解説） |

## 計算仕様

計算方法の詳細は [docs/requirements.md の §3](docs/requirements.md) を参照。
要点: 月次複利（月利＝年率÷12、金融庁つみたてシミュレーターと同方式）、
非課税枠は簿価ベースで管理し、上限到達で積立を自動停止する。
