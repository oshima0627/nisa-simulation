"use client";

import { useState } from "react";
import { formatManYen } from "@/lib/format";

interface Props {
  shareUrl: string;
  finalValue: number;
  years: number;
}

export default function ShareButtons({ shareUrl, finalValue, years }: Props) {
  const [copied, setCopied] = useState(false);

  const text = `新NISAで${years}年積み立てたら${formatManYen(finalValue)}になる試算に。`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード非対応環境では何もしない
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={copy}
        className="font-maru rounded-full bg-mint-deep px-7 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        {copied ? "コピーしました！" : "結果のURLをコピー"}
      </button>
      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-line px-5 py-3 text-sm font-medium transition-colors hover:bg-mint-tint"
      >
        Xでシェア
      </a>
      <a
        href={lineUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-line px-5 py-3 text-sm font-medium transition-colors hover:bg-mint-tint"
      >
        LINEで送る
      </a>
    </div>
  );
}
