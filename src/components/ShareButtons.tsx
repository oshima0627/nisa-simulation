"use client";

import { useState } from "react";
import { formatManYen } from "@/lib/format";

interface Props {
  shareUrl: string;
  finalValue: number;
  years: number;
}

/**
 * 試算結果の共有ボタン群。
 *
 * 共有するのは条件をクエリに載せたURLだけで、サーバーへの送信は一切ない。
 * リンクを開いた相手のブラウザで同じ条件が復元され、同じ結果が再計算される。
 */
export default function ShareButtons({ shareUrl, finalValue, years }: Props) {
  // コピー完了のフィードバック表示。2秒後に自動で元に戻す
  const [copied, setCopied] = useState(false);

  // SNSの投稿本文。結論の数字を入れて、リンクを開かなくても内容が伝わるようにする
  const text = `新NISAで${years}年積み立てたら${formatManYen(finalValue)}になる試算に。`;
  // クエリ文字列に埋め込むため、本文とURLは必ずエンコードする
  // （URLに含まれる & や = がパラメータの区切りと誤認されるのを防ぐ）
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
  // LINEの共有はURLのみを受け取る仕様なので本文は渡さない
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;

  const copy = async () => {
    try {
      // Clipboard API は HTTPS（またはlocalhost）かつ許可が必要。
      // 失敗しても致命的ではないので、握りつぶしてボタンの表示を変えないだけにする
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
