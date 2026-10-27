import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Link, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { useDateFormat } from '@duncit/app-settings';
import type { UnitTestFileKind, UnitTestMockCount } from '@duncit/gql-types';
import { EM_DASH } from '@duncit/table';
import MetricGrid, { type Metric } from '../components/MetricGrid';
import { useUnitLabels } from '../labels';
import type { InventorySummary as Summary } from '../queries';

const KIND_ORDER: readonly UnitTestFileKind[] = ['VITEST', 'JEST', 'CYPRESS_COMPONENT', 'CYPRESS_E2E'];

function TopList({ title, rows, empty }: Readonly<{ title: string; rows: readonly UnitTestMockCount[]; empty: string }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={title}>
      {rows.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {empty}
        </Typography>
      ) : (
        <List dense disablePadding>
          {rows.map((row) => (
            <ListItem key={row.name} disableGutters>
              <ListItemText
                primary={row.name}
                secondary={t('testsUnit.inventory.inFiles', { vars: { files: row.files } })}
                slotProps={{ primary: { noWrap: true, title: row.name } }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </SectionCard>
  );
}

/** Files per kind, how many mock something, and the names mocked most — for the run the table lists. */
export default function InventorySummary({ summary }: Readonly<{ summary: Summary }>) {
  const { t } = useTranslation();
  const labels = useUnitLabels();
  const dates = useDateFormat({ timeZoneAware: true });
  const metrics = useMemo<Metric[]>(() => {
    const byKind = new Map(summary.kinds.map((k) => [k.kind, k]));
    const kindTiles = KIND_ORDER.map((kind): Metric => {
      const row = byKind.get(kind);
      return {
        id: kind,
        label: labels.fileKind[kind],
        value: row?.files ?? 0,
        hint: t('testsUnit.inventory.kindHint', { vars: { tests: row?.tests ?? 0, notRun: row?.not_run ?? 0 } }),
      };
    });
    return [...kindTiles, { id: 'mocks', label: t('testsUnit.inventory.filesWithMocks'), value: summary.files_with_mocks }];
  }, [labels, summary, t]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('testsUnit.inventory.fromRun', {
            vars: {
              run: summary.run.run_no,
              when: summary.run.finished_at ? dates.formatDateTime(summary.run.finished_at) : EM_DASH,
            },
          })}
        </Typography>
        <Link component={RouterLink} to={`/unit/runs/${summary.run.id}`} underline="hover" variant="body2">
          {t('testsUnit.inventory.openRun')}
        </Link>
      </Stack>
      <MetricGrid metrics={metrics} />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
        <TopList title={t('testsUnit.inventory.topMocks')} rows={summary.top_mocks} empty={t('testsUnit.inventory.noMocks')} />
        <TopList
          title={t('testsUnit.inventory.topGqlMocks')}
          rows={summary.top_gql_mocks}
          empty={t('testsUnit.inventory.noGqlMocks')}
        />
      </Box>
    </Stack>
  );
}
