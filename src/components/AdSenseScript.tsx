import Script from "next/script";
import { ADSENSE_CLIENT, adsEnabled } from "@/lib/ads";

/**
 * AdSense ライブラリの読み込み。
 * afterInteractive にして、ページの表示速度（LCP）を邪魔しない位置で読み込む。
 */
export function AdSenseScript() {
  if (!adsEnabled) return null;

  return (
    <Script
      id="adsbygoogle-lib"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}
