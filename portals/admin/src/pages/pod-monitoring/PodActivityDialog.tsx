import { useQuery } from '@apollo/client';
import {
  Alert,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { StatusChip } from '@duncit/ui';
import {
  ACTION_COLORS,
  ACTION_LABELS,
  fmtWhen,
  POD_AUDIT_LOGS,
  RISK_COLORS,
  SOURCE_LABELS,
  type PodAuditLog,
} from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  pod: { id: string; pod_title: string } | null;
  onClose: () => void;
}

/** AI-monitored action trail of one pod — every edit, status change and
 * critical action, with the risk verdict the monitor assigned it. Shares the
 * audit vocabulary with the Pod Monitoring page so the two cannot drift.
 * Portal-local twin of the Partners console dialog, per the monitoring-page
 * pattern. */
export default function PodActivityDialog({ pod, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(POD_AUDIT_LOGS, {
    variables: { pod_doc_id: pod?.id },
    skip: !pod,
    fetchPolicy: 'cache-and-network',
  });
  const entries: PodAuditLog[] = data?.podAuditLogs ?? [];

  return (
    <Dialog open={!!pod} onClose={onClose} maxWidth="sm" fullWidth>
      {pod && (
        <>
          <DialogTitle sx={{ fontWeight: 800 }}>Activity · {pod.pod_title}</DialogTitle>
          <DialogContent dividers>
            {error && <Alert severity="error">{error.message}</Alert>}
            {!error && loading && entries.length === 0 && <CircularProgress size={22} />}
            {!error && !loading && entries.length === 0 && (
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                No recorded activity for this pod yet.
              </Typography>
            )}
            <Stack spacing={1.75}>
              {entries.map((entry) => (
                <Stack key={entry.id} direction="row" spacing={1.25} sx={{
                  alignItems: "flex-start"
                }}>
                  <StatusChip
                    status={entry.action}
                    label={ACTION_LABELS[entry.action]}
                    colorMap={ACTION_COLORS}
                    sx={{ mt: 0.25 }}
                  />
                  <Stack sx={{ minWidth: 0, flex: 1 }}>
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      sx={{
                        alignItems: "center",
                        flexWrap: "wrap"
                      }}>
                      <Typography variant="body2" sx={{
                        fontWeight: 700
                      }}>
                        {entry.actor_name || SOURCE_LABELS[entry.source]}
                      </Typography>
                      <Chip label={SOURCE_LABELS[entry.source]} size="small" variant="outlined" />
                      <StatusChip status={entry.ai_risk} colorMap={RISK_COLORS} />
                    </Stack>
                    {entry.changes.map((change) => (
                      <Typography key={change.field} variant="caption" sx={{
                        color: "text.secondary"
                      }}>
                        {change.field}: {change.from || '—'} → {change.to || '—'}
                      </Typography>
                    ))}
                    {entry.note && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          whiteSpace: 'pre-wrap'
                        }}>
                        {entry.note}
                      </Typography>
                    )}
                    {entry.ai_summary && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          fontStyle: "italic"
                        }}>
                        AI: {entry.ai_summary}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{
                      color: "text.secondary"
                    }}>
                      {fmtWhen(entry.created_at)}
                    </Typography>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
