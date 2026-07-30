import type { MetadataRoute } from "next";

// 静的エクスポート（output: "export"）ではメタデータルートも静的化が必要
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://nisa.nexeed-lab.com";
  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/guide`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.1 },
  ];
}
