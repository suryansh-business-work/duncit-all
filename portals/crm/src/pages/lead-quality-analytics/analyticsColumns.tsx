import { Link as RouterLink } from 'react-router';
import { Chip, Link, Stack, Typography } from '@mui/material';
import type { DuncitColumn } from '@duncit/table';
import type { Translate } from '@duncit/shell';
import { LEAD_TYPES, QUALIFICATION_COLOR, QUALIFICATION_KEY } from '../../components/lead-quality/qualityLabels';
import { LEAD_KIND_LABEL_KEY, leadDetailPath } from '../../lib/leadKinds';
import { labelOf } from '../../lib/leadResearchLabels';
import { formatScore, formatWeek, shareOf, type CityRow, type ConversionRow, type CountRow, type MissingRow, type TopLead, type TrendRow } from './analyticsData';

const leadTypeColumn = <T extends { entity_type: TopLead['entity_type'] }>(t: Translate): DuncitColumn<T> => ({
  field: 'entity_type',
  headerName: t('crm.leadResearch.leadType'),
  type: 'enum',
  options: LEAD_TYPES.map((type) => ({ value: type, label: t(LEAD_KIND_LABEL_KEY[type]) })),
  width: 150,
  valueGetter: (row) => t(LEAD_KIND_LABEL_KEY[row.entity_type]),
});

const percent = (t: Translate, value: number | null | undefined) =>
  typeof value === 'number' ? t('crm.leadQualityAnalytics.percent', { vars: { value: Math.round(value * 10) / 10 } }) : formatScore(null);

/** The best-scored leads, each linking to its CRM page. */
export const topLeadColumns = (t: Translate): DuncitColumn<TopLead>[] => [
  {
    field: 'name',
    headerName: t('shell.common.name'),
    type: 'text',
    flex: 1,
    minWidth: 180,
    cellRenderer: (row) => (
      <Link component={RouterLink} to={leadDetailPath(row.entity_type, row.id)} variant="body2" sx={{ fontWeight: 600 }}>
        {row.name}
      </Link>
    ),
  },
  leadTypeColumn<TopLead>(t),
  { field: 'city', headerName: t('crm.common.city'), type: 'text', width: 140 },
  {
    field: 'score',
    headerName: t('crm.leadQuality.columnHeader'),
    type: 'number',
    width: 190,
    // The answer carries no band colour for these rows, so the score is shown as a number, never a coloured ring.
    cellRenderer: (row) => (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
        <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
          {t('crm.leadQualityAnalytics.scoreOutOf100', { vars: { score: formatScore(row.score) } })}
        </Typography>
        <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }} noWrap>
          {row.classification_label}
        </Typography>
      </Stack>
    ),
  },
  {
    field: 'qualification',
    headerName: t('crm.leadResearch.qualification'),
    type: 'enum',
    options: Object.entries(QUALIFICATION_KEY).map(([value, key]) => ({ value, label: t(key) })),
    width: 180,
    cellRenderer: (row) => (
      <Chip size="small" variant="outlined" color={QUALIFICATION_COLOR[row.qualification] ?? 'default'} label={labelOf(t, QUALIFICATION_KEY, row.qualification)} />
    ),
  },
];

export const cityColumns = (t: Translate): DuncitColumn<CityRow>[] => [
  { field: 'city', headerName: t('crm.common.city'), type: 'text', flex: 1, minWidth: 140 },
  { field: 'leads', headerName: t('crm.leadQualityAnalytics.leads'), type: 'number', width: 110 },
  { field: 'average_score', headerName: t('crm.leadQualityAnalytics.averageScore'), type: 'number', width: 150, valueGetter: (row) => formatScore(row.average_score) },
  { field: 'qualified', headerName: t('crm.leadQuality.qualified'), type: 'number', width: 120 },
  {
    field: 'qualified_rate',
    headerName: t('crm.leadQualityAnalytics.qualifiedRate'),
    type: 'number',
    sortable: false,
    filterable: false,
    width: 140,
    valueGetter: (row) => percent(t, shareOf(row.qualified, row.leads)),
  },
];

export const conversionColumns = (t: Translate): DuncitColumn<ConversionRow>[] => [
  { field: 'label', headerName: t('crm.leadQualityAnalytics.classification'), type: 'text', flex: 1, minWidth: 140 },
  { field: 'leads', headerName: t('crm.leadQualityAnalytics.leads'), type: 'number', width: 110 },
  { field: 'won', headerName: t('crm.leadQualityAnalytics.won'), type: 'number', width: 110 },
  { field: 'conversion_rate', headerName: t('crm.leadQualityAnalytics.conversionRate'), type: 'number', width: 150, valueGetter: (row) => percent(t, row.conversion_rate) },
];

export const missingColumns = (t: Translate): DuncitColumn<MissingRow>[] => [
  { field: 'criterion', headerName: t('crm.leadQualityAnalytics.criterion'), type: 'text', flex: 1, minWidth: 160 },
  leadTypeColumn<MissingRow>(t),
  { field: 'leads', headerName: t('crm.leadQualityAnalytics.leadsPending'), type: 'number', width: 150 },
];

/** A chart's own numbers, for the table view beside it. */
export const countColumns = (t: Translate, labelHeader: string): DuncitColumn<CountRow>[] => [
  { field: 'label', headerName: labelHeader, type: 'text', flex: 1, minWidth: 140 },
  { field: 'count', headerName: t('crm.leadQualityAnalytics.leads'), type: 'number', width: 120 },
];

export const trendColumns = (t: Translate): DuncitColumn<TrendRow>[] => [
  { field: 'week', headerName: t('crm.leadQualityAnalytics.week'), type: 'text', flex: 1, minWidth: 140, valueGetter: (row) => formatWeek(row.week) },
  { field: 'leads', headerName: t('crm.leadQualityAnalytics.leads'), type: 'number', width: 110 },
  { field: 'average_score', headerName: t('crm.leadQualityAnalytics.averageScore'), type: 'number', width: 150, valueGetter: (row) => formatScore(row.average_score) },
];
