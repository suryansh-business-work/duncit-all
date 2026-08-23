import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/website.ts", [
  [
    "        tagline: 'Advertising for the Duncit network.',",
    "        tagline: 'Advertising for the Duncit network.',\n        rights: '© {year} Duncit. All rights reserved.',",
  ],
]);

apply("website/ads-website/src/components/SiteFooter.astro", [
  [
    "      <span>© {year} Duncit. All rights reserved.</span>\n      <span>Advertising on the Duncit network.</span>",
    "      <span>{footer.rights.replace('{year}', String(year))}</span>\n      <span>{footer.note}</span>",
  ],
]);

apply("website/ads-website/src/components/SiteHeader.astro", [
  [
    "        <span class=\"hidden sm:inline\">Duncit <span class=\"text-primary\">Ads</span></span>",
    "        <span class=\"hidden sm:inline\">{siteConfig.footer.duncit} <span class=\"text-primary\">{siteConfig.header.wordmarkAds}</span></span>",
  ],
  [
    '        aria-label="Switch between light and dark"',
    "        aria-label={siteConfig.header.themeToggle}",
  ],
]);

apply("website/ads-website/src/components/Placements.astro", [
  [
    "    <caption class=\"sr-only\">Duncit advertising rate card, per placement per day</caption>",
    "    <caption class=\"sr-only\">{placements.rateCardCaption}</caption>",
  ],
]);
