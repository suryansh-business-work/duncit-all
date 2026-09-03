import {
  Alert,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { podAuditSourceLabel } from '@duncit/utils';
import { AuditActionChip, AuditRiskChip } from '../../components/club-admin/AuditChips';
import AuditChangesList from '../../components/club-admin/AuditChangesList';
import type { AuditEntry } from '../../components/club-admin/audit-entry';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  entry: AuditEntry | null;
  onClose: () => void;
}

/** Full detail of one monitored entry — verdict, actor, the AI summary and
 * the field-by-field diff behind it. */
export default function AuditLogDetailDialog({ entry, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();

  return (
    <Dialog open={!!entry} onClose={onClose} fullWidth maxWidth="sm">
      {entry && (
        <>
          <DialogTitle sx={{ fontWeight: 800 }}>{entry.pod_title || entry.pod_id}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <AuditActionChip action={entry.action} />
                <AuditRiskChip risk={entry.ai_risk} verbose />
                <Chip size="small" variant="outlined" label={podAuditSourceLabel(entry.source, t)} />
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {[
                  formatDateTime(entry.created_at),
                  entry.actor_name || t('clubAdmin.monitoring.unknownActor'),
                ].join(' · ')}
              </Typography>
              {entry.ai_summary && <Alert severity="info">{entry.ai_summary}</Alert>}
              <AuditChangesList changes={entry.changes} note={entry.note} heading />
            </Stack>
          </DialogContent>
          <DialogActions>
            <DuncitButton onClick={onClose}>{t('mweb.common.close')}</DuncitButton>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
