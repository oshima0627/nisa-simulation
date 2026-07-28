import type { MetadataRoute } from "next";

// 静的エクスポート（output: "export"）ではメタデータルートも静的化が必要
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://nisa.nexeed-lab.com/sitemap.xml",
  };
}
