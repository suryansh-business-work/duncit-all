import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Stack } from '@mui/material';
import type { RegressionBucket } from '@duncit/gql-types';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { REGRESSION_REPORT, type RegressionReportDetail } from '../queries';
import { BUCKET_COUNTS, useRegressionLabels } from '../labels';
import ReportHeader from './ReportHeader';
import ItemsTable from './ItemsTable';
import CoverageDeltaTable from './CoverageDeltaTable';
import SuitesTable from './SuitesTable';

type UnitTab = RegressionBucket | 'COVERAGE';
const TABS_ID = 'regression-report';

/** A unit report's buckets, one tab each (in the URL), and the coverage change per workspace. */
function UnitBuckets({ report }: Readonly<{ report: RegressionReportDetail }>) {
  const { t } = useTranslation();
  const labels = useRegressionLabels();
  const items: DuncitTabItem<UnitTab>[] = [
    ...BUCKET_COUNTS.map(({ bucket, field }) => ({
      value: bucket,
      label: t('testsUnit.regression.tabCount', { vars: { label: labels.bucket[bucket], count: report.counts[field] } }),
      searchText: labels.bucket[bucket],
    })),
    { value: 'COVERAGE', label: t('testsUnit.regression.coverageTitle') },
  ];
  const tabs = useTabParam<UnitTab>({ items, fallback: 'REGRESSED' });
  return (
    <Box>
      <DuncitTabs {...tabs} idPrefix={TABS_ID} variant="scrollable" allowScrollButtonsMobile />
      <Box {...tabPanelProps(TABS_ID, tabs.value)} sx={{ pt: 2 }}>
        {tabs.value === 'COVERAGE' ? (
          <CoverageDeltaTable rows={report.coverage_workspaces} />
        ) : (
          <ItemsTable key={tabs.value} reportId={report.id} bucket={tabs.value} label={labels.bucket[tabs.value]} />
        )}
      </Box>
    </Box>
  );
}

/**
 * One regression report: the two runs compared, every bucket's count, and —
 * for a unit report — the tests in each bucket; for an E2E report, every
 * suite side by side.
 */
export default function RegressionReportDetailPage() {
  const { t } = useTranslation();
  const { reportId = '' } = useParams();
  const query = useQuery<{ regressionReport: RegressionReportDetail | null }>(REGRESSION_REPORT, {
    variables: { id: reportId },
    fetchPolicy: 'cache-and-network',
  });
  const report = query.data?.regressionReport ?? null;

  return (
    <QueryGuard
      loading={query.loading && !report}
      error={query.error}
      errorText={t('testsUnit.common.loadFailed')}
      notFound={!query.loading && !query.error && !report}
      notFoundText={t('testsUnit.regression.notFound')}
    >
      {report && (
        <Stack spacing={2.5}>
          <ReportHeader report={report} />
          {report.kind === 'UNIT' ? <UnitBuckets report={report} /> : <SuitesTable suites={report.suites} />}
        </Stack>
      )}
    </QueryGuard>
  );
}
