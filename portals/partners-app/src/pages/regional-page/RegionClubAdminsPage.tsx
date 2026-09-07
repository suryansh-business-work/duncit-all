import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '@duncit/ui';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { DuncitTable, actionsColumn, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import AddClubAdminDialog from './AddClubAdminDialog';
import RegionNameCard from './RegionNameCard';
import {
  MY_REGION_MEMBERS,
  REMOVE_REGION_CLUB_ADMIN,
  type Region,
  type RegionMember,
} from './queries';

interface MembersQueryData {
  myRegion: Region;
  myRegionMembers: RegionMember[];
}

const getRowId = (row: RegionMember) => row.user_id;

/** Who they are, over the address the manager would write to. */
const renderPerson = (row: RegionMember) => (
  <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 700 }}>
      {row.name || row.email}
    </Typography>
    <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
      {row.email}
    </Typography>
  </Stack>
);

/**
 * Partners > Regional Club Admin > Club Admins.
 *
 * The one thing a region actually STORES. Everything the Structure canvas
 * draws below a club admin — their city, their locality, their hosts and those
 * hosts' pods — follows from the clubs they already run, so this list is the
 * only place the region is edited.
 */
export default function RegionClubAdminsPage() {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<RegionMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remove, removeState] = useMutation(REMOVE_REGION_CLUB_ADMIN);

  const { data, refetch } = useQuery<MembersQueryData>(MY_REGION_MEMBERS, {
    fetchPolicy: 'cache-and-network',
  });
  const members = useMemo(() => data?.myRegionMembers ?? [], [data]);

  const afterWrite = useCallback(() => {
    refetch().catch((e) => setError(parseApiError(e)));
  }, [refetch]);

  const fetchRows = useMemo(
    () => clientTableFetch(members, (row) => [row.name, row.email, ...row.clubs].join(' ')),
    [members],
  );

  const columns = useMemo<DuncitColumn<RegionMember>[]>(() => {
    const renderClubs = (row: RegionMember) => {
      if (row.clubs.length === 0) {
        return (
          <Typography variant="caption" component="span" sx={{ color: 'warning.main' }}>
            {t('partners.regional.noClubsYet')}
          </Typography>
        );
      }
      return (
        <Stack direction="row" spacing={0.5} useFlexGap component="span" sx={{ flexWrap: 'wrap' }}>
          {row.clubs.map((club) => (
            <Chip key={club} size="small" variant="outlined" label={club} />
          ))}
        </Stack>
      );
    };
    return [
      {
        field: 'name',
        headerName: t('partners.regional.clubAdmin'),
        flex: 1,
        minWidth: 220,
        cellRenderer: renderPerson,
        valueGetter: (row) => row.name || row.email,
      },
      {
        field: 'clubs',
        headerName: t('partners.regional.clubs'),
        flex: 1,
        minWidth: 240,
        sortable: false,
        cellRenderer: renderClubs,
        valueGetter: (row) => row.clubs.join(', '),
      },
      {
        field: 'club_count',
        headerName: t('partners.regional.clubCount'),
        width: 110,
        valueGetter: (row) => row.club_count,
      },
      actionsColumn<RegionMember>({
        onDelete: setPendingRemove,
        delete: { title: t('partners.regional.removeFromRegion') },
      }),
    ];
  }, [t]);

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

        <RegionNameCard region={data?.myRegion} onRenamed={afterWrite} />

        <DuncitTable<RegionMember>
          tableId="regional-club-admins"
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getRowId}
          emptyText={t('partners.regional.noMembersYet')}
          defaultSort={{ field: 'name', dir: 'asc' }}
          searchPlaceholder={t('partners.regional.searchMembers')}
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
      </Stack>

      <AddClubAdminDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={afterWrite}
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
