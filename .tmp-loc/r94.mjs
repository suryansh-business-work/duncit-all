import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/website.ts", [
  [
        "        homeFeed: 'Home feed',",
        "        homeFeed: 'Home feed',\n        caption: 'Tick a placement to see where it lands.',",
  ],
]);

apply("website/ads-website/src/components/Features.astro", [
  ["const { features } = siteConfig;", "const { features, featuresSection } = siteConfig;"],
  [
    "    <h2 class=\"text-3xl text-ink sm:text-4xl\">Everything you need to run ads</h2>\n    <p class=\"mt-4 text-ink-soft\">One console for the full campaign lifecycle.</p>",
    "    <h2 class=\"text-3xl text-ink sm:text-4xl\">{featuresSection.heading}</h2>\n    <p class=\"mt-4 text-ink-soft\">{featuresSection.text}</p>",
  ],
]);

apply("website/ads-website/src/components/Steps.astro", [
  ["const { steps } = siteConfig;", "const { steps, stepsSection } = siteConfig;"],
  [
    "      <p class=\"text-xs font-black uppercase tracking-[0.2em] text-primary\">How it works</p>\n      <h2 class=\"mt-2 text-3xl text-ink sm:text-4xl\">Four steps to live</h2>",
    "      <p class=\"text-xs font-black uppercase tracking-[0.2em] text-primary\">{stepsSection.eyebrow}</p>\n      <h2 class=\"mt-2 text-3xl text-ink sm:text-4xl\">{stepsSection.heading}</h2>",
  ],
]);

apply("website/ads-website/src/components/PlacementPreview.astro", [
  [
    " * placement is ticked, so choosing a placement and seeing where it lands are\n * the same action.\n */\n---",
    " * placement is ticked, so choosing a placement and seeing where it lands are\n * the same action.\n */\nimport { siteContent } from '../config/site-config';\n\nconst { preview } = await siteContent();\n---",
  ],
  ['<div class="zone h-11" data-zone="STATUS"><span>Stories</span></div>', '<div class="zone h-11" data-zone="STATUS"><span>{preview.STATUS}</span></div>'],
  ['<div class="zone h-16" data-zone="EXPLORE_SCROLL"><span>Explore scroll</span></div>', '<div class="zone h-16" data-zone="EXPLORE_SCROLL"><span>{preview.EXPLORE_SCROLL}</span></div>'],
  ['<div class="zone h-10" data-zone="POD_LIST"><span>Pod listings</span></div>', '<div class="zone h-10" data-zone="POD_LIST"><span>{preview.POD_LIST}</span></div>'],
  ['<div class="zone h-10" data-zone="VENUE_LIST"><span>Venue listings</span></div>', '<div class="zone h-10" data-zone="VENUE_LIST"><span>{preview.VENUE_LIST}</span></div>'],
  ['<div class="zone h-10" data-zone="CLUB_LIST"><span>Club listings</span></div>', '<div class="zone h-10" data-zone="CLUB_LIST"><span>{preview.CLUB_LIST}</span></div>'],
  ['<div class="zone flex-1" data-zone="POD_DETAILS"><span>Pod details</span></div>', '<div class="zone flex-1" data-zone="POD_DETAILS"><span>{preview.POD_DETAILS}</span></div>'],
  ['<div class="zone w-9 shrink-0" data-zone="SIDEBAR"><span class="vertical">Sidebar</span></div>', '<div class="zone w-9 shrink-0" data-zone="SIDEBAR"><span class="vertical">{preview.SIDEBAR}</span></div>'],
  ['<div class="zone h-12" data-zone="HOME_BOTTOM"><span>Home feed</span></div>', '<div class="zone h-12" data-zone="HOME_BOTTOM"><span>{preview.HOME_BOTTOM}</span></div>'],
  [
    "    Tick a placement to see where it lands.\n  </p>",
    "    {preview.caption}\n  </p>",
  ],
]);
