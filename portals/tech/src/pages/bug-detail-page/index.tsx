import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitButton } from '@duncit/buttons';
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
import { useTranslation } from '@duncit/app-settings';

/**
 * One bug, at its own address.
 *
 * A bug is the unit of triage: it gets read, argued about and handed to
 * somebody else. A dialog cannot be any of those things — closing the tab
 * loses it and there is nothing to paste into a chat. `/telemetry/bugs/:bugId`
 * survives a reload, a bookmark and a forward.
 */
export default function BugDetailPage() {
  const { t } = useTranslation();
  const { bugId = '' } = useParams();
  const navigate = useNavigate();
  const [updateStatus] = useMutation<any>(UPDATE_BUG_STATUS);
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
      notifyError(e instanceof Error ? e.message : t('tech.bugDetail.failedToUpdateBug'));
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        alignItems: "center",
        flexWrap: "wrap"
      }}>
      <DuncitButton startIcon={<ArrowBackIcon />} onClick={() => navigate('/telemetry/bugs')}>
        Bugs
      </DuncitButton>
      {bug ? <Chip size="small" label={bug.status} color={statusColor(bug.status)} /> : null}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          wordBreak: 'break-word',
          flex: 1
        }}>
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
            <Stack direction="row" spacing={1} useFlexGap sx={{
              flexWrap: "wrap"
            }}>
              {STATUS_OPTIONS.map((opt) => (
                <DuncitButton
                  key={opt.value}
                  variant={opt.value === bug.status ? 'contained' : 'outlined'}
                  disabled={busy || opt.value === bug.status}
                  onClick={() => changeStatus(opt.value)}
                >
                  Mark {opt.label}
                </DuncitButton>
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
