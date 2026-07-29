import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { Noto_Sans_JP, Quicksand, Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const zenMaru = Zen_Maru_Gothic({
  variable: "--font-zen-maru",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const SITE_URL = "https://nisa.nexeed-lab.com";

// Cloudflare Web Analytics のトークン。
// ダッシュボードの Web Analytics →「Add a site」で nisa.nexeed-lab.com を追加し、
// JSスニペット内の token をここに貼り付ける（空のままだと計測タグは出力されない）
const CF_BEACON_TOKEN = "";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NISAシミュレーター | Nexeed Lab",
    template: "%s | NISAシミュレーター",
  },
  description:
    "新NISAの積立シミュレーション。毎月の積立額と利回りから将来の資産を試算し、非課税枠1,800万円の使い方や節税効果もまとめてチェックできます。",
  openGraph: {
    title: "NISAシミュレーター | Nexeed Lab",
    description:
      "新NISAの積立シミュレーション。将来の資産と節税効果をかんたんに試算できます。",
    url: SITE_URL,
    siteName: "NISAシミュレーター",
    locale: "ja_JP",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSansJp.variable} ${zenMaru.variable} ${quicksand.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
            <Link href="/" className="font-maru text-lg font-bold tracking-wide">
              <span className="text-mint-deep">NISA</span>
              シミュレーター
              <span className="font-num ml-2 hidden text-[11px] font-medium tracking-widest text-ink-soft sm:inline">
                NEXEED LAB
              </span>
            </Link>
            <nav>
              <Link
                href="/guide"
                className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-mint-tint hover:text-mint-text"
              >
                新NISAとは？
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line bg-surface">
          <div className="mx-auto max-w-3xl space-y-3 px-5 py-8 text-[11px] leading-relaxed text-ink-soft">
            <p>
              本サイトのシミュレーションは概算であり、将来の運用成果を保証するものではありません。
              特定の金融商品の推奨や投資助言を行うものではありません。
              制度の内容は2024年開始の新NISA（2026年7月時点）に基づいています。
            </p>
            <p>&copy; Nexeed Lab</p>
          </div>
        </footer>
        {process.env.NODE_ENV === "production" && CF_BEACON_TOKEN && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${CF_BEACON_TOKEN}"}`}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
