import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "NISAシミュレーターのプライバシーポリシー。アクセス解析および広告配信における情報の取り扱いについて記載しています。",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="font-maru text-2xl font-bold leading-snug sm:text-3xl">
        プライバシーポリシー
      </h1>

      <div className="mt-8 space-y-10 text-[15px] leading-relaxed">
        <section>
          <p>
            Nexeed Lab（以下「当方」）は、NISAシミュレーター（以下「本サービス」）における
            利用者の情報の取り扱いについて、以下のとおり定めます。
          </p>
        </section>

        <section>
          <h2 className="font-maru mb-3 text-lg font-bold text-mint-text">
            1. 取得する情報
          </h2>
          <p className="mb-3">本サービスでは、以下の情報を取得することがあります。</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              アクセスログ（IPアドレス、ブラウザの種類、参照元ページ、閲覧したページ等）
            </li>
            <li>広告配信のために付与される Cookie 等の識別子</li>
          </ul>
          <p className="mt-3">
            入力していただいた積立額・利回り・期間などの数値は、
            <strong>ブラウザの中だけで計算しており、当方のサーバーには送信されません。</strong>
            氏名・メールアドレス・口座情報などの個人情報をお預かりする仕組みはありません。
          </p>
        </section>

        <section>
          <h2 className="font-maru mb-3 text-lg font-bold text-mint-text">
            2. アクセス解析ツール
          </h2>
          <p>
            本サービスは、サイト改善のためのアクセス解析として Cloudflare, Inc. が提供する
            Cloudflare Web Analytics を利用しています。個人を識別する情報は取得せず、
            ページビュー数・参照元・利用デバイス種別などの集計的な情報のみが記録されます。
            詳細は{" "}
            <a
              className="text-mint-text underline hover:no-underline"
              href="https://www.cloudflare.com/privacypolicy/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cloudflare のプライバシーポリシー
            </a>
            をご確認ください。
          </p>
        </section>

        <section>
          <h2 className="font-maru mb-3 text-lg font-bold text-mint-text">
            3. 広告配信（Google AdSense）について
          </h2>
          <p>
            本サービスでは、第三者配信の広告サービス「Google AdSense」（Google LLC 提供）を
            利用する場合があります。Google AdSense は、利用者の興味・関心に応じた広告を
            表示するために Cookie 等を使用し、本サービスや他のウェブサイトへのアクセス情報を
            取得・利用することがあります。
          </p>
          <p className="mt-3">
            これらの Cookie 等により収集される情報に、氏名・メールアドレス・電話番号など
            個人を直接特定する情報は含まれません。なお、これらの情報は Google 社（米国）に
            送信・保管される場合があります。
          </p>
          <p className="mt-3">
            <strong>広告は当方が選んだものではありません。</strong>
            広告として表示される金融商品・金融機関について、当方が推奨・保証するものでは
            ありません。広告部分には「広告」と表示しています。
          </p>
          <p className="mt-4 font-bold">パーソナライズ広告の無効化（オプトアウト）</p>
          <p className="mt-1">
            利用者は、Google の広告設定ページからパーソナライズ広告を無効にできます。
            無効にした場合でも、興味・関心に基づかない広告は表示されることがあります。
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <a
                className="text-mint-text underline hover:no-underline"
                href="https://myadcenter.google.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google 広告設定（マイ アド センター）
              </a>
            </li>
            <li>
              <a
                className="text-mint-text underline hover:no-underline"
                href="https://policies.google.com/technologies/ads?hl=ja"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google の広告における Cookie の使用について
              </a>
            </li>
            <li>
              <a
                className="text-mint-text underline hover:no-underline"
                href="https://www.aboutads.info/choices/"
                target="_blank"
                rel="noopener noreferrer"
              >
                第三者配信事業者による広告のオプトアウト（aboutads.info）
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-maru mb-3 text-lg font-bold text-mint-text">
            4. Cookie の無効化
          </h2>
          <p>
            ブラウザの設定により Cookie を無効にできます。本サービスの計算機能は Cookie を
            使用していないため、無効にしても試算はご利用いただけます。
          </p>
        </section>

        <section>
          <h2 className="font-maru mb-3 text-lg font-bold text-mint-text">
            5. 免責事項
          </h2>
          <p>
            本サービスの試算結果は概算であり、将来の運用成果を保証するものではありません。
            特定の金融商品の推奨や投資助言を行うものではありません。
            本サービスの利用により生じた損害について、当方は責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="font-maru mb-3 text-lg font-bold text-mint-text">
            6. お問い合わせ・改定
          </h2>
          <p>
            本ポリシーに関するお問い合わせは{" "}
            <a
              className="text-mint-text underline hover:no-underline"
              href="https://nexeed-lab.com/contact"
              target="_blank"
              rel="noopener noreferrer"
            >
              Nexeed Lab のお問い合わせ窓口
            </a>
            までお願いします。本ポリシーは必要に応じて改定することがあります。
          </p>
        </section>
      </div>

      <p className="mt-12 border-t border-line pt-6 text-[11px] text-ink-soft">
        最終更新日: 2026年7月30日
      </p>
    </article>
  );
}
