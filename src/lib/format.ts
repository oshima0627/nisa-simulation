/** 円を「1,234万円」形式の文字列にする（1万円未満は四捨五入） */
export function formatManYen(yen: number): string {
  return `${Math.round(yen / 10_000).toLocaleString("ja-JP")}万円`;
}

/** 円を「123,456円」形式の文字列にする */
export function formatYen(yen: number): string {
  return `${Math.round(yen).toLocaleString("ja-JP")}円`;
}

/** 通算月数を「◯年目の◯月」形式にする（1始まり） */
export function formatMonthOrdinal(totalMonth: number): string {
  const year = Math.ceil(totalMonth / 12);
  const month = ((totalMonth - 1) % 12) + 1;
  return `${year}年目の${month}ヶ月目`;
}
