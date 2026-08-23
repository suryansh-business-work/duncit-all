import { apply } from "./e.mjs";

apply("website/partners-website/src/pages/index.astro", [
  [
    "import { partnerLanding } from '../config/landing';\nimport { urlConfigs } from '../config/url-configs';\nimport { fetchBranding } from '../lib/site-data';\n\nconst branding = await fetchBranding();",
    "import { partnerLanding } from '../config/landing';\nimport { urlConfigs } from '../config/url-configs';\nimport { getSiteTranslator } from '@duncit/brand/site-i18n';\nimport { fetchBranding } from '../lib/site-data';\n\nconst branding = await fetchBranding();\nconst landing = await partnerLanding();\nconst { t } = await getSiteTranslator(urlConfigs.graphqlUrl);",
  ],
  [
    '<Layout title="Duncit Partners — Host and venue growth">',
    "<Layout title={t('website.partners.brand.title')}>",
  ],
  [
    '        <img src={partnerLanding.heroImage} alt="Venue partners planning an event" class="w-full h-full object-cover" />',
    '        <img\n          src={landing.heroImage}\n          alt={t(\'website.partners.hero.imageAlt\')}\n          class="w-full h-full object-cover"\n        />',
  ],
  [
    '            <i class="fa-solid fa-handshake-angle"></i> For venues & hosts',
    "            <i class=\"fa-solid fa-handshake-angle\"></i> {t('website.partners.hero.badge')}",
  ],
  [
    "            Fill the room. Host the moment.\n          </h1>",
    "            {t('website.partners.hero.heading')}\n          </h1>",
  ],
  [
    "            A focused partner entry point for venues and hosts who want real groups, clean operations, and Duncit's trust layer behind every plan.\n          </p>",
    "            {t('website.partners.hero.text')}\n          </p>",
  ],
  [
    '              <i class="fa-solid fa-store"></i> Register your venue',
    "              <i class=\"fa-solid fa-store\"></i> {t('website.partners.hero.venueCta')}",
  ],
  [
    '              <i class="fa-solid fa-champagne-glasses"></i> Be a host',
    "              <i class=\"fa-solid fa-champagne-glasses\"></i> {t('website.partners.hero.hostCta')}",
  ],
  [
    '            <i class="fa-solid fa-bolt"></i> Launch partners',
    "            <i class=\"fa-solid fa-bolt\"></i> {t('website.partners.hero.cardBadge')}",
  ],
  [
    '            <img src={partnerLanding.proofImage} alt="Partners reviewing bookings" class="w-full h-72 sm:h-80 object-cover rounded-2xl sticker" />',
    '            <img\n              src={landing.proofImage}\n              alt={t(\'website.partners.hero.cardImageAlt\')}\n              class="w-full h-72 sm:h-80 object-cover rounded-2xl sticker"\n            />',
  ],
  ["              {partnerLanding.stats.map((stat) => (", "              {landing.stats.map((stat) => ("],
  [
    '            <i class="fa-solid fa-route"></i> One partner funnel',
    "            <i class=\"fa-solid fa-route\"></i> {t('website.partners.ways.eyebrow')}",
  ],
  [
    '          <h2 class="text-4xl sm:text-5xl text-ink">Two ways into the same growth engine.</h2>',
    "          <h2 class=\"text-4xl sm:text-5xl text-ink\">{t('website.partners.ways.heading')}</h2>",
  ],
  [
    "            Way of Earnings with Duncit: register your venue so Duncit can bring you party bookings, or become a host and earn by creating memorable gatherings.\n          </p>",
    "            {t('website.partners.ways.text')}\n          </p>",
  ],
  ["          {partnerLanding.pillars.map((pillar) => (", "          {landing.pillars.map((pillar) => ("],
]);
