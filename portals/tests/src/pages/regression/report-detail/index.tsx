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

type ReportTab = RegressionBucket | 'COVERAGE' | 'SUITES';
const TABS_ID = 'regression-report';

/**
 * A report's buckets, one tab each (in the URL), then the unit report's
 * coverage change per workspace or the E2E report's suites side by side.
 */
function ReportBuckets({ report }: Readonly<{ report: RegressionReportDetail }>) {
  const { t } = useTranslation();
  const labels = useRegressionLabels();
  const isUnit = report.kind === 'UNIT';
  const items: DuncitTabItem<ReportTab>[] = [
    ...BUCKET_COUNTS.map(({ bucket, field }) => ({
      value: bucket,
      label: t('testsUnit.regression.tabCount', { vars: { label: labels.bucket[bucket], count: report.counts[field] } }),
      searchText: labels.bucket[bucket],
    })),
    isUnit
      ? { value: 'COVERAGE', label: t('testsUnit.regression.coverageTitle') }
      : { value: 'SUITES', label: t('testsUnit.regression.suitesTitle') },
  ];
  const tabs = useTabParam<ReportTab>({ items, fallback: 'REGRESSED' });
  let panel;
  if (tabs.value === 'COVERAGE') {
    panel = <CoverageDeltaTable rows={report.coverage_workspaces} />;
  } else if (tabs.value === 'SUITES') {
    panel = <SuitesTable suites={report.suites} />;
  } else {
    panel = (
      <ItemsTable
        key={tabs.value}
        reportId={report.id}
        bucket={tabs.value}
        isE2e={!isUnit}
        label={labels.bucket[tabs.value]}
      />
    );
  }
  return (
    <Box>
      <DuncitTabs {...tabs} idPrefix={TABS_ID} variant="scrollable" allowScrollButtonsMobile />
      <Box {...tabPanelProps(TABS_ID, tabs.value)} sx={{ pt: 2 }}>
        {panel}
      </Box>
    </Box>
  );
}

/**
 * One regression report: the two runs compared, every bucket's count, the
 * tests (unit) or scenarios (E2E) in each bucket, and the coverage change or
 * the suites side by side.
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
          <ReportBuckets report={report} />
        </Stack>
      )}
    </QueryGuard>
  );
}
