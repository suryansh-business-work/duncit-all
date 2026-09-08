import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { DuncitTable, clientTableFetch } from '@duncit/table';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '../../i18n';
import { RegionDrillDrawer, useDrillStack } from '../drill';
import AddClubAdminDialog from './AddClubAdminDialog';
import RegionNameCard from './RegionNameCard';
import { memberColumns, memberSearchText } from './memberColumns';
import {
  MY_REGION_MEMBERS,
  REMOVE_REGION_CLUB_ADMIN,
  type Region,
  type RegionMember,
} from '../queries';

interface MembersQueryData {
  myRegion: Region;
  myRegionMembers: RegionMember[];
  publicFinanceSettings: { currency_symbol: string };
}

const getRowId = (row: RegionMember) => row.user_id;

/**
 * Regional Club Admin > Club Admins.
 *
 * The one thing a region actually STORES. Everything the Structure canvas
 * draws below a club admin — their city, their locality, their hosts and those
 * hosts' pods — follows from the clubs they already run, so this list is the
 * only place the region is edited.
 *
 * A row OPENS rather than only listing: clicking a Club Admin drills into their
 * clubs, a club into its pods, and a pod into its full detail page. It is the
 * same drawer the canvas uses, so both routes to a pod behave identically.
 */
export default function RegionClubAdminsPage() {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<RegionMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remove, removeState] = useMutation(REMOVE_REGION_CLUB_ADMIN);
  const drill = useDrillStack();

  const { data, loading, refetch } = useQuery<MembersQueryData>(MY_REGION_MEMBERS, {
    fetchPolicy: 'cache-and-network',
  });
  const members = useMemo(() => data?.myRegionMembers ?? [], [data]);
  const currency = data?.publicFinanceSettings?.currency_symbol ?? '';
  const firstLoad = loading && !data;

  const afterWrite = useCallback(() => {
    refetch().catch((e) => setError(parseApiError(e)));
  }, [refetch]);

  const fetchRows = useMemo(() => clientTableFetch(members, memberSearchText), [members]);
  const columns = useMemo(() => memberColumns(t, setPendingRemove), [t]);

  const confirmRemove = async (row: RegionMember) => {
    try {
      await remove({ variables: { user_id: row.user_id } });
      setPendingRemove(null);
      afterWrite();
    } catch (e) {
      setPendingRemove(null);
      setError(parseApiError(e));
    }
  };

  return (
    <Box>
      <PageHeader
        title={t('partners.regional.clubAdminsTitle')}
        subtitle={t('partners.regional.clubAdminsSubtitle')}
        sx={{ mb: 2 }}
      />

      <Stack spacing={2}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <RegionNameCard region={data?.myRegion} loading={firstLoad} onRenamed={afterWrite} />

        <Alert severity="info">{t('partners.regional.drillHint')}</Alert>

        {/* The table fetches from MEMORY, so it is ready the instant it mounts
            and would flash "no Club Admins yet" while the query is still in
            flight. The guard keys the wait to the query instead, which is what
            the manager is actually waiting for. */}
        <QueryGuard loading={firstLoad}>
          {() => (
            <DuncitTable<RegionMember>
              tableId="regional-club-admins"
              columns={columns}
              fetchRows={fetchRows}
              getRowId={getRowId}
              emptyText={t('partners.regional.noMembersYet')}
              defaultSort={{ field: 'name', dir: 'asc' }}
              searchPlaceholder={t('partners.regional.searchMembers')}
              onRowClick={(row) =>
                drill.open({ kind: 'CLUBS', id: row.user_id, label: row.name || row.email })
              }
              toolbarActions={
                <DuncitButton
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddOpen(true)}
                >
                  {t('partners.regional.addClubAdmin')}
                </DuncitButton>
              }
            />
          )}
        </QueryGuard>
      </Stack>

      <AddClubAdminDialog open={addOpen} onClose={() => setAddOpen(false)} onAdded={afterWrite} />

      <RegionDrillDrawer
        stack={drill.stack}
        currency={currency}
        onPush={drill.push}
        onPop={drill.pop}
        onClose={drill.close}
      />

      {pendingRemove && (
        <ConfirmDialog
          open
          destructive
          busy={removeState.loading}
          title={t('partners.regional.removeFromRegion')}
          message={t('partners.regional.removeConfirm', {
            vars: { name: pendingRemove.name || pendingRemove.email },
          })}
          confirmLabel={t('partners.regional.remove')}
          onConfirm={() => confirmRemove(pendingRemove)}
          onClose={() => setPendingRemove(null)}
        />
      )}
    </Box>
  );
}
