import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/status.ts", [
  [
    "      latencyMs: 'Latency (ms)',",
    "      latencyMs: 'Latency (ms)',\n      historyUnavailable: 'History is unavailable right now.',\n      noHistory: 'No history recorded yet — checks run every 5 minutes.',\n      dailyUptime: 'Daily uptime — last 90 days',\n      latency24h: 'Latency — last 24 hours',\n      noLatency: 'No latency samples in the last 24 hours.',\n      uptimeTooltip: 'Uptime {value}',",
  ],
]);

apply("website/status-website/src/components/service-details-dialog/ServiceDetailsDialog.tsx", [
  [
    "import { useServiceDetails } from './useServiceDetails';",
    "import { useTranslation } from '../../i18n';\nimport { useServiceDetails } from './useServiceDetails';",
  ],
  [
    "export default function ServiceDetailsDialog({ service, onClose }: Readonly<DialogProps>) {\n  const details = useServiceDetails(service);",
    "export default function ServiceDetailsDialog({ service, onClose }: Readonly<DialogProps>) {\n  const { t } = useTranslation();\n  const details = useServiceDetails(service);",
  ],
  ['aria-label="Close details" size="small">', "aria-label={t('status.detail.close')} size=\"small\">"],
  ["<SectionTitle>Endpoint</SectionTitle>", "<SectionTitle>{t('status.detail.endpoint')}</SectionTitle>"],
  ["<SectionTitle>Server health</SectionTitle>", "<SectionTitle>{t('status.detail.serverHealth')}</SectionTitle>"],
  ["<SectionTitle>History</SectionTitle>", "<SectionTitle>{t('status.detail.history')}</SectionTitle>"],
]);

apply("website/status-website/src/components/service-details-dialog/HistoryCharts.tsx", [
  [
    "import { formatUptime } from '../../utils/format';",
    "import { useTranslation } from '../../i18n';\nimport { formatUptime } from '../../utils/format';",
  ],
  [
    "function UptimeBar({ daily }: Readonly<{ daily: DailyUptime[] }>) {\n  const theme = useTheme();",
    "function UptimeBar({ daily }: Readonly<{ daily: DailyUptime[] }>) {\n  const theme = useTheme();\n  const { t } = useTranslation();",
  ],
  ["        label: 'Uptime %',", "        label: t('status.detail.uptimePct'),"],
  [
    "          label: (item: { raw: unknown }) => `Uptime ${formatUptime(Number(item.raw ?? 0))}`,",
    "          label: (item: { raw: unknown }) =>\n            t('status.detail.uptimeTooltip', {\n              vars: { value: formatUptime(Number(item.raw ?? 0)) },\n            }),",
  ],
  [
    "function LatencyLine({ points }: Readonly<{ points: HistoryPoint[] }>) {\n  const theme = useTheme();",
    "function LatencyLine({ points }: Readonly<{ points: HistoryPoint[] }>) {\n  const theme = useTheme();\n  const { t } = useTranslation();",
  ],
  ["        label: 'Latency (ms)',", "        label: t('status.detail.latencyMs'),"],
  [
    "export default function HistoryCharts({ history, failed }: Readonly<HistoryChartsProps>) {\n  if (failed) {\n    return (\n      <Alert severity=\"warning\" variant=\"outlined\">\n        History is unavailable right now.\n      </Alert>\n    );\n  }",
    "export default function HistoryCharts({ history, failed }: Readonly<HistoryChartsProps>) {\n  const { t } = useTranslation();\n  if (failed) {\n    return (\n      <Alert severity=\"warning\" variant=\"outlined\">\n        {t('status.detail.historyUnavailable')}\n      </Alert>\n    );\n  }",
  ],
  [
    "        No history recorded yet — checks run every 5 minutes.\n      </Typography>",
    "        {t('status.detail.noHistory')}\n      </Typography>",
  ],
  [
    "            Daily uptime — last 90 days\n          </Typography>",
    "            {t('status.detail.dailyUptime')}\n          </Typography>",
  ],
  [
    "            Latency — last 24 hours\n          </Typography>",
    "            {t('status.detail.latency24h')}\n          </Typography>",
  ],
  [
    "          No latency samples in the last 24 hours.\n        </Typography>",
    "          {t('status.detail.noLatency')}\n        </Typography>",
  ],
]);
