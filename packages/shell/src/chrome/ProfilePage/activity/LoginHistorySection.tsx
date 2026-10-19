import { useMemo } from 'react';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitTable, clientTableFetch } from '@duncit/table';
import { useTranslation } from '../../../i18n/useTranslation';
import { ProfileSection } from '../ProfileSection';
import type { LoginActivityEntry, LoginActivityHistory } from '../queries';
import { deviceValue, locationValue, loginActivityColumns, signedInOnValue } from './loginActivityColumns';

const getRowId = (row: LoginActivityEntry) => row.id;

/** Every sign-in still within the retention window, newest first. */
export function LoginHistorySection({ history }: Readonly<{ history: LoginActivityHistory }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const columns = useMemo(() => loginActivityColumns(t, formatDateTime), [t, formatDateTime]);
  const fetchRows = useMemo(
    () =>
      clientTableFetch(
        history.entries,
        (row) => [locationValue(t, row), deviceValue(t, row), signedInOnValue(t, row), row.ip ?? ''].join(' '),
        columns,
      ),
    [history.entries, columns, t],
  );

  return (
    <ProfileSection
      testId="profile-login-history"
      title={t('shell.profile.activity.historyTitle')}
      description={t('shell.profile.activity.historyHint', { vars: { days: history.retention_days } })}
    >
      <DuncitTable<LoginActivityEntry>
        ariaLabel={t('shell.profile.activity.historyTitle')}
        tableId="profile-login-activity"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('shell.profile.activity.empty')}
        defaultSort={{ field: 'signed_in_at', dir: 'desc' }}
        searchPlaceholder={t('shell.profile.activity.search')}
      />
    </ProfileSection>
  );
}
