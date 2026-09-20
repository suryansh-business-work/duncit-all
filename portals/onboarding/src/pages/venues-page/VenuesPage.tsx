import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog } from '@duncit/dialogs';
import HardDeleteDialog from '../../components/HardDeleteDialog';
import { useEntityLifecycle } from '../../components/useEntityLifecycle';
import {
  APPROVE,
  DELETE_VENUE,
  REJECT,
  SET_VENUE_ACTIVE,
  VENUES_TABLE,
  type VenueRow,
} from './queries';
import VenueEditDialog from './VenueEditDialog';
import VenueReviewDialog from './VenueReviewDialog';
import VenuesTable from './VenuesTable';
import { useTranslation } from '@duncit/app-settings';

export default function VenuesPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => refetchRef.current?.(), []);
  const [approve] = useMutation<any>(APPROVE);
  const [reject] = useMutation<any>(REJECT);
  const lifecycle = useEntityLifecycle(SET_VENUE_ACTIVE, DELETE_VENUE, refresh);
  const [active, setActive] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [editing, setEditing] = useState<any>(null);

  const fetchRows = useApolloTableFetch<VenueRow>(client, VENUES_TABLE, 'venuesTable');

  const parseTags = () =>
    tagsText.split(',').map((tag) => tag.trim()).filter(Boolean);

  const openReview = (venue: any) => {
    setActive(venue);
    setTagsText((venue.tags ?? []).join(', '));
  };

  const doApprove = async () => {
    await approve({ variables: { id: active.id, notes, tags: parseTags() } });
    setActive(null);
    setNotes('');
    setTagsText('');
    refresh();
  };
  const doReject = async () => {
    if (!notes.trim()) return;
    await reject({ variables: { id: active.id, notes } });
    setActive(null);
    setNotes('');
    setTagsText('');
    refresh();
  };

  return (
    <Box>
      <Stack spacing={0.25} sx={{
        mb: 2
      }}>
        <Typography variant="h5" component="h1" sx={{
          fontWeight: 700
        }}>{t('onboarding.venues.registeredVenues')}</Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Review submitted venue requests and manage approved spaces for clubs, pods and meetups.
        </Typography>
      </Stack>

      <VenuesTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onEdit={setEditing}
        onReview={openReview}
        canHardDelete={lifecycle.canHardDelete}
        onToggleActive={lifecycle.setToggleTarget}
        onDelete={lifecycle.setDeleteTarget}
      />

      <ConfirmDialog
        open={!!lifecycle.toggleTarget}
        title={lifecycle.toggleTarget?.is_active === false ? 'Activate venue' : 'Deactivate venue'}
        message={
          lifecycle.toggleTarget?.is_active === false
            ? 'This venue will become available again for pod creation and public discovery.'
            : 'This venue will stop appearing when creating pods and in public listings. You can reactivate it anytime.'
        }
        confirmLabel={lifecycle.toggleTarget?.is_active === false ? 'Activate' : 'Deactivate'}
        confirmColor={lifecycle.toggleTarget?.is_active === false ? 'success' : 'warning'}
        loading={lifecycle.toggling}
        busyLabel="Working…"
        onClose={() => lifecycle.setToggleTarget(null)}
        onConfirm={lifecycle.confirmToggle}
      />

      <HardDeleteDialog
        open={!!lifecycle.deleteTarget}
        entityLabel="venue"
        entityName={lifecycle.deleteTarget?.venue_name ?? ''}
        loading={lifecycle.deleting}
        error={lifecycle.deleteError}
        onClose={lifecycle.closeDelete}
        onConfirm={lifecycle.confirmDelete}
      />

      <VenueReviewDialog
        active={active}
        notes={notes}
        setNotes={setNotes}
        tagsText={tagsText}
        setTagsText={setTagsText}
        onClose={() => setActive(null)}
        onApprove={doApprove}
        onReject={doReject}
        onSaved={refresh}
      />

      <VenueEditDialog venue={editing} onClose={() => setEditing(null)} onSaved={refresh} />
    </Box>
  );
}
