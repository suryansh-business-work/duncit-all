import { useCallback, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Link as RouterLink, useParams } from 'react-router';
import { Alert, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { DuncitButton } from '@duncit/buttons';
import { CLUB_ADMIN_POD_LOOKUPS, CLUB_ADMIN_PODS_TABLE } from '@duncit/pod-form';
import { useDebouncedValue } from '@duncit/ui';
import type { PodRowStatusFilter } from '@duncit/utils';
import ConfirmDialog from '../../components/ConfirmDialog';
import StudioPageHeader from '../../components/StudioPageHeader';
import PagedListBody from '../../components/club-admin/PagedListBody';
import { usePagedRows } from '../../components/club-admin/usePagedRows';
import ClubPodActivityDialog from './ClubPodActivityDialog';
import ClubPodRow from './ClubPodRow';
import ClubPodsFilters from './ClubPodsFilters';
import { useDeletePod } from './useDeletePod';
import type { ClubAdminPodRow } from './types';
import { useTranslation } from '../../i18n/useTranslation';

const PAGE_SIZE = 20;

/**
 * The pods of one club the signed-in admin runs — every stage, cancelled and
 * awaiting-venue included, so each stays reachable to edit. Scope is the
 * server's: `clubAdminPodsTable` resolves the caller's own membership and
 * throws for a club they do not administer. Native twin: ClubPods (rule 27).
 */
export default function ClubPodsPage() {
  const { t } = useTranslation();
  const { clubId = '' } = useParams();
  const podsPath = `/clubs/${clubId}/pods`;
  const lookups = useQuery<any>(CLUB_ADMIN_POD_LOOKUPS, { fetchPolicy: 'cache-and-network' });
  const club = (lookups.data?.myAdminClubs ?? []).find((item: any) => item.id === clubId);

  const [status, setStatus] = useState<PodRowStatusFilter>('');
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim(), 300);
  const variables = useCallback(
    (page: number) => ({
      club_id: clubId,
      status: status || null,
      query: {
        page,
        page_size: PAGE_SIZE,
        search: term || undefined,
        sort_by: 'pod_date_time',
        sort_dir: 'desc',
      },
    }),
    [clubId, status, term],
  );
  const list = usePagedRows<ClubAdminPodRow>({
    document: CLUB_ADMIN_PODS_TABLE,
    field: 'clubAdminPodsTable',
    variables,
  });
  const [activityPod, setActivityPod] = useState<ClubAdminPodRow | null>(null);
  const del = useDeletePod(list.reload);

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <StudioPageHeader
        icon={<EventNoteIcon fontSize="small" />}
        title={club?.club_name ?? t('clubAdmin.pods.clubPods')}
        caption={t('clubAdmin.pods.createEditDelete')}
        action={
          <DuncitButton
            component={RouterLink}
            to={`${podsPath}/new`}
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            sx={{ borderRadius: 999, fontWeight: 700, flexShrink: 0 }}
          >
            {t('clubAdmin.pods.newPod')}
          </DuncitButton>
        }
      />
      {lookups.error && <Alert severity="error">{lookups.error.message}</Alert>}

      <ClubPodsFilters search={search} onSearch={setSearch} status={status} onStatus={setStatus} />

      <PagedListBody
        loading={list.loading}
        error={list.error}
        count={list.rows.length}
        hasMore={list.hasMore}
        emptyText={t('clubAdmin.pods.noPods')}
        onLoadMore={list.loadMore}
      >
        {list.rows.map((pod) => (
          <ClubPodRow
            key={pod.id}
            pod={pod}
            podsPath={podsPath}
            onActivity={setActivityPod}
            onDelete={del.ask}
          />
        ))}
      </PagedListBody>

      <ClubPodActivityDialog pod={activityPod} onClose={() => setActivityPod(null)} />

      <ConfirmDialog
        open={!!del.target}
        title={t('clubAdmin.pods.deletePodConfirmTitle')}
        message={t('clubAdmin.pods.deletePodConfirmBody', {
          vars: { title: del.target?.pod_title ?? '' },
        })}
        confirmLabel={t('mweb.common.delete')}
        destructive
        busy={del.busy}
        onConfirm={del.confirm}
        onClose={del.cancel}
      />
    </Stack>
  );
}
