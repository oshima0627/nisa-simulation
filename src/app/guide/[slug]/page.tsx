import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdSlot } from "@/components/AdSlot";
import {
  type Article,
  getAllArticleSlugs,
  getArticleBySlug,
} from "@/content/articles";
import { ADSENSE_SLOTS } from "@/lib/ads";

const SITE_URL = "https://nisa.nexeed-lab.com";

// 静的エクスポート（output: "export"）のため全記事を事前生成する
export function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: "記事が見つかりません" };

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/guide/${slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      url: `/guide/${slug}`,
      modifiedTime: article.updatedAt,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const related = article.related
    .map((s) => getArticleBySlug(s))
    .filter((a): a is Article => a !== undefined);

  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      <nav className="text-xs text-ink-soft">
        <Link href="/" className="hover:underline">
          シミュレーター
        </Link>
        {" / "}
        <Link href="/guide" className="hover:underline">
          新NISAガイド
        </Link>
      </nav>

      <h1 className="font-maru mt-3 text-2xl font-bold leading-snug sm:text-3xl">
        {article.title}
      </h1>
      <p className="mt-2 text-xs text-ink-soft">最終更新：{article.updatedAt}</p>

      {/* 結論を先に出す。検索から来た人は答えを探しているため */}
      <p className="mt-6 rounded-lg bg-mint-bg p-5 text-[15px] font-medium leading-relaxed">
        {article.lead}
      </p>

      <div className="mt-10 space-y-10 text-[15px] leading-relaxed">
        {article.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-maru mb-3 text-lg font-bold text-mint-text">
              {section.heading}
            </h2>
            <div className="space-y-4">
              {section.blocks.map((block, i) => {
                if (block.type === "p") {
                  // 段落テキストは静的データなので index を key にしても並び替えは起きない
                  return <p key={`${section.heading}-${i}`}>{block.text}</p>;
                }
                if (block.type === "list") {
                  return (
                    <ul
                      key={`${section.heading}-${i}`}
                      className="list-disc space-y-2 pl-5"
                    >
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p
                    key={`${section.heading}-${i}`}
                    className="rounded-lg border-l-4 border-mint-text bg-mint-bg/60 p-4 text-sm"
                  >
                    {block.text}
                  </p>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {article.simulator ? (
        <div className="mt-10 rounded-lg border border-line p-6 text-center">
          <p className="text-sm text-ink-soft">
            記事の条件をそのまま入れた状態で試せます
          </p>
          <Link
            href={`/${article.simulator.query}`}
            className="font-maru mt-3 inline-block rounded-full bg-mint-text px-6 py-3 font-bold text-white"
          >
            {article.simulator.label}
          </Link>
        </div>
      ) : null}

      <AdSlot slot={ADSENSE_SLOTS.content} className="mt-10" />

      {related.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-maru mb-3 text-lg font-bold text-mint-text">
            あわせて読みたい
          </h2>
          <ul className="space-y-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/guide/${r.slug}`}
                  className="block rounded-lg border border-line p-4 hover:bg-mint-bg/40"
                >
                  <p className="font-bold">{r.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{r.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 rounded-lg bg-line/30 p-4 text-xs leading-relaxed text-ink-soft">
        本記事の試算はすべて月次複利で計算した概算であり、将来の運用成果を約束するものではありません。
        制度の内容は変更される場合があります。投資判断はご自身の責任でお願いします。
        制度の詳細は
        <a
          href="https://www.fsa.go.jp/policy/nisa2/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          金融庁「新しいNISA」
        </a>
        をご確認ください。
      </p>

      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: 構造化データ用
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildArticleLd(article)),
        }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: 構造化データ用
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildBreadcrumbLd(article)),
        }}
      />
    </article>
  );
}

function buildArticleLd(article: Article) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    url: `${SITE_URL}/guide/${article.slug}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/guide/${article.slug}`,
    },
    dateModified: article.updatedAt,
    inLanguage: "ja-JP",
    author: { "@type": "Organization", name: "Nexeed Lab" },
    publisher: { "@type": "Organization", name: "NISAシミュレーター", url: SITE_URL },
  };
}

function buildBreadcrumbLd(article: Article) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "シミュレーター", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "新NISAガイド",
        item: `${SITE_URL}/guide`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: `${SITE_URL}/guide/${article.slug}`,
      },
    ],
  };
}
