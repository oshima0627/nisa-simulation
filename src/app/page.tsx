import Simulator from "@/components/Simulator";
import { AdSlot } from "@/components/AdSlot";
import { ADSENSE_SLOTS } from "@/lib/ads";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="font-maru text-2xl font-bold leading-snug sm:text-3xl">
          新NISA、続けたらいくらになる？
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          毎月の積立額・想定利回り・期間を入れるだけで、将来の資産と節税効果をその場で試算。
          非課税枠1,800万円をいつ使い切るかもまとめてチェックできます。
        </p>
      </div>
      <Simulator />
      {/* 試算結果より下に置く。入力欄や結果カードの中には入れない。
          金融商品の広告を当サイトの推奨と混同させないため、明確に離した位置に置く */}
      <AdSlot slot={ADSENSE_SLOTS.content} className="mt-12" />
    </div>
  );
}
