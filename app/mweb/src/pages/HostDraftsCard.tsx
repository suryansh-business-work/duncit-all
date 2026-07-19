import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ConfirmDialog from '../components/ConfirmDialog';
import { useDraftRetentionDays } from '../utils/dateFormat';
import { STEP_TITLES } from './create-pod-page/create-pod';

const MY_POD_DRAFTS = gql`
  query MyPodDrafts {
    myPodDrafts { id pod_title step updated_at }
  }
`;
const DELETE_POD_DRAFT = gql`
  mutation DeletePodDraft($draft_id: ID!) {
    deletePodDraft(draft_id: $draft_id)
  }
`;

function formatWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

/** Resumable Create Pod drafts for the signed-in host. */
export default function HostDraftsCard() {
  const { data, loading, refetch } = useQuery(MY_POD_DRAFTS, { fetchPolicy: 'cache-and-network' });
  const [deleteMut, { loading: deleting }] = useMutation(DELETE_POD_DRAFT);
  const [target, setTarget] = useState<string | null>(null);
  const retentionDays = useDraftRetentionDays();
  const drafts = data?.myPodDrafts ?? [];

  if (loading && !data) return null;
  if (drafts.length === 0) return null;

  const confirmDelete = async () => {
    if (!target) return;
    await deleteMut({ variables: { draft_id: target } });
    setTarget(null);
    await refetch();
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 4 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <EditNoteIcon color="primary" />
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 950 }}>
            Draft pods
          </Typography>
          <Chip size="small" label={drafts.length} />
        </Stack>
        <Divider sx={{ mb: 1.5 }} />
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          Draft Pods are automatically deleted after {retentionDays} days of being saved. Please
          publish your Pod before it expires.
        </Alert>
        <Stack spacing={1}>
          {drafts.map((draft: any) => {
            const stepLabel = STEP_TITLES[Math.min(draft.step ?? 0, STEP_TITLES.length - 1)];
            return (
              <Stack
                key={draft.id}
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ p: 1.25, borderRadius: 3, border: 1, borderColor: 'divider' }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={700} noWrap>
                    {draft.pod_title || 'Untitled pod'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    Step {Math.min((draft.step ?? 0) + 1, STEP_TITLES.length)}/{STEP_TITLES.length} · {stepLabel}
                    {formatWhen(draft.updated_at) ? ` · ${formatWhen(draft.updated_at)}` : ''}
                  </Typography>
                </Box>
                <Button
                  component={RouterLink}
                  to={`/create-pod/${draft.id}`}
                  size="small"
                  variant="outlined"
                  sx={{ borderRadius: 999, fontWeight: 900 }}
                >
                  Continue
                </Button>
                <IconButton aria-label="Delete draft" onClick={() => setTarget(draft.id)} size="small" color="error">
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            );
          })}
        </Stack>
      </CardContent>
      <ConfirmDialog
        open={!!target}
        title="Delete draft?"
        message="This in-progress pod will be permanently removed."
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setTarget(null)}
      />
    </Card>
  );
}
