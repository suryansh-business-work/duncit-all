import { apply } from "./e.mjs";

// ---- SiteHeader
apply("website/partners-website/src/components/SiteHeader.astro", [
  [
    "import { urlConfigs } from '../config/url-configs';\n\nconst branding = await fetchBranding();",
    "import { urlConfigs } from '../config/url-configs';\nimport { getSiteTranslator } from '@duncit/brand/site-i18n';\n\nconst branding = await fetchBranding();\nconst { t } = await getSiteTranslator(urlConfigs.graphqlUrl);",
  ],
  [
    "const links = [\n  { label: 'How it works', href: '#ways' },\n  { label: 'List your venue', href: `${urlConfigs.partnersAppUrl}/register-venue` },\n  { label: 'Become a host', href: `${urlConfigs.partnersAppUrl}/become-host` },\n  { label: 'Get the app', href: '#download' },\n];\nconst login = { label: 'Partner login', href: urlConfigs.partnersAppUrl };\nconst join = { label: 'Become a partner', href: `${urlConfigs.partnersAppUrl}/register-venue` };",
    "const links = [\n  { label: t('website.partners.nav.how'), href: '#ways' },\n  { label: t('website.partners.nav.listVenue'), href: `${urlConfigs.partnersAppUrl}/register-venue` },\n  { label: t('website.partners.nav.becomeHost'), href: `${urlConfigs.partnersAppUrl}/become-host` },\n  { label: t('website.partners.nav.getApp'), href: '#download' },\n];\nconst login = { label: t('website.partners.nav.login'), href: urlConfigs.partnersAppUrl };\nconst join = {\n  label: t('website.partners.nav.join'),\n  href: `${urlConfigs.partnersAppUrl}/register-venue`,\n};",
  ],
  [
    "    <a href={urlConfigs.mainSiteUrl} class=\"partner-brand\" aria-label=\"Duncit\">",
    "    <a href={urlConfigs.mainSiteUrl} class=\"partner-brand\" aria-label={t('website.partners.nav.brandAria')}>",
  ],
  [
    '      <span class="partner-brand-word">Partners</span>',
    "      <span class=\"partner-brand-word\">{t('website.partners.brand.word')}</span>",
  ],
  [
    "      <SiteMenu links={links} actions={[join, login]} onDark />",
    "      <SiteMenu links={links} actions={[join, login]} onDark t={t} />",
  ],
]);

// ---- DownloadApps
apply("website/partners-website/src/components/DownloadApps.astro", [
  [
    "import { fetchBranding } from '../lib/site-data';\n\nconst branding = await fetchBranding();\nconst stores = [\n  { icon: 'fa-google-play', eyebrow: 'Get it on', name: 'Google Play', url: branding.android_app_url },\n  { icon: 'fa-apple', eyebrow: 'Download on the', name: 'App Store', url: branding.ios_app_url },\n];\n---\n\n<AppDownload\n  heading=\"Your partners,\"\n  headingAccent=\"in their pocket\"\n  text=\"Members book your venue and join your pods from the Duncit app on Android and iOS.\"\n  perks={['Real bookings', 'Clean operations', 'Duncit\'s trust layer']}\n  stores={stores}\n/>",
    "import { fetchBranding } from '../lib/site-data';\nimport { getSiteTranslator } from '@duncit/brand/site-i18n';\nimport { urlConfigs } from '../config/url-configs';\n\nconst branding = await fetchBranding();\nconst { t } = await getSiteTranslator(urlConfigs.graphqlUrl);\nconst stores = [\n  {\n    icon: 'fa-google-play',\n    eyebrow: t('website.partners.download.googlePlayEyebrow'),\n    name: t('website.partners.download.googlePlayName'),\n    url: branding.android_app_url,\n  },\n  {\n    icon: 'fa-apple',\n    eyebrow: t('website.partners.download.appStoreEyebrow'),\n    name: t('website.partners.download.appStoreName'),\n    url: branding.ios_app_url,\n  },\n];\nconst perks = [\n  t('website.partners.download.perkBookings'),\n  t('website.partners.download.perkOps'),\n  t('website.partners.download.perkTrust'),\n];\n---\n\n<AppDownload\n  heading={t('website.partners.download.heading')}\n  headingAccent={t('website.partners.download.headingAccent')}\n  text={t('website.partners.download.text')}\n  perks={perks}\n  stores={stores}\n/>",
  ],
]);

// ---- Layout
apply("website/partners-website/src/layouts/Layout.astro", [
  [
    "import { fetchBranding } from '../lib/site-data';\nimport '../styles/global.css';\n\nconst {\n  title,\n  description = 'Duncit Partners helps hosts and venues create real social moments.',\n} = Astro.props;\n\nconst branding = await fetchBranding();",
    "import { fetchBranding } from '../lib/site-data';\nimport { getSiteTranslator } from '@duncit/brand/site-i18n';\nimport { urlConfigs } from '../config/url-configs';\nimport '../styles/global.css';\n\nconst { t } = await getSiteTranslator(urlConfigs.graphqlUrl);\nconst { title, description = t('website.partners.brand.description') } = Astro.props;\n\nconst branding = await fetchBranding();",
  ],
]);
