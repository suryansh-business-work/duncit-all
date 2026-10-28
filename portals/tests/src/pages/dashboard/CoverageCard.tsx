import { Box, Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { SectionCard } from '@duncit/ui';
import type { TestsCoverageMetric, TestsUnitSummary } from '@duncit/gql-types';
import Meter from './Meter';
import { COVERAGE_METRIC_KEYS, pctText } from './status';

type Props = Readonly<{ unit: TestsUnitSummary | null | undefined }>;

const METRICS = ['lines', 'statements', 'functions', 'branches'] as const;
/** How many of the least-covered workspaces to list. */
const LOWEST = 5;

/** Lines, statements, functions and branches of the latest run, and the workspaces dragging them down. */
export default function CoverageCard({ unit }: Props) {
  const { t } = useTranslation();
  const ratio = (m: TestsCoverageMetric) =>
    m.covered === null || m.covered === undefined || !m.total
      ? undefined
      : t('tests.dashboard.coverage.ratio', { vars: { covered: String(m.covered), total: String(m.total) } });
  const lowest = [...(unit?.workspaces ?? [])]
    .filter((w) => w.lines !== null && w.lines !== undefined)
    .sort((a, b) => (a.lines ?? 0) - (b.lines ?? 0))
    .slice(0, LOWEST);

  return (
    <SectionCard title={t('tests.dashboard.coverage.title')} subtitle={t('tests.dashboard.coverage.subtitle')}>
      {unit ? (
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {METRICS.map((key) => (
              <Meter
                key={key}
                label={t(COVERAGE_METRIC_KEYS[key])}
                value={unit.coverage[key].pct}
                caption={ratio(unit.coverage[key])}
              />
            ))}
          </Box>
          {lowest.length > 0 && (
            <>
              <Divider />
              <Typography variant="subtitle2">{t('tests.dashboard.coverage.lowest')}</Typography>
              <Stack component="ul" spacing={0.75} sx={{ m: 0, p: 0, listStyle: 'none' }}>
                {lowest.map((w) => (
                  <Stack component="li" key={w.workspace} direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {w.workspace}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                      {t('tests.dashboard.coverage.workspaceLine', {
                        vars: { lines: pctText(w.lines) ?? '0', branches: pctText(w.branches) ?? '0' },
                      })}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </>
          )}
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tests.dashboard.coverage.empty')}
        </Typography>
      )}
    </SectionCard>
  );
}
