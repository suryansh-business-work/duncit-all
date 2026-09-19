import { useCallback, useMemo, useRef } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { useConfirm } from '@duncit/dialogs';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import { usePortalT } from '../../../shared/i18n';
import { useLiteSession } from '../../../shared/session';
import { LITE_ADMIN_SET_USER_FLAGS, LITE_ADMIN_USERS_TABLE, type LiteAdminUserRow } from '../../graphql/users';
import { useAction } from '../../hooks/useAction';
import { buildUserColumns, userRowId } from './columns';
import { UserActions } from './UserActions';
import { flagCopy, type UserFlag } from './user-flags';

export function UsersPage() {
  const { t } = usePortalT();
  const { me } = useLiteSession();
  const confirm = useConfirm();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const reload = useCallback(() => refetchRef.current?.(), []);
  const run = useAction(reload);
  const fetchRows = useApolloTableFetch<LiteAdminUserRow>(client, LITE_ADMIN_USERS_TABLE, 'liteAdminUsersTable');
  const [setFlags] = useMutation(LITE_ADMIN_SET_USER_FLAGS);

  const changeFlag = useCallback(
    async (row: LiteAdminUserRow, flag: UserFlag) => {
      const next = !row[flag];
      const copy = flagCopy(flag, next);
      const vars = { vars: { name: row.name } };
      const ok = await confirm({
        title: t(copy.title, vars),
        message: t(copy.message),
        confirmLabel: t('litePortal.common.confirm'),
        cancelLabel: t('lite.common.cancel'),
        destructive: copy.destructive,
      });
      if (!ok) return;
      await run(() => setFlags({ variables: { id: row.id, [flag]: next } }), t(copy.done, vars));
    },
    [confirm, run, setFlags, t],
  );

  const myId = me?.id;
  const columns = useMemo(
    () => buildUserColumns(t, (row) => <UserActions row={row} isSelf={row.id === myId} onChange={changeFlag} />),
    [t, myId, changeFlag],
  );

  return (
    <Stack spacing={2}>
      <PageHeader title={t('litePortal.users.title')} subtitle={t('litePortal.users.subtitle')} />
      <DuncitTable<LiteAdminUserRow>
        tableId="lite-users"
        ariaLabel={t('litePortal.users.title')}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={userRowId}
        emptyText={t('litePortal.users.empty')}
        searchPlaceholder={t('litePortal.users.search')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        refetchRef={refetchRef}
      />
    </Stack>
  );
}
