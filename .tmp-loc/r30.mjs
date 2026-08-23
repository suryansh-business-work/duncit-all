import { apply } from "./e.mjs";

apply("app/mweb/src/main.tsx", [
  [
    "import {\n  UserProvider,\n  PortalModeGate,\n  buildSessionMeQuery,\n  configureSessionSocket,\n} from '@duncit/user-context';",
    "import {\n  UserProvider,\n  PortalModeGate,\n  buildSessionMeQuery,\n  configureSessionSocket,\n  type PortalModeGateProps,\n} from '@duncit/user-context';\nimport { useTranslation } from './i18n/useTranslation';",
  ],
  [
    "function mount() {",
    "/**\n * The portal-mode gate with mWeb's live translator attached.\n *\n * @duncit/user-context sits BELOW @duncit/app-settings in the dependency graph\n * (the locale provider reads the signed-in user from it), so the gate takes `t`\n * as a prop rather than calling the hook itself. Hoisted to module scope so it\n * is not redefined on every render (S6478).\n */\nfunction LocalizedPortalModeGate(props: Readonly<Omit<PortalModeGateProps, 't'>>) {\n  const { t } = useTranslation();\n  return <PortalModeGate {...props} t={t} />;\n}\n\nfunction mount() {",
  ],
  [
    "                      <PortalModeGate portalKey=\"mweb\" graphqlUrl={urlConfigs.graphqlUrl} appName=\"Duncit\"><App /></PortalModeGate>",
    "                      <LocalizedPortalModeGate portalKey=\"mweb\" graphqlUrl={urlConfigs.graphqlUrl} appName=\"Duncit\"><App /></LocalizedPortalModeGate>",
  ],
]);
