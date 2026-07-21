import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import {
  ACTION_COLORS,
  ACTION_LABELS,
  fmtWhen,
  RISK_COLORS,
  SOURCE_LABELS,
  type PodAuditLog,
} from './queries';

interface Props {
  log: PodAuditLog | null;
  onClose: () => void;
}

/** Full detail of one AI-monitored audit entry — actor, verdict and the
 * field-by-field change diff. Shared by the Admin + Partners monitoring pages. */
export default function PodAuditDetailDialog({ log, onClose }: Readonly<Props>) {
  return (
    <Dialog open={!!log} onClose={onClose} fullWidth maxWidth="sm">
      {log && (
        <>
          <DialogTitle sx={{ fontWeight: 900 }}>
            {ACTION_LABELS[log.action]} — {log.pod_title || log.pod_id}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={ACTION_LABELS[log.action]} color={ACTION_COLORS[log.action]} />
                <Chip size="small" label={`AI risk: ${log.ai_risk}`} color={RISK_COLORS[log.ai_risk]} />
                <Chip size="small" variant="outlined" label={SOURCE_LABELS[log.source]} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {fmtWhen(log.created_at)} · {log.actor_name || 'Unknown actor'}
              </Typography>
              {log.ai_summary && <Alert severity="info">{log.ai_summary}</Alert>}
              {log.note && (
                <Typography variant="body2">
                  <b>Note:</b> {log.note}
                </Typography>
              )}
              <Divider />
              <Typography variant="subtitle2" fontWeight={800}>
                Changes ({log.changes.length})
              </Typography>
              {log.changes.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No tracked field changed for this action.
                </Typography>
              )}
              {log.changes.map((change) => (
                <Stack key={change.field} spacing={0.25}>
                  <Typography variant="caption" fontWeight={800}>
                    {change.field}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'error.main', wordBreak: 'break-word' }}>
                    − {change.from || '(empty)'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'success.main', wordBreak: 'break-word' }}>
                    + {change.to || '(empty)'}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Close</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
