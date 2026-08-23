import { apply } from "./e.mjs";
apply("packages/brand/src/NewsletterSignup.astro", [
  [
    "import Captcha from '@duncit/captcha/Captcha.astro';",
    "import Captcha from '@duncit/captcha/Captcha.astro';\nimport { siteT, type SiteTranslate } from './site-i18n';",
  ],
  [
    "  /** Status copy. The site passes its own translations; these are the fallback. */\n  busyText?: string;\n  okText?: string;\n  errorText?: string;\n  class?: string;\n}",
    "  /** Status copy. The site passes its own translations; these are the fallback. */\n  busyText?: string;\n  okText?: string;\n  errorText?: string;\n  /** The site's build-time translator. Omit it and the shipped copy renders. */\n  t?: SiteTranslate;\n  class?: string;\n}",
  ],
  [
    "  heading = 'Get Duncit updates',\n  text = '',\n  placeholder = 'you@example.com',\n  button = 'Subscribe',\n  variant = 'card',\n  consent = null,\n  consentLinkLabel = 'privacy policy',\n  consentLinkHref = '',\n  captcha = undefined,\n  busyText = 'Subscribing…',\n  okText = 'You are on the list.',\n  errorText = 'That did not go through — check your connection and try again.',\n  class: className = '',\n} = Astro.props;",
    "  heading,\n  text = '',\n  placeholder,\n  button,\n  variant = 'card',\n  consent = null,\n  consentLinkLabel,\n  consentLinkHref = '',\n  captcha = undefined,\n  busyText,\n  okText,\n  errorText,\n  t = siteT,\n  class: className = '',\n} = Astro.props;\n\nconst headingText = heading ?? t('website.footer.newsletterTitle');\nconst placeholderText = placeholder ?? t('website.brand.newsletter.placeholder');\nconst buttonText = button ?? t('website.brand.newsletter.button');\nconst consentLinkText = consentLinkLabel ?? t('website.brand.newsletter.consentLink');\nconst busy = busyText ?? t('website.brand.newsletter.busy');\nconst ok = okText ?? t('website.brand.newsletter.ok');\nconst error = errorText ?? t('website.brand.newsletter.error');",
  ],
  [
    "  data-busy={busyText}\n  data-ok={okText}\n  data-error={errorText}\n>\n  <h3 class=\"newsletter-heading\">{heading}</h3>",
    "  data-busy={busy}\n  data-ok={ok}\n  data-error={error}\n>\n  <h3 class=\"newsletter-heading\">{headingText}</h3>",
  ],
  [
    "    <label class=\"newsletter-sr\" for={id}>Email address</label>",
    "    <label class=\"newsletter-sr\" for={id}>{t('website.footer.emailPlaceholder')}</label>",
  ],
  ["      placeholder={placeholder}", "      placeholder={placeholderText}"],
  ['<button type="submit" class="newsletter-button">{button}</button>', '<button type="submit" class="newsletter-button">{buttonText}</button>'],
  ["              {consentLinkLabel}", "              {consentLinkText}"],
]);
