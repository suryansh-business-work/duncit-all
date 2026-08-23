import { apply } from "./e.mjs";

// The portal login page already holds the live translator — hand it to the
// shared screen so its own chrome follows the reader too.
apply("packages/shell/src/portal-login/PortalLoginPage.tsx", [
  [
    "    <LoginScreen\n      config={config}\n      mode={mode}",
    "    <LoginScreen\n      config={config}\n      t={t}\n      mode={mode}",
  ],
]);
