"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, adsEnabled } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSlotProps = {
  /** AdSense 広告ユニットのスロットID */
  slot: string;
  className?: string;
};

/**
 * AdSense のディスプレイ広告枠。
 *
 * - スロットID未設定のあいだは何も描画しない（審査が通るまでは空）
 * - 「広告」ラベルを必ず出す。試算結果を当サイトの見解と混同させないため
 * - min-height で高さを先に確保し、読み込み時のレイアウトのずれ（CLS）を防ぐ
 */
export function AdSlot({ slot, className }: AdSlotProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!adsEnabled || !slot || pushed.current) return;
    try {
      // ライブラリの読み込み前に push しても、読み込み後にキューが処理される
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      // ライブラリ未読込・重複pushは無視
    }
  }, [slot]);

  if (!adsEnabled || !slot) return null;

  return (
    <aside className={`w-full text-center ${className ?? ""}`}>
      <span className="text-[10px] font-semibold tracking-[0.18em] text-ink-soft">
        広告
      </span>
      <ins
        className="adsbygoogle mt-1 block"
        style={{ display: "block", minHeight: 280 }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
