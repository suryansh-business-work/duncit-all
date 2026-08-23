import { apply } from "./e.mjs";

apply("packages/shell/src/mountPortal.tsx", [
  [
    "import { UserProvider, PortalModeGate, configureSessionSocket } from '@duncit/user-context';",
    "import {\n  UserProvider,\n  PortalModeGate,\n  configureSessionSocket,\n  type PortalModeGateProps,\n} from '@duncit/user-context';\nimport { useTranslation } from './i18n/useTranslation';",
  ],
  [
    "const identity = (node: ReactNode): ReactNode => node;",
    "const identity = (node: ReactNode): ReactNode => node;\n\n/**\n * The portal-mode gate with the console's live translator attached.\n *\n * @duncit/user-context sits BELOW @duncit/app-settings in the dependency graph\n * (the locale provider reads the signed-in user from it), so the gate takes `t`\n * as a prop rather than calling the hook itself. This is the one component that\n * can hand it one: it renders inside the provider stack below.\n */\nfunction LocalizedPortalModeGate(props: Readonly<Omit<PortalModeGateProps, 't'>>) {\n  const { t } = useTranslation();\n  return <PortalModeGate {...props} t={t} />;\n}",
  ],
]);
