import { Link as RouterLink } from 'react-router';
import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { SectionCard } from '@duncit/ui';
import type { TestsCount, TestsManualSummary } from '@duncit/gql-types';
import { CATEGORY_KEYS, PRIORITY_KEYS } from '../manual/shared/vocabulary';
import Meter from './Meter';
import { pct } from './status';

type Props = Readonly<{ manual: TestsManualSummary | null | undefined }>;

/** The board's own label keys; a breakdown key arrives as a plain string. */
const CATEGORY_LABELS: ReadonlyMap<string, string> = new Map(Object.entries(CATEGORY_KEYS));
const PRIORITY_LABELS: ReadonlyMap<string, string> = new Map(Object.entries(PRIORITY_KEYS));

/** One labelled number. */
function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="h6" component="p" sx={{ fontWeight: 'fontWeightBold' }}>
        {value}
      </Typography>
    </Stack>
  );
}

/** A breakdown as bars, each labelled from the board's own vocabulary. */
function Breakdown({ rows, total, labelOf }: Readonly<{ rows: readonly TestsCount[]; total: number; labelOf: (key: string) => string }>) {
  return (
    <Stack spacing={1.25}>
      {rows.map((row) => (
        <Meter key={row.key} label={labelOf(row.key)} value={pct(row.count, total)} caption={String(row.count)} />
      ))}
    </Stack>
  );
}

/** The manual test board at a glance: size, open bugs, pass rate and where the cases sit. */
export default function ManualCard({ manual }: Props) {
  const { t } = useTranslation();
  return (
    <SectionCard
      title={t('tests.dashboard.manual.title')}
      subtitle={t('tests.dashboard.manual.subtitle')}
      action={
        <Button component={RouterLink} to="/manual/board" size="small">
          {t('tests.dashboard.manual.openBoard')}
        </Button>
      }
    >
      {manual ? (
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
            <Fact label={t('tests.dashboard.manual.cases')} value={String(manual.total)} />
            <Fact label={t('tests.dashboard.manual.openBugs')} value={String(manual.open_bugs)} />
            <Fact
              label={t('tests.dashboard.manual.passRate')}
              value={
                manual.pass_rate === null || manual.pass_rate === undefined
                  ? t('tests.common.noData')
                  : t('tests.common.percent', { vars: { value: String(manual.pass_rate) } })
              }
            />
            <Fact label={t('tests.dashboard.manual.executed')} value={String(manual.executed_last_7_days)} />
          </Box>
          <Divider />
          <Breakdown rows={manual.by_category} total={manual.total} labelOf={(key) => t(CATEGORY_LABELS.get(key) ?? key)} />
          <Divider />
          <Breakdown rows={manual.by_priority} total={manual.total} labelOf={(key) => t(PRIORITY_LABELS.get(key) ?? key)} />
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tests.dashboard.manual.empty')}
        </Typography>
      )}
    </SectionCard>
  );
}
