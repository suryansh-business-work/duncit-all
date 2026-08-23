import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/website.ts", [
  [
    "    nav: {\n      closeMenu: 'Close menu',\n      theme: 'Switch between light and dark',\n    },",
    "    nav: {\n      closeMenu: 'Close menu',\n      theme: 'Switch between light and dark',\n      menu: 'Menu',\n    },\n\n    /**\n     * The shared Astro chrome in @duncit/brand, rendered by all four sites.\n     *\n     * Account names in the social row are NOT here: Instagram and LinkedIn are\n     * proper nouns, and a translator has nothing to do with them.\n     */\n    brand: {\n      /**\n       * The illustrated phone on the marketing heroes.\n       *\n       * It draws the app's own layout rather than a screenshot, so the sample\n       * pod and the sample chat are copy a visitor reads — in a Hindi build\n       * they should be Hindi, like everything around them.\n       */\n      appPhone: {\n        alt: 'The Duncit app',\n        tonight: 'Tonight',\n        nearYou: '3 pods near you',\n        podTitle: 'Sunset football, 6pm',\n        podMeta: 'Turf 9 · 4 spots left',\n        join: 'Join',\n        chatOne: 'Weekend crew',\n        chatOneMessage: 'See you at 6! 🔥',\n        chatTwo: 'Board game night',\n        chatTwoMessage: 'Anyone bringing snacks?',\n      },\n      newsletter: {\n        placeholder: 'you@example.com',\n        button: 'Subscribe',\n        consentLink: 'privacy policy',\n        busy: 'Subscribing…',\n        ok: 'You are on the list.',\n        error: 'That did not go through — check your connection and try again.',\n      },\n      policyStrip: {\n        heading: 'Policies',\n      },\n    },",
  ],
]);

apply("packages/brand/src/AppPhone.astro", [
  [
    "interface Props {\n  src?: string | null;\n  alt?: string;\n}\nconst { src = null, alt = 'The Duncit app' } = Astro.props;",
    "import { siteT, type SiteTranslate } from './site-i18n';\n\ninterface Props {\n  src?: string | null;\n  alt?: string;\n  /** The site's build-time translator. Omit it and the shipped copy renders. */\n  t?: SiteTranslate;\n}\nconst { src = null, alt, t = siteT } = Astro.props;\nconst altText = alt ?? t('website.brand.appPhone.alt');",
  ],
  ["<img class=\"app-phone-shot\" src={src} alt={alt} loading=\"lazy\" />", "<img class=\"app-phone-shot\" src={src} alt={altText} loading=\"lazy\" />"],
  ['<p class="app-phone-title">Tonight</p>', "<p class=\"app-phone-title\">{t('website.brand.appPhone.tonight')}</p>"],
  ['<p class="app-phone-sub">3 pods near you</p>', "<p class=\"app-phone-sub\">{t('website.brand.appPhone.nearYou')}</p>"],
  ['<p class="app-phone-card-title">Sunset football, 6pm</p>', "<p class=\"app-phone-card-title\">{t('website.brand.appPhone.podTitle')}</p>"],
  ['<p class="app-phone-sub">Turf 9 · 4 spots left</p>', "<p class=\"app-phone-sub\">{t('website.brand.appPhone.podMeta')}</p>"],
  ['<span class="app-phone-join">Join</span>', "<span class=\"app-phone-join\">{t('website.brand.appPhone.join')}</span>"],
  ['<p class="app-phone-row-title">Weekend crew</p>', "<p class=\"app-phone-row-title\">{t('website.brand.appPhone.chatOne')}</p>"],
  ['<p class="app-phone-sub">See you at 6! 🔥</p>', "<p class=\"app-phone-sub\">{t('website.brand.appPhone.chatOneMessage')}</p>"],
  ['<p class="app-phone-row-title">Board game night</p>', "<p class=\"app-phone-row-title\">{t('website.brand.appPhone.chatTwo')}</p>"],
  ['<p class="app-phone-sub">Anyone bringing snacks?</p>', "<p class=\"app-phone-sub\">{t('website.brand.appPhone.chatTwoMessage')}</p>"],
]);

apply("packages/brand/src/PolicyStrip.astro", [
  [
    "interface Props {\n  policies: Policy[];\n  /** Where policy pages live. Empty on the main site, its origin elsewhere. */\n  baseUrl?: string;\n  heading?: string;\n  allLabel?: string;\n  class?: string;\n}\n\nconst {\n  policies = [],\n  baseUrl = '',\n  heading = 'Policies',\n  allLabel = 'All policies',\n  class: className = '',\n} = Astro.props;",
    "import { siteT, type SiteTranslate } from './site-i18n';\n\ninterface Props {\n  policies: Policy[];\n  /** Where policy pages live. Empty on the main site, its origin elsewhere. */\n  baseUrl?: string;\n  heading?: string;\n  allLabel?: string;\n  /** The site's build-time translator. Omit it and the shipped copy renders. */\n  t?: SiteTranslate;\n  class?: string;\n}\n\nconst {\n  policies = [],\n  baseUrl = '',\n  heading,\n  allLabel,\n  t = siteT,\n  class: className = '',\n} = Astro.props;\nconst headingText = heading ?? t('website.brand.policyStrip.heading');\nconst allText = allLabel ?? t('website.footer.allPolicies');",
  ],
  ['<h3 class="policy-strip-heading">{heading}</h3>', '<h3 class="policy-strip-heading">{headingText}</h3>'],
  ["            {allLabel}", "            {allText}"],
]);

apply("packages/brand/src/SiteMenu.astro", [
  [
    "  label?: string;\n  /** Match the header's own text colour when it sits over a banner. */\n  onDark?: boolean;\n  class?: string;\n}\n\nconst { links, actions = [], label = 'Menu', onDark = false, class: className = '' } = Astro.props;",
    "  label?: string;\n  /** Match the header's own text colour when it sits over a banner. */\n  onDark?: boolean;\n  /** The site's build-time translator. Omit it and the shipped copy renders. */\n  t?: SiteTranslate;\n  class?: string;\n}\n\nconst {\n  links,\n  actions = [],\n  label,\n  onDark = false,\n  t = siteT,\n  class: className = '',\n} = Astro.props;\nconst menuLabel = label ?? t('website.nav.menu');",
  ],
  [
    "interface Link {\n  label: string;\n  href: string;\n}",
    "import { siteT, type SiteTranslate } from './site-i18n';\n\ninterface Link {\n  label: string;\n  href: string;\n}",
  ],
  ["  aria-label={label}\n  aria-expanded=\"false\"", "  aria-label={menuLabel}\n  aria-expanded=\"false\""],
  ['aria-hidden="true" aria-label={label}>', 'aria-hidden="true" aria-label={menuLabel}>'],
  ['<span class="site-menu-title">{label}</span>', '<span class="site-menu-title">{menuLabel}</span>'],
  ['data-site-menu-close aria-label="Close menu">', "data-site-menu-close aria-label={t('website.nav.closeMenu')}>"],
]);
