import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { QueryGuard } from '@duncit/ui';
import { notifyError } from '@duncit/dialogs';
import BugDetailBody from '../bugs-page/BugDetailBody';
import {
  BUG_BY_ID,
  STATUS_OPTIONS,
  UPDATE_BUG_STATUS,
  statusColor,
  type BugRow,
  type BugStatus,
} from '../bugs-page/queries';

/**
 * One bug, at its own address.
 *
 * A bug is the unit of triage: it gets read, argued about and handed to
 * somebody else. A dialog cannot be any of those things — closing the tab
 * loses it and there is nothing to paste into a chat. `/telemetry/bugs/:bugId`
 * survives a reload, a bookmark and a forward.
 */
export default function BugDetailPage() {
  const { bugId = '' } = useParams();
  const navigate = useNavigate();
  const [updateStatus] = useMutation(UPDATE_BUG_STATUS);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, refetch } = useQuery<{ bug: BugRow | null }>(BUG_BY_ID, {
    variables: { id: bugId },
    fetchPolicy: 'cache-and-network',
    skip: !bugId,
  });
  const bug = data?.bug ?? null;

  const changeStatus = async (status: BugStatus) => {
    if (!bug) return;
    setBusy(true);
    try {
      await updateStatus({ variables: { bug_id: bug.id, status } });
      await refetch();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to update bug');
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/telemetry/bugs')}>
        Bugs
      </Button>
      {bug ? <Chip size="small" label={bug.status} color={statusColor(bug.status)} /> : null}
      <Typography variant="h6" fontWeight={700} sx={{ wordBreak: 'break-word', flex: 1 }}>
        {bug?.title ?? 'Bug'}
      </Typography>
    </Stack>
  );

  return (
    <Stack spacing={3}>
      {header}
      <QueryGuard loading={loading && !bug} error={error} errorText={error?.message} spinnerSx={{ py: 6 }}>
        {bug ? (
          <>
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
              <BugDetailBody bug={bug} />
            </Paper>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {STATUS_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={opt.value === bug.status ? 'contained' : 'outlined'}
                  disabled={busy || opt.value === bug.status}
                  onClick={() => changeStatus(opt.value)}
                >
                  Mark {opt.label}
                </Button>
              ))}
              <Box sx={{ flexGrow: 1 }} />
            </Stack>
          </>
        ) : (
          // A bug that was deleted, or a pasted id from another environment.
          <Alert severity="warning">
            That bug no longer exists — it may have been deleted or cleared by the retention window.
          </Alert>
        )}
      </QueryGuard>
    </Stack>
  );
}
