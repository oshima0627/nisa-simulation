import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "新NISAとは？しくみをやさしく解説",
  description:
    "2024年に始まった新NISAのしくみを、はじめての人向けにやさしく解説。つみたて投資枠と成長投資枠のちがい、生涯非課税枠1,800万円のルールがわかります。",
};

export default function GuidePage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="font-maru text-2xl font-bold leading-snug sm:text-3xl">
        新NISAとは？しくみをやさしく解説
      </h1>

      <div className="mt-8 space-y-10 text-[15px] leading-relaxed">
        <section>
          <h2 className="font-maru mb-3 text-lg font-bold text-mint-text">
            NISAは「もうけに税金がかからない」制度
          </h2>
          <p>
            投資でもうかったお金（値上がり益や分配金）には、ふつう約20%の税金がかかります。
            たとえば100万円もうかったら、約20万円が税金です。
            NISA口座で買った分は、この税金がまるごとかかりません。
            2024年に始まった新しいNISAでは、非課税で持てる期間の制限もなくなりました。
          </p>
        </section>

        <section>
          <h2 className="font-maru mb-3 text-lg font-bold text-mint-text">
            2つの枠：つみたて投資枠と成長投資枠
          </h2>
          <p className="mb-4">
            新NISAには2種類の枠があり、あわせて年間360万円まで投資できます。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-soft">
                  <th className="py-2 pr-4 font-medium">枠</th>
                  <th className="py-2 pr-4 font-medium">年間の上限</th>
                  <th className="py-2 font-medium">買えるもの</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line">
                  <td className="py-3 pr-4 font-bold">つみたて投資枠</td>
                  <td className="font-num py-3 pr-4">120万円</td>
                  <td className="py-3">
                    金融庁の基準を満たした投資信託（長期の積立向き）
                  </td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-3 pr-4 font-bold">成長投資枠</td>
                  <td className="font-num py-3 pr-4">240万円</td>
                  <td className="py-3">投資信託に加えて株式など、より幅広い商品</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="font-maru mb-3 text-lg font-bold text-mint-text">
            一生で使えるのは1,800万円まで
          </h2>
          <p>
            非課税で投資できる金額には、一生を通じた上限（生涯非課税保有限度額）が1,800万円あります。
            このうち成長投資枠で使えるのは1,200万円までです。
            上限のカウントは「買ったときの金額（簿価）」で行われるので、値上がりしても枠は減りません。
            また、売却するとその分の枠（買ったときの金額分）が翌年に復活し、再利用できます。
          </p>
        </section>

        <section>
          <h2 className="font-maru mb-3 text-lg font-bold text-mint-text">
            まずは自分の数字で試してみる
          </h2>
          <p>
            「毎月いくら積み立てると、何年後にいくらになるのか」。
            制度の説明を読むより、自分の数字で一度シミュレーションしてみるのがいちばん早いです。
          </p>
          <p className="mt-5">
            <Link
              href="/"
              className="font-maru inline-block rounded-full bg-mint-deep px-7 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              シミュレーションしてみる
            </Link>
          </p>
        </section>
      </div>

      <p className="mt-12 border-t border-line pt-6 text-[11px] leading-relaxed text-ink-soft">
        本記事は2026年7月時点の制度に基づく一般的な情報提供であり、特定の金融商品の推奨や投資助言を行うものではありません。
        最新の制度内容は金融庁のウェブサイトをご確認ください。
      </p>
    </article>
  );
}
