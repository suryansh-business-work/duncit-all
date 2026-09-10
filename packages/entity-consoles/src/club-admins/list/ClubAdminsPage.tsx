import { useMemo } from 'react';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import { useTranslation } from '@duncit/shell';
import ConsoleListPage from '../../shared/ConsoleListPage';
import { useConsoleAccess } from '../../shared/useConsoleAccess';
import { CLUB_ADMINS_TABLE, type ClubAdminRow } from '../queries';
import { clubAdminColumns } from './clubAdminColumns';

/**
 * Club Admins: everyone who runs a club, and the clubs each of them runs.
 *
 * Add is shown only to a viewer who can govern, because appointing a Club Admin
 * grants the CLUB_ADMIN role — that is the appointment, not a detail — and the
 * server refuses it from a console-role editor.
 */
export default function ClubAdminsPage() {
  const { t } = useTranslation();
  const { canGovern } = useConsoleAccess();
  const columns = useMemo(() => clubAdminColumns(t), [t]);

  return (
    <ConsoleListPage<ClubAdminRow>
      icon={<SupervisorAccountIcon color="primary" />}
      title={t('directory.clubAdmins.title')}
      subtitle={t('directory.clubAdmins.subtitle')}
      addTo={canGovern ? '/club-admins/new' : undefined}
      addLabel={t('directory.clubAdminEditor.addClubAdmin')}
      document={CLUB_ADMINS_TABLE}
      resultKey="clubAdminProfilesTable"
      columns={columns}
      tableId="club-admins-console-list"
      emptyText={t('directory.clubAdminEditor.listEmpty')}
      searchPlaceholder={t('directory.clubAdminEditor.searchPlaceholder')}
      defaultSortField="created_at"
      rowPath={(row) => `/club-admins/${row.id}`}
    />
  );
}
