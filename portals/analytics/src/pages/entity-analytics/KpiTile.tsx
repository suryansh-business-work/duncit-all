import { Box, IconButton, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { StatCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { KPI_COPY } from './copy';
import { deltaOf, formatValue, type Delta } from './format';
import type { AnalyticsKpi } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

const DELTA_ICONS = {
  up: TrendingUpIcon,
  down: TrendingDownIcon,
  flat: TrendingFlatIcon,
} as const;

function deltaText(delta: Delta, t: Translate): string {
  if (delta.direction === 'flat') return t('analytics.page.noChange');
  if (delta.unit === 'points') return t('analytics.page.deltaPoints', { vars: { value: delta.amount } });
  if (delta.unit === 'percent') return t('analytics.page.deltaPercent', { vars: { value: delta.amount } });
  return delta.amount;
}

function deltaColor(delta: Delta): string {
  if (delta.direction === 'flat') return 'text.secondary';
  return delta.good ? 'success.main' : 'error.main';
}

/** The change line under a tile — an arrow and words, so it never rests on colour alone. */
function DeltaLine({ kpi, days }: Readonly<{ kpi: AnalyticsKpi; days: number }>) {
  const { t } = useTranslation();
  const delta = deltaOf(kpi.value, kpi.previous, kpi.format, kpi.higher_is_better);
  if (!delta) return <>{t('analytics.page.liveCount')}</>;
  const Icon = DELTA_ICONS[delta.direction];
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, color: deltaColor(delta), fontWeight: 700 }}>
        <Icon sx={{ fontSize: 16 }} aria-hidden />
        {deltaText(delta, t)}
      </Box>
      <span>{t('analytics.page.vsPrevious', { vars: { days } })}</span>
    </Box>
  );
}

/** One headline number beside how it moved since the period before — a widget of its own. */
export default function KpiTile({ kpi, days }: Readonly<{ kpi: AnalyticsKpi; days: number }>) {
  const { t } = useTranslation();
  const copy = KPI_COPY[kpi.key];
  const title = copy ? t(copy.title) : kpi.key;
  const info = copy ? (
    <Tooltip title={t(copy.hint)}>
      <IconButton size="small" sx={{ p: 0.25, color: 'text.secondary' }}>
        <InfoOutlinedIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Tooltip>
  ) : undefined;
  return (
    <StatCard
      label={title}
      labelVariant="caption"
      labelWeight={600}
      value={formatValue(kpi.value, kpi.format)}
      valueVariant="h5"
      hint={<DeltaLine kpi={kpi} days={days} />}
      icon={info}
      testId={`analytics-kpi-${kpi.key}`}
      sx={{ height: '100%' }}
    />
  );
}
