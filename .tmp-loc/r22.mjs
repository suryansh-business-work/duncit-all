import { apply } from "./e.mjs";

// ---------- LoginScreen.tsx
apply("packages/user-context/src/login-screen/LoginScreen.tsx", [
  [
    "import type { LoginScreenProps } from './login.types';",
    "import { sessionT } from '../i18n';\nimport type { LoginScreenProps } from './login.types';",
  ],
  [
    "  altSlot,\n  footerSlot,\n}: Readonly<LoginScreenProps>) {\n  const [snack, setSnack] = useState<string | null>(null);",
    "  altSlot,\n  footerSlot,\n  t = sessionT,\n}: Readonly<LoginScreenProps>) {\n  const [snack, setSnack] = useState<string | null>(null);",
  ],
  [
    "      <Tooltip title={dark ? 'Switch to light' : 'Switch to dark'}>",
    "      <Tooltip title={dark ? t('session.login.switchToLight') : t('session.login.switchToDark')}>",
  ],
  ['          aria-label="toggle color mode"', "          aria-label={t('session.login.toggleColorMode')}"],
  [
    "                Log in\n              </Typography>",
    "                {t('session.login.heading')}\n              </Typography>",
  ],
  [
    "              <LoginForm\n                loading={loading}\n                onSubmit={onSubmit}\n                onForgotPassword={() => setSnack('Contact your administrator to reset your password.')}\n              />",
    "              <LoginForm\n                loading={loading}\n                onSubmit={onSubmit}\n                t={t}\n                onForgotPassword={() => setSnack(t('session.login.forgotPasswordHint'))}\n              />",
  ],
  [
    "                  Privacy Policy\n                </Link>",
    "                  {t('session.login.privacyPolicy')}\n                </Link>",
  ],
  [
    "                  Terms of Use\n                </Link>",
    "                  {t('session.login.termsOfUse')}\n                </Link>",
  ],
  [
    "                  Other portals\n                </Link>",
    "                  {t('session.login.otherPortals')}\n                </Link>",
  ],
  [
    "                Trouble signing in? Email{' '}\n                <Link href={`mailto:${contact}`} underline=\"none\" color=\"primary\" fontWeight={700}>\n                  {contact}\n                </Link>{' '}\n                and our team will help you get back in.",
    "                {t('session.login.supportPrefix')}{' '}\n                <Link href={`mailto:${contact}`} underline=\"none\" color=\"primary\" fontWeight={700}>\n                  {contact}\n                </Link>{' '}\n                {t('session.login.supportSuffix')}",
  ],
  [
    "          <Box sx={{ display: { xs: 'none', md: 'block' }, width: 320, flexShrink: 0 }}>\n            <PromoCard title={config.promoTitle} text={config.promoText} brandName={config.brandName} />",
    "          <Box sx={{ display: { xs: 'none', md: 'block' }, width: 320, flexShrink: 0 }}>\n            <PromoCard\n              title={config.promoTitle}\n              text={config.promoText}\n              brandName={config.brandName}\n              t={t}\n            />",
  ],
  [
    "      <OtherPortalsDialog open={portalsOpen} onClose={() => setPortalsOpen(false)} />",
    "      <OtherPortalsDialog open={portalsOpen} onClose={() => setPortalsOpen(false)} t={t} />",
  ],
]);

// ---------- login.types.tsx
apply("packages/user-context/src/login-screen/login.types.tsx", [
  [
    "import type { PaletteMode } from '@mui/material';",
    "import type { PaletteMode } from '@mui/material';\nimport type { SessionTranslate } from '../i18n';",
  ],
  [
    "  /** Optional extra content rendered below the form (e.g. Google sign-in). */\n  footerSlot?: ReactNode;",
    "  /** Optional extra content rendered below the form (e.g. Google sign-in). */\n  footerSlot?: ReactNode;\n  /**\n   * The mounting surface's translator. `@duncit/shell` passes the live one, so\n   * the screen follows the reader's language; the shipped English stands in\n   * when a caller has none (rule 38).\n   */\n  t?: SessionTranslate;",
  ],
]);

// ---------- PromoCard.tsx
apply("packages/user-context/src/login-screen/PromoCard.tsx", [
  [
    "import { glass, inkCta } from './glass';",
    "import { glass, inkCta } from './glass';\nimport { sessionT, type SessionTranslate } from '../i18n';",
  ],
  [
    "interface Props {\n  title: string;\n  text: string;\n  brandName: string;\n}",
    "interface Props {\n  title: string;\n  text: string;\n  brandName: string;\n  /** The mounting surface's translator; the shipped English when omitted. */\n  t?: SessionTranslate;\n}",
  ],
  [
    "export default function PromoCard({ title, text, brandName }: Readonly<Props>) {",
    "export default function PromoCard({ title, text, brandName, t = sessionT }: Readonly<Props>) {",
  ],
  [
    "          By {brandName}\n        </Typography>",
    "          {t('session.promo.by', { vars: { brand: brandName } })}\n        </Typography>",
  ],
  [
    "          Explore\n        </Button>",
    "          {t('session.promo.explore')}\n        </Button>",
  ],
]);
