import { apply } from "./e.mjs";
apply("website/ads-website/src/config/site-config.ts", [
  [
    "  footer: {\n    tagline: t('website.ads.footer.tagline'),\n    note: t('website.ads.footer.note'),",
    "  footer: {\n    tagline: t('website.ads.footer.tagline'),\n    note: t('website.ads.footer.note'),\n    /** The copyright line. The year is a build-time value, like every other\n     *  date on a static page. */\n    rights: t('website.ads.footer.rights', { vars: { year: new Date().getFullYear() } }),",
  ],
]);
apply("website/ads-website/src/components/SiteFooter.astro", [
  ["      <span>{footer.rights.replace('{year}', String(year))}</span>", "      <span>{footer.rights}</span>"],
]);
