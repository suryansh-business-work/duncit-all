import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { parseApiError } from '@duncit/utils';
import type { GrievanceStatus } from '@duncit/utils';
import {
  GRIEVANCE_STATUS_OPTIONS,
  UPDATE_GRIEVANCE_STATUS,
  type GrievanceTicket,
} from '../../graphql/grievance';
import GrievanceFactRow from './GrievanceFactRow';
import { useTranslation } from '@duncit/shell';

interface Props {
  ticket: GrievanceTicket | null;
  formatDateTime: (value: Date) => string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * One grievance, and the only two things staff can change about it.
 *
 * What the complainant wrote is shown but never editable — a grievance record
 * that staff can rewrite is not a record. The status and the resolution note
 * are the response, and they live together because moving a grievance to
 * Resolved without saying why is how a queue becomes untrustworthy.
 */
export default function GrievanceDetailDialog({
  ticket,
  formatDateTime,
  onClose,
  onSaved,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<GrievanceStatus>('RECEIVED');
  const [resolution, setResolution] = useState('');
  const [error, setError] = useState('');
  const [save, { loading }] = useMutation(UPDATE_GRIEVANCE_STATUS);

  // Re-seed on every open: one dialog instance serves every row.
  useEffect(() => {
    if (!ticket) return;
    setStatus(ticket.status);
    setResolution(ticket.resolution ?? '');
    setError('');
  }, [ticket]);

  const apply = async () => {
    try {
      await save({ variables: { id: ticket?.id, input: { status, resolution } } });
      onSaved();
      onClose();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const received = ticket?.created_at ? formatDateTime(new Date(ticket.created_at)) : '—';
  const closed = ticket?.resolved_at ? formatDateTime(new Date(ticket.resolved_at)) : '';

  return (
    <Dialog open={!!ticket} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        Grievance
        <Typography variant="caption" component="div" sx={{
          color: "text.secondary"
        }}>
          {ticket?.grievance_no}
        </Typography>
        <IconButton
          onClick={onClose}
          aria-label={t('shell.common.close')}
          sx={{ position: 'absolute', right: 8, top: 8, color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <Stack spacing={1}>
            <GrievanceFactRow label={t('shell.common.name')} value={ticket?.name ?? ''} />
            <GrievanceFactRow label={t('shell.common.email')} value={ticket?.email ?? ''} />
            <GrievanceFactRow label={t('shell.common.phone')} value={ticket?.phone ?? ''} />
            <GrievanceFactRow label={t('legal.grievance.address')} value={ticket?.address ?? ''} />
            {/* The escalation this grievance stands on. A blank one is the
                ground for rejecting it, so it says so in words rather than
                showing the em-dash every other empty fact shows. */}
            <GrievanceFactRow
              label={t('legal.grievance.colSupportTicket')}
              value={ticket?.support_ticket_ref || t('legal.grievance.noSupportTicket')}
            />
            <GrievanceFactRow label={t('legal.grievance.colReceived')} value={received} />
            {closed && <GrievanceFactRow label={t('legal.grievance.closed')} value={closed} />}
            {ticket?.handled_by_name && (
              <GrievanceFactRow label={t('legal.grievance.handledBy')} value={ticket.handled_by_name} />
            )}
          </Stack>

          <Divider />

          <Stack spacing={0.5}>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              Subject
            </Typography>
            <Typography variant="body2" sx={{
              fontWeight: 700
            }}>
              {ticket?.subject}
            </Typography>
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              What they told us
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {ticket?.description}
            </Typography>
          </Stack>

          <Divider />

          <TextField
            select
            label={t('shell.common.status')}
            value={status}
            onChange={(e) => setStatus(e.target.value as GrievanceStatus)}
            fullWidth
          >
            {GRIEVANCE_STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label={t('legal.grievance.resolutionNote')}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            helperText={t('legal.grievance.resolutionHint')}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('shell.common.close')}</Button>
        <Button variant="contained" onClick={apply} disabled={loading}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
