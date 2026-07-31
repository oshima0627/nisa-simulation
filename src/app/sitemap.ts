import type { MetadataRoute } from "next";

import { articles } from "@/content/articles";

// 静的エクスポート（output: "export"）ではメタデータルートも静的化が必要
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://nisa.nexeed-lab.com";

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/guide`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.1 },
  ];

  // 解説記事。検索の入口はツール本体より記事のほうが数を作れるため、
  // 記事を増やすたびに sitemap も自動で増えるようにしておく。
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${base}/guide/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...articlePages];
}
