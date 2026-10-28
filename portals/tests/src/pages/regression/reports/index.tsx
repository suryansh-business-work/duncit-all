import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import type { RegressionReportRow } from '../queries';
import ReportsTable from './ReportsTable';

/**
 * Regression → Reports: what changed in each finished unit or E2E run against
 * the run before it on the same branch. Built by the server as each run
 * finishes — there is nothing to start here.
 */
export default function RegressionReportsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const open = useCallback((row: RegressionReportRow) => navigate(`/regression/reports/${row.id}`), [navigate]);
  return (
    <Stack spacing={2.5}>
      <PageHeader title={t('testsUnit.regression.title')} subtitle={t('testsUnit.regression.subtitle')} />
      <ReportsTable onRowClick={open} />
    </Stack>
  );
}
