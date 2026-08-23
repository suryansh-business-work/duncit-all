import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/status.ts", [
  [
    "      noIncidents: 'No incidents reported in the last 90 days.',",
    "      noIncidents: 'No incidents reported in the last 90 days.',\n      pastIncidents: 'Past incidents — last 90 days',\n      switchToLight: 'Switch to light mode',\n      switchToDark: 'Switch to dark mode',",
  ],
]);

apply("website/status-website/src/components/Header.tsx", [
  [
    "import type { StatusEnvironment } from '../types';",
    "import { useTranslation } from '../i18n';\nimport type { StatusEnvironment } from '../types';",
  ],
  [
    "}: Readonly<HeaderProps>) {\n  const toggleLabel = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';",
    "}: Readonly<HeaderProps>) {\n  const { t } = useTranslation();\n  const toggleLabel =\n    mode === 'dark' ? t('status.board.switchToLight') : t('status.board.switchToDark');",
  ],
  [
    "            <Typography variant=\"h4\" component=\"h1\">\n              {appName} Status\n            </Typography>\n            {environment === 'staging' && <Chip label=\"Staging\" color=\"warning\" size=\"small\" />}",
    "            <Typography variant=\"h4\" component=\"h1\">\n              {t('status.board.title', { vars: { app: appName } })}\n            </Typography>\n            {environment === 'staging' && (\n              <Chip label={t('status.board.staging')} color=\"warning\" size=\"small\" />\n            )}",
  ],
  [
    "          <Typography variant=\"body2\" color=\"text.secondary\">\n            Live availability of every {appName} console, the API and our websites.\n          </Typography>",
    "          <Typography variant=\"body2\" color=\"text.secondary\">\n            {t('status.board.subtitle', { vars: { app: appName } })}\n          </Typography>",
  ],
]);

apply("website/status-website/src/components/IncidentsSection.tsx", [
  [
    "        Past incidents — last 90 days\n      </Typography>",
    "        {t('status.board.pastIncidents')}\n      </Typography>",
  ],
  [
    "            <Typography variant=\"body2\">No incidents reported in the last 90 days.</Typography>",
    "            <Typography variant=\"body2\">{t('status.board.noIncidents')}</Typography>",
  ],
]);

apply("website/status-website/src/components/GlobalUptimeChart.tsx", [
  [
    "function buildData(global: GlobalDaily[], theme: Theme) {",
    "function buildData(global: GlobalDaily[], theme: Theme, label: string) {",
  ],
  ["        label: 'Overall uptime %',", "        label,"],
]);
