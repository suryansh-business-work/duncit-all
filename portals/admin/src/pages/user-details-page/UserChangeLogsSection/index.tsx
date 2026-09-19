import { useCallback, useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch, type TableQueryState } from '@duncit/table';
import { USER_CHANGE_LOGS_TABLE, type UserChangeLogRow, type UserChangeLogScope } from '../queries';
import { changeLogColumns } from './columns';
import { useTranslation } from '@duncit/shell';

/**
 * One half of a user's profile change history.
 *
 * One row per changed field — the server appends an entry every time a
 * profile-related value moves, whoever moved it and wherever from, and never
 * updates or deletes one. The USER scope lists the account's own changes
 * (plus system writes such as signup); the ADMIN scope lists every change an
 * admin made to it. The server applies the split, so neither tab can be
 * widened into showing the other's rows.
 */

const getRowId = (row: UserChangeLogRow) => row.id;

/** Column state is remembered per table id, so each scope keeps its own. */
const SCOPE_UI: Record<UserChangeLogScope, { tableId: string; testId: string }> = {
  USER: { tableId: 'admin-user-change-logs', testId: 'user-change-logs-section' },
  ADMIN: { tableId: 'admin-user-admin-change-logs', testId: 'admin-change-logs-section' },
};

export default function UserChangeLogsSection({
  userId,
  scope,
}: Readonly<{ userId: string; scope: UserChangeLogScope }>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  // Every key is a literal handed to t(): the only form the translation gate can see.
  const copy = {
    USER: {
      title: t('admin.profile.changeLogs'),
      hint: t('admin.profile.changeLogsHint'),
      empty: t('admin.profile.noChanges'),
    },
    ADMIN: {
      title: t('admin.profile.adminChangeLogs'),
      hint: t('admin.profile.adminChangeLogsHint'),
      empty: t('admin.profile.noAdminChanges'),
    },
  }[scope];
  const columns = useMemo(() => changeLogColumns(scope), [scope]);

  const fetchTable = useApolloTableFetch<UserChangeLogRow>(
    client,
    USER_CHANGE_LOGS_TABLE,
    'userChangeLogsTable',
    { extraVariables: { user_id: userId, scope } },
    [userId, scope],
  );
  const fetchRows = useCallback(
    async (q: TableQueryState) => (userId ? fetchTable(q) : { rows: [], total: 0 }),
    [userId, fetchTable],
  );

  return (
    <Stack spacing={2} data-testid={SCOPE_UI[scope].testId}>
      <Stack spacing={0.25}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {copy.title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {copy.hint}
        </Typography>
      </Stack>
      <DuncitTable<UserChangeLogRow>
        tableId={SCOPE_UI[scope].tableId}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={copy.empty}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('admin.profile.changeLogsSearch')}
      />
    </Stack>
  );
}
