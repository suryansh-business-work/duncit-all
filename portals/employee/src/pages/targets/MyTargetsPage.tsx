import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { EmployeeTargetRecord } from '@duncit/utils';
import TargetReminderBanner from './TargetReminderBanner';
import MyTargetsTable from './MyTargetsTable';

/**
 * Employee > My Targets: the goals the Targets team set for each month, and
 * where each month's progress report stands. Opening a month is where the
 * report is filed.
 */
export default function MyTargetsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const open = useCallback((row: EmployeeTargetRecord) => navigate(`/targets/${row.id}`), [navigate]);

  return (
    <Stack spacing={2}>
      <PageHeader title={t('employeeTargets.mine.title')} subtitle={t('employeeTargets.mine.subtitle')} />
      <TargetReminderBanner />
      <MyTargetsTable onOpen={open} />
    </Stack>
  );
}
