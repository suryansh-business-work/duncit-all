import { apply } from "./e.mjs";

apply("website/partners-website/src/layouts/Layout.astro", [
  [
    "import { fetchBranding } from '../lib/site-data';\nimport '../styles/global.css';\n\nconst {\n  title,\n  description = 'Duncit Partners helps hosts and venues create real social moments.',\n} = Astro.props;\n\nconst branding = await fetchBranding();",
    "import { fetchBranding } from '../lib/site-data';\nimport { getSiteTranslator } from '@duncit/brand/site-i18n';\nimport { urlConfigs } from '../config/url-configs';\nimport '../styles/global.css';\n\nconst { t } = await getSiteTranslator(urlConfigs.graphqlUrl);\nconst { title, description = t('website.partners.brand.description') } = Astro.props;\n\nconst branding = await fetchBranding();",
  ],
]);

apply("website/partners-website/src/components/SiteFooter.astro", [
  [
    "import SharedNewsletter from '@duncit/brand/NewsletterSignup.astro';",
    "import SharedNewsletter from '@duncit/brand/NewsletterSignup.astro';\nimport { getSiteTranslator } from '@duncit/brand/site-i18n';\n\nconst { t } = await getSiteTranslator(urlConfigs.graphqlUrl);",
  ],
  [
    "const FALLBACK_GROUPS: SiteNavGroup[] = [\n  {\n    label: 'Duncit',\n    links: [\n      { id: 'f-main', area: 'FOOTER', group_label: 'Duncit', label: 'duncit.com', url: urlConfigs.mainSiteUrl, sort_order: 0 },\n      { id: 'f-support', area: 'FOOTER', group_label: 'Duncit', label: 'Support', url: `${urlConfigs.mainSiteUrl}/help`, sort_order: 1 },\n    ],\n  },\n];",
    "const FALLBACK_GROUPS: SiteNavGroup[] = [\n  {\n    label: t('website.partners.footer.duncitGroup'),\n    links: [\n      {\n        id: 'f-main',\n        area: 'FOOTER',\n        group_label: t('website.partners.footer.duncitGroup'),\n        label: t('website.partners.footer.mainSite'),\n        url: urlConfigs.mainSiteUrl,\n        sort_order: 0,\n      },\n      {\n        id: 'f-support',\n        area: 'FOOTER',\n        group_label: t('website.partners.footer.duncitGroup'),\n        label: t('website.partners.footer.support'),\n        url: `${urlConfigs.mainSiteUrl}/help`,\n        sort_order: 1,\n      },\n    ],\n  },\n];",
  ],
  [
    "      <p class=\"mt-2 font-head text-xl font-black leading-none text-ink\">Duncit Partners</p>\n      <p class=\"mt-3 text-sm text-ink-soft max-w-xs\">\n        Real bookings for venues and hosts, backed by Duncit's trust layer.\n      </p>",
    "      <p class=\"mt-2 font-head text-xl font-black leading-none text-ink\">\n        {t('website.partners.brand.footerName')}\n      </p>\n      <p class=\"mt-3 text-sm text-ink-soft max-w-xs\">{t('website.partners.footer.blurb')}</p>",
  ],
  [
    "      <SocialLinks class=\"mt-5\" />",
    "      <SocialLinks class=\"mt-5\" />",
  ],
  [
    "      source=\"PARTNERS_WEBSITE_FOOTER\"\n      heading=\"Partner updates\"\n      text=\"New venue tools, payout changes and what is working for hosts.\"\n    />",
    "      source=\"PARTNERS_WEBSITE_FOOTER\"\n      heading={t('website.partners.footer.newsletterHeading')}\n      text={t('website.partners.footer.newsletterText')}\n      t={t}\n    />",
  ],
  [
    "    heading=\"Policy Hub\"\n    class=\"max-w-6xl mx-auto mt-10\"\n  />",
    "    heading={t('website.partners.footer.policyHub')}\n    t={t}\n    class=\"max-w-6xl mx-auto mt-10\"\n  />",
  ],
  [
    "    © {year} Duncit. All rights reserved.\n  </div>",
    "    {t('website.partners.footer.rights', { vars: { year } })}\n  </div>",
  ],
]);
