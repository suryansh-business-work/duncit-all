import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/status.ts", [
  [
    "      overallUptime: 'Overall uptime %',",
    "      overallUptime: 'Overall uptime %',\n      overallUptimeHeading: 'Overall uptime — last 90 days',",
  ],
]);

apply("website/status-website/src/components/GlobalUptimeChart.tsx", [
  [
    "import { dayStateColor } from '../utils/status';",
    "import { useTranslation } from '../i18n';\nimport { dayStateColor } from '../utils/status';",
  ],
  [
    "export default function GlobalUptimeChart({ global, overallUptime }: Readonly<GlobalChartProps>) {\n  const theme = useTheme();",
    "export default function GlobalUptimeChart({ global, overallUptime }: Readonly<GlobalChartProps>) {\n  const theme = useTheme();\n  const { t } = useTranslation();",
  ],
  [
    "          Overall uptime — last 90 days\n        </Typography>",
    "          {t('status.board.overallUptimeHeading')}\n        </Typography>",
  ],
  [
    "        <Bar data={buildData(global, theme)} options={buildOptions(theme, global)} />",
    "        <Bar\n          data={buildData(global, theme, t('status.board.overallUptime'))}\n          options={buildOptions(theme, global)}\n        />",
  ],
]);

apply("website/status-website/src/components/IncidentsSection.tsx", [
  [
    "import { stateChipColor, stateLabel } from '../utils/status';",
    "import { useTranslation } from '../i18n';\nimport { stateChipColor, stateLabel } from '../utils/status';",
  ],
  [
    "export default function IncidentsSection({ incidents }: Readonly<{ incidents: Incident[] | null }>) {",
    "export default function IncidentsSection({ incidents }: Readonly<{ incidents: Incident[] | null }>) {\n  const { t } = useTranslation();",
  ],
]);
