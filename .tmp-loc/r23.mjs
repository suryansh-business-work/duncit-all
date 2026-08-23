import { apply } from "./e.mjs";

// ---------- OtherPortalsDialog.tsx
apply("packages/user-context/src/login-screen/OtherPortalsDialog.tsx", [
  [
    "import { PORTALS, PORTAL_CATEGORIES, resolvePortalUrl } from './portals';",
    "import { PORTALS, PORTAL_CATEGORIES, resolvePortalUrl } from './portals';\nimport { sessionT, type SessionTranslate } from '../i18n';",
  ],
  [
    "interface Props {\n  open: boolean;\n  onClose: () => void;\n}",
    "interface Props {\n  open: boolean;\n  onClose: () => void;\n  /** The mounting surface's translator; the shipped English when omitted. */\n  t?: SessionTranslate;\n}",
  ],
  [
    "export default function OtherPortalsDialog({ open, onClose }: Readonly<Props>) {\n  const [query, setQuery] = useState('');",
    "export default function OtherPortalsDialog({ open, onClose, t = sessionT }: Readonly<Props>) {\n  const [query, setQuery] = useState('');",
  ],
  [
    "          Other portals\n        </Typography>\n        <Typography variant=\"body2\" color=\"text.secondary\">\n          One Duncit account — jump to any console below.\n        </Typography>",
    "          {t('session.portals.title')}\n        </Typography>\n        <Typography variant=\"body2\" color=\"text.secondary\">\n          {t('session.portals.subtitle')}\n        </Typography>",
  ],
  ['          placeholder="Search portals…"', "          placeholder={t('session.portals.search')}"],
  [
    "            <Chip\n              key={cat}\n              label={cat}",
    "            <Chip\n              key={cat}\n              label={cat === 'All' ? t('session.portals.all') : cat}",
  ],
  [
    "              No portals match “{query}”.\n            </Typography>",
    "              {t('session.portals.noMatch', { vars: { query } })}\n            </Typography>",
  ],
]);

// ---------- portal-mode/screens.tsx
apply("packages/user-context/src/portal-mode/screens.tsx", [
  [
    "import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';",
    "import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';\nimport { sessionT, type SessionTranslate } from '../i18n';",
  ],
  [
    "interface ScreenProps {\n  /** Friendly app name shown in the heading. */\n  appName?: string;\n}",
    "interface ScreenProps {\n  /** Friendly app name shown in the heading. */\n  appName?: string;\n  /** The mounting surface's translator; the shipped English when omitted. */\n  t?: SessionTranslate;\n}",
  ],
  [
    "export function MaintenanceScreen({ appName }: Readonly<ScreenProps>) {\n  return (\n    <Shell\n      icon={<BuildCircleIcon sx={{ fontSize: 72 }} color=\"warning\" />}\n      title=\"We’ll be back soon\"\n      subtitle={`${appName ?? 'This service'} is temporarily down for maintenance. Please check back in a little while.`}\n    />\n  );\n}",
    "export function MaintenanceScreen({ appName, t = sessionT }: Readonly<ScreenProps>) {\n  const app = appName ?? t('session.portalMode.thisService');\n  return (\n    <Shell\n      icon={<BuildCircleIcon sx={{ fontSize: 72 }} color=\"warning\" />}\n      title={t('session.portalMode.maintenanceTitle')}\n      subtitle={t('session.portalMode.maintenanceBody', { vars: { app } })}\n    />\n  );\n}",
  ],
  [
    "export function UnderDevelopmentScreen({ appName }: Readonly<ScreenProps>) {\n  return (\n    <Shell\n      icon={<RocketLaunchIcon sx={{ fontSize: 72 }} color=\"info\" />}\n      title=\"Under development\"\n      subtitle={`${appName ?? 'This service'} is being built and isn’t available yet. It will go live soon.`}\n    />\n  );\n}",
    "export function UnderDevelopmentScreen({ appName, t = sessionT }: Readonly<ScreenProps>) {\n  const app = appName ?? t('session.portalMode.thisService');\n  return (\n    <Shell\n      icon={<RocketLaunchIcon sx={{ fontSize: 72 }} color=\"info\" />}\n      title={t('session.portalMode.developmentTitle')}\n      subtitle={t('session.portalMode.developmentBody', { vars: { app } })}\n    />\n  );\n}",
  ],
]);

// ---------- UserDataNotLoadedDialog.tsx
apply("packages/user-context/src/UserDataNotLoadedDialog.tsx", [
  [
    "import LogoutIcon from '@mui/icons-material/Logout';",
    "import LogoutIcon from '@mui/icons-material/Logout';\nimport { sessionT, type SessionTranslate } from './i18n';",
  ],
  [
    "  onReload: () => void;\n  onLogout: () => void;\n}",
    "  onReload: () => void;\n  onLogout: () => void;\n  /**\n   * A translator. `UserProvider` renders this dialog as a sibling of the locale\n   * provider (which reads the signed-in user's language from this very\n   * context), so there is no live one in scope there and the shipped English\n   * stands in — see `sessionT`.\n   */\n  t?: SessionTranslate;\n}",
  ],
  [
    "  errorMessage,\n  onReload,\n  onLogout,\n}: Readonly<UserDataNotLoadedDialogProps>) {",
    "  errorMessage,\n  onReload,\n  onLogout,\n  t = sessionT,\n}: Readonly<UserDataNotLoadedDialogProps>) {",
  ],
  [
    "      <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>User data not loaded</DialogTitle>",
    "      <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>{t('session.notLoaded.title')}</DialogTitle>",
  ],
  [
    "            Please reload the application so your latest account data can load correctly.\n          </Typography>",
    "            {t('session.notLoaded.body')}\n          </Typography>",
  ],
  [
    "            If reloading does not help, sign out — this clears any stale session and lets you log back in.\n          </Typography>",
    "            {t('session.notLoaded.signOutHint')}\n          </Typography>",
  ],
  [
    "          Logout\n        </Button>",
    "          {t('session.notLoaded.logout')}\n        </Button>",
  ],
  [
    "          Reload Application\n        </Button>",
    "          {t('session.notLoaded.reload')}\n        </Button>",
  ],
]);
