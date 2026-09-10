import {
  Alert,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  POD_AUDIT_ACTION_COLORS,
  POD_AUDIT_RISK_COLORS,
  podAuditActionLabel,
  podAuditRiskLabel,
  podAuditSourceLabel,
  type PodAuditLog,
} from '@duncit/utils';
import { fmtWhen } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  log: PodAuditLog | null;
  onClose: () => void;
}

/** Full detail of one AI-monitored audit entry — actor, verdict and the
 * field-by-field change diff. Shared by the Admin + Partners monitoring pages. */
export default function PodAuditDetailDialog({ log, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const emptyValue = t('clubAdmin.monitoring.emptyValue');
  return (
    <Dialog open={!!log} onClose={onClose} fullWidth maxWidth="sm">
      {log && (
        <>
          <DialogTitle sx={{ fontWeight: 900 }}>
            {podAuditActionLabel(log.action, t)} — {log.pod_title || log.pod_id}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} useFlexGap sx={{
                flexWrap: "wrap"
              }}>
                <Chip
                  size="small"
                  label={podAuditActionLabel(log.action, t)}
                  color={POD_AUDIT_ACTION_COLORS[log.action]}
                />
                <Chip
                  size="small"
                  label={t('clubAdmin.monitoring.aiRiskChip', { vars: { risk: podAuditRiskLabel(log.ai_risk, t) } })}
                  color={POD_AUDIT_RISK_COLORS[log.ai_risk]}
                />
                <Chip size="small" variant="outlined" label={podAuditSourceLabel(log.source, t)} />
              </Stack>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {fmtWhen(log.created_at)} · {log.actor_name || t('clubAdmin.monitoring.unknownActor')}
              </Typography>
              {log.ai_summary && <Alert severity="info">{log.ai_summary}</Alert>}
              {log.note && (
                <Typography variant="body2">
                  <b>{t('clubAdmin.monitoring.note')}</b> {log.note}
                </Typography>
              )}
              <Divider />
              <Typography variant="subtitle2" sx={{
                fontWeight: 800
              }}>
                {t('clubAdmin.monitoring.changesCount', { vars: { total: log.changes.length } })}
              </Typography>
              {log.changes.length === 0 && (
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  {t('clubAdmin.monitoring.noChanges')}
                </Typography>
              )}
              {log.changes.map((change) => (
                <Stack key={change.field} spacing={0.25}>
                  <Typography variant="caption" sx={{
                    fontWeight: 800
                  }}>
                    {change.field}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'error.main', wordBreak: 'break-word' }}>
                    − {change.from || emptyValue}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'success.main', wordBreak: 'break-word' }}>
                    + {change.to || emptyValue}
                  </Typography>
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
