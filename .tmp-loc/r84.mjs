import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/status.ts", [
  ["      allGroups: 'All groups',", "      allGroups: 'All groups',\n      searchAria: 'Search services',\n      allStatuses: 'All',"],
]);

apply("website/status-website/src/components/StatusFilters.tsx", [
  [
    "import SearchIcon from '@mui/icons-material/Search';",
    "import SearchIcon from '@mui/icons-material/Search';\nimport { useTranslation } from '../i18n';",
  ],
  [
    "export default function StatusFilters({ value, groupTitles, onChange }: Readonly<FiltersProps>) {\n  return (",
    "export default function StatusFilters({ value, groupTitles, onChange }: Readonly<FiltersProps>) {\n  const { t } = useTranslation();\n  return (",
  ],
  ['        placeholder="Search services…"', "        placeholder={t('status.board.search')}"],
  ["        inputProps={{ 'aria-label': 'Search services' }}", "        inputProps={{ 'aria-label': t('status.board.searchAria') }}"],
  ['        label="Group"', "        label={t('status.board.group')}"],
  ['<MenuItem value="all">All groups</MenuItem>', "<MenuItem value=\"all\">{t('status.board.allGroups')}</MenuItem>"],
  ['        aria-label="Filter by status"', "        aria-label={t('status.board.filterByStatus')}"],
  [
    '        <ToggleButton value="all">All</ToggleButton>\n        <ToggleButton value="operational">Operational</ToggleButton>\n        <ToggleButton value="issues">Issues</ToggleButton>',
    "        <ToggleButton value=\"all\">{t('status.board.allStatuses')}</ToggleButton>\n        <ToggleButton value=\"operational\">{t('status.board.operational')}</ToggleButton>\n        <ToggleButton value=\"issues\">{t('status.board.issues')}</ToggleButton>",
  ],
]);

apply("website/status-website/src/components/OverallStatusBanner.tsx", [
  [
    "import StatusDot, { type DotState } from './StatusDot';\nimport { stateChipColor } from '../utils/status';\nimport type { OverallRoll } from '../types';",
    "import StatusDot, { type DotState } from './StatusDot';\nimport { useTranslation } from '../i18n';\nimport { stateChipColor } from '../utils/status';\nimport type { OverallRoll } from '../types';\n\n/** The translator this banner and its pure derivation read their copy from. */\ntype Translate = ReturnType<typeof useTranslation>['t'];",
  ],
  [
    "/** Pure derivation from the server roll-up, exported for unit tests. */\nexport function deriveOverallStatus(overall: OverallRoll | null | undefined): OverallStatus {\n  if (!overall) return { severity: 'info', message: 'Checking services…' };\n  const { operational, total, down, degraded } = overall;\n  if (total === 0) return { severity: 'info', message: 'Awaiting the first checks.' };\n  if (operational === total) return { severity: 'success', message: 'All systems operational' };\n  const chip = stateChipColor(overall.state);\n  const severity: DotState = chip === 'error' ? 'error' : 'warning';\n  const issues = down + degraded;\n  const label = down > 0 && degraded === 0 ? 'experiencing an outage' : 'reporting issues';\n  return { severity, message: `${issues} of ${total} services ${label}` };\n}",
    "/** Pure derivation from the server roll-up, exported for unit tests. */\nexport function deriveOverallStatus(\n  overall: OverallRoll | null | undefined,\n  t: Translate,\n): OverallStatus {\n  if (!overall) return { severity: 'info', message: t('status.board.checking') };\n  const { operational, total, down, degraded } = overall;\n  if (total === 0) return { severity: 'info', message: t('status.board.awaiting') };\n  if (operational === total) {\n    return { severity: 'success', message: t('status.board.allOperational') };\n  }\n  const chip = stateChipColor(overall.state);\n  const severity: DotState = chip === 'error' ? 'error' : 'warning';\n  const issues = down + degraded;\n  // Two whole sentences rather than a noun slotted into one: a language that\n  // orders the clause differently cannot be built by concatenation.\n  const key = down > 0 && degraded === 0 ? 'status.board.outage' : 'status.board.reportingIssues';\n  return { severity, message: t(key, { vars: { issues, total } }) };\n}",
  ],
  [
    "export default function OverallStatusBanner({ overall, lastUpdated }: Readonly<BannerProps>) {\n  const status = deriveOverallStatus(overall);",
    "export default function OverallStatusBanner({ overall, lastUpdated }: Readonly<BannerProps>) {\n  const { t } = useTranslation();\n  const status = deriveOverallStatus(overall, t);",
  ],
  [
    "            Last checked {lastUpdated.toLocaleTimeString()}",
    "            {t('status.board.lastChecked', { vars: { time: lastUpdated.toLocaleTimeString() } })}",
  ],
]);
