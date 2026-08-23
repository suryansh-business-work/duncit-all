import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/website.ts", [
  [
    "        caption: 'Tick a placement to see where it lands.',",
    "        caption: 'Tick a placement to see where it lands.',",
  ],
  [
    "      header: {\n        wordmarkAds: 'Ads',",
    "      /** The shared app-download band, in this site's words. */\n      download: {\n        heading: 'Your audience',\n        headingAccent: 'lives in the app',\n        text: 'Every placement you book runs here — the feed people open when they are deciding what to do.',\n        perkPlacements: 'Nine placements',\n        perkSpeed: 'Live within a day',\n        perkMetrics: 'Impressions and clicks',\n        googlePlayEyebrow: 'Get it on',\n        googlePlayName: 'Google Play',\n        appStoreEyebrow: 'Download on the',\n        appStoreName: 'App Store',\n      },\n      header: {\n        wordmarkAds: 'Ads',",
  ],
]);

apply("website/ads-website/src/config/site-config.ts", [
  [
    "  header: {\n    wordmarkAds: t('website.ads.header.wordmarkAds'),",
    "  download: {\n    heading: t('website.ads.download.heading'),\n    headingAccent: t('website.ads.download.headingAccent'),\n    text: t('website.ads.download.text'),\n    perks: [\n      t('website.ads.download.perkPlacements'),\n      t('website.ads.download.perkSpeed'),\n      t('website.ads.download.perkMetrics'),\n    ],\n    googlePlayEyebrow: t('website.ads.download.googlePlayEyebrow'),\n    googlePlayName: t('website.ads.download.googlePlayName'),\n    appStoreEyebrow: t('website.ads.download.appStoreEyebrow'),\n    appStoreName: t('website.ads.download.appStoreName'),\n  },\n  header: {\n    wordmarkAds: t('website.ads.header.wordmarkAds'),",
  ],
]);

apply("website/ads-website/src/components/DownloadApps.astro", [
  [
    "import { fetchBranding } from '../lib/site-data';\n\nconst branding = await fetchBranding();\nconst stores = [\n  { icon: 'fa-google-play', eyebrow: 'Get it on', name: 'Google Play', url: branding.android_app_url },\n  { icon: 'fa-apple', eyebrow: 'Download on the', name: 'App Store', url: branding.ios_app_url },\n];\n---\n\n<AppDownload\n  heading=\"Your audience\"\n  headingAccent=\"lives in the app\"\n  text=\"Every placement you book runs here — the feed people open when they are deciding what to do.\"\n  perks={['Nine placements', 'Live within a day', 'Impressions and clicks']}\n  stores={stores}\n/>",
    "import { fetchBranding } from '../lib/site-data';\nimport { siteContent } from '../config/site-config';\n\nconst branding = await fetchBranding();\nconst { download } = await siteContent();\nconst stores = [\n  {\n    icon: 'fa-google-play',\n    eyebrow: download.googlePlayEyebrow,\n    name: download.googlePlayName,\n    url: branding.android_app_url,\n  },\n  {\n    icon: 'fa-apple',\n    eyebrow: download.appStoreEyebrow,\n    name: download.appStoreName,\n    url: branding.ios_app_url,\n  },\n];\n---\n\n<AppDownload\n  heading={download.heading}\n  headingAccent={download.headingAccent}\n  text={download.text}\n  perks={download.perks}\n  stores={stores}\n/>",
  ],
]);
