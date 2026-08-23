import { apply } from "./e.mjs";
const RSQ = String.fromCharCode(8217);

apply("website/ads-website/src/pages/404.astro", [
  [
    "    <h1 class=\"mt-4 text-3xl text-ink\">This page wandered off.</h1>\n    <p class=\"mt-3 text-ink-soft\">The page you" + RSQ + "re looking for doesn" + RSQ + "t exist or has moved.</p>",
    "    <h1 class=\"mt-4 text-3xl text-ink\">{siteConfig.notFound.heading}</h1>\n    <p class=\"mt-3 text-ink-soft\">{siteConfig.notFound.text}</p>",
  ],
]);

apply("website/ads-website/src/components/SiteFooter.astro", [
  [
    "        <span>Advertising on the Duncit network.</span>",
    "        <span>{footer.note}</span>",
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
