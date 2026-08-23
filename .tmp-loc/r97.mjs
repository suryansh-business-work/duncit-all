import { apply } from "./e.mjs";
apply("website/ads-website/src/components/SiteHeader.astro", [
  [
    '      <span class="hidden sm:inline">Duncit <span class="text-primary">Ads</span></span>',
    '      <span class="hidden sm:inline">\n        {siteConfig.footer.duncit} <span class="text-primary">{siteConfig.header.wordmarkAds}</span>\n      </span>',
  ],
  ['        aria-label="Switch between light and dark"', "        aria-label={siteConfig.header.themeToggle}"],
]);
apply("website/ads-website/src/components/Placements.astro", [
  [
    '    <caption class="sr-only">Duncit advertising rate card, per placement per day</caption>',
    "    <caption class=\"sr-only\">{placements.rateCardCaption}</caption>",
  ],
]);
