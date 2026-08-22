import { Chip, Paper, Stack, Typography } from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import { useDateFormat } from '../../utils/dateFormat';
import type { TicketDetail, TicketPriority } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

const PRIORITY_COLOR: Record<TicketPriority, 'default' | 'warning' | 'error'> = {
  LOW: 'default',
  MEDIUM: 'warning',
  HIGH: 'error',
};

function Field({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Stack sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" noWrap>
        {value}
      </Typography>
    </Stack>
  );
}

/** Ticket metadata header — priority, raised-at and last-updated (Bug 1). */
export default function TicketMeta({ ticket }: Readonly<{ ticket: TicketDetail }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const lastUpdated = ticket.last_message_at || ticket.updated_at;

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '16px' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, flex: 1 }}>
          {ticket.category}
        </Typography>
        <Chip
          size="small"
          icon={<FlagIcon />}
          color={PRIORITY_COLOR[ticket.priority]}
          label={ticket.priority}
        />
      </Stack>
      <Stack direction="row" spacing={2}>
        <Field label={t('mweb.common.raised')} value={formatDateTime(ticket.created_at)} />
        <Field label={t('mweb.common.lastUpdated')} value={formatDateTime(lastUpdated)} />
      </Stack>
    </Paper>
  );
}
