import { useCallback } from 'react';
import { useApolloClient } from '@apollo/client';
import { Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch, type TableQueryState } from '@duncit/table';
import { USER_CHANGE_LOGS_TABLE, type UserChangeLogRow } from '../queries';
import { CHANGE_LOG_COLUMNS } from './columns';
import { useTranslation } from '@duncit/shell';

/**
 * The complete profile change history of one user.
 *
 * One row per changed field — the server appends an entry every time a
 * profile-related value moves, whoever moved it and wherever from, and never
 * updates or deletes one. So this table is the whole history, not the latest
 * state of it.
 */

const getRowId = (row: UserChangeLogRow) => row.id;

export default function UserChangeLogsSection({ userId }: Readonly<{ userId: string }>) {
  const { t } = useTranslation();
  const client = useApolloClient();

  const fetchTable = useApolloTableFetch<UserChangeLogRow>(
    client,
    USER_CHANGE_LOGS_TABLE,
    'userChangeLogsTable',
    { extraVariables: { user_id: userId } },
    [userId],
  );
  const fetchRows = useCallback(
    async (q: TableQueryState) => (userId ? fetchTable(q) : { rows: [], total: 0 }),
    [userId, fetchTable],
  );

  return (
    <Stack spacing={2}>
      <Stack spacing={0.25}>
        <Typography variant="subtitle1" fontWeight={700}>
          {t('admin.profile.changeLogs')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Every profile change ever made to this account — by the user from Native or mWeb, or by an
          admin from this portal. Entries are append-only, so nothing here is overwritten.
        </Typography>
      </Stack>
      <DuncitTable<UserChangeLogRow>
        tableId="admin-user-change-logs"
        columns={CHANGE_LOG_COLUMNS}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('admin.profile.noChanges')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder="Search field, old or new value, or who changed it"
      />
    </Stack>
  );
}
