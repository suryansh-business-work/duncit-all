import { apply } from "./e.mjs";
apply("website/ads-website/src/config/site-config.ts", [
  [
    "    HOME_BOTTOM: t('website.ads.preview.homeFeed'),\n  } as Record<string, string>,",
    "    HOME_BOTTOM: t('website.ads.preview.homeFeed'),\n    caption: t('website.ads.preview.caption'),\n  } as Record<string, string>,",
  ],
]);
