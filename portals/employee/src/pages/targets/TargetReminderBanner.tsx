import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, AlertTitle } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { formatMonthKey } from '@duncit/utils';
import { MY_DUE_EMPLOYEE_TARGETS, type MyDueTargetsData } from './queries';

/**
 * "Your monthly target needs a progress report" — shown while the server says
 * a month is unsubmitted inside its reminder window. The window is an admin
 * setting read in the app's time zone, so it is never worked out here: no due
 * row from the server, no banner.
 */
export default function TargetReminderBanner() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const { data } = useQuery<MyDueTargetsData>(MY_DUE_EMPLOYEE_TARGETS, { fetchPolicy: 'cache-and-network' });
  const due = data?.myDueEmployeeTargets ?? [];
  if (due.length === 0) return null;
  const months = due.map((row) => formatMonthKey(row.month, locale)).join(', ');

  return (
    <Alert
      severity="warning"
      data-testid="target-reminder-banner"
      action={
        <DuncitButton size="small" color="inherit" onClick={() => navigate(`/targets/${due[0].id}`)}>
          {t('employeeTargets.reminder.action')}
        </DuncitButton>
      }
    >
      <AlertTitle>{t('employeeTargets.reminder.title')}</AlertTitle>
      {t('employeeTargets.reminder.body', { vars: { months } })}
    </Alert>
  );
}
