import { apply } from "./e.mjs";

apply("packages/user-context/src/portal-mode/PortalModeGate.tsx", [
  [
    "import { MaintenanceScreen, UnderDevelopmentScreen } from './screens';",
    "import { MaintenanceScreen, UnderDevelopmentScreen } from './screens';\nimport type { SessionTranslate } from '../i18n';",
  ],
  [
    "  /** Poll interval in ms; defaults to 60s. */\n  pollMs?: number;",
    "  /** Poll interval in ms; defaults to 60s. */\n  pollMs?: number;\n  /** The mounting surface's translator; the shipped English when omitted. */\n  t?: SessionTranslate;",
  ],
  [
    "  appName,\n  pollMs = 60000,\n  children,\n}: Readonly<PortalModeGateProps>) {",
    "  appName,\n  pollMs = 60000,\n  t,\n  children,\n}: Readonly<PortalModeGateProps>) {",
  ],
  [
    "  if (mode === 'MAINTENANCE') return <MaintenanceScreen appName={appName} />;\n  if (mode === 'DEVELOPMENT') return <UnderDevelopmentScreen appName={appName} />;",
    "  if (mode === 'MAINTENANCE') return <MaintenanceScreen appName={appName} t={t} />;\n  if (mode === 'DEVELOPMENT') return <UnderDevelopmentScreen appName={appName} t={t} />;",
  ],
]);

// export the translator type + schema builder from the package entry
apply("packages/user-context/src/index.ts", [
  [
    "export { default as UserDataNotLoadedDialog } from './UserDataNotLoadedDialog';",
    "export { sessionT, SESSION_FALLBACK_FLAT, type SessionTranslate } from './i18n';\nexport { default as UserDataNotLoadedDialog } from './UserDataNotLoadedDialog';",
  ],
]);
