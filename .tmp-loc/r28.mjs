import { apply } from "./e.mjs";

apply("packages/shell/src/mountPortal.tsx", [
  [
    "  const routed = (\n    <>\n      <PortalModeGate portalKey={config.key} graphqlUrl={graphqlUrl} appName={config.name}>\n        {children}\n      </PortalModeGate>",
    "  const routed = (\n    <>\n      <LocalizedPortalModeGate portalKey={config.key} graphqlUrl={graphqlUrl} appName={config.name}>\n        {children}\n      </LocalizedPortalModeGate>",
  ],
]);
