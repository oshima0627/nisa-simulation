/** 円を「1,234万円」形式の文字列にする（1万円未満は四捨五入） */
export function formatManYen(yen: number): string {
  return `${Math.round(yen / 10_000).toLocaleString("ja-JP")}万円`;
}

/** 円を「123,456円」形式の文字列にする */
export function formatYen(yen: number): string {
  return `${Math.round(yen).toLocaleString("ja-JP")}円`;
}

/**
 * 入力金額（積立額・取り崩し額など）の表示用。
 * 1万円で割り切れるなら「3万円」「10万円」、端数があれば「35,000円」と
 * 正確な金額のまま表示する（勝手に万円へ丸めない）。
 */
export function formatInputYen(yen: number): string {
  const rounded = Math.round(yen);
  // 1万円で割り切れるときだけ「◯万円」に短縮する（0円は「0万円」にせず円表記のまま）
  if (rounded !== 0 && rounded % 10_000 === 0) {
    return `${(rounded / 10_000).toLocaleString("ja-JP")}万円`;
  }
  // 端数がある場合は丸めずに円で出す。ユーザーが入力した金額なので改変しない
  return `${rounded.toLocaleString("ja-JP")}円`;
}

/** 通算月数を「◯年目の◯月」形式にする（1始まり） */
export function formatMonthOrdinal(totalMonth: number): string {
  // 切り上げで年数にする: 1〜12ヶ月目 → 1年目、13〜24ヶ月目 → 2年目
  const year = Math.ceil(totalMonth / 12);
  // 1始まりのまま12で割った余りを取る: 12ヶ月目 → 12、13ヶ月目 → 1
  const month = ((totalMonth - 1) % 12) + 1;
  return `${year}年目の${month}ヶ月目`;
}
