/**
 * Google AdSense 設定。
 *
 * 広告ユニット（スロット）ID が未設定のあいだ、広告枠は一切描画されない。
 * 親ドメイン nexeed-lab.com の審査が通ってから AdSense 管理画面で広告ユニットを
 * 作成し、`NEXT_PUBLIC_ADSENSE_SLOT_CONTENT` に そのIDを設定する。
 *
 * 自動広告（Auto ads）は使わない。設定がドメイン単位のため、ONにすると
 * コーポレートサイト（nexeed-lab.com）にも広告が挿入されてしまう。
 */
export const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-4718076434751586";

export const ADSENSE_SLOTS = {
  /** 解説記事の下・試算結果の下に置く汎用ディスプレイ枠 */
  content: process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT ?? "",
} as const;

/** クライアントIDが設定されているときだけ広告を有効化する */
export const adsEnabled = ADSENSE_CLIENT.length > 0;
