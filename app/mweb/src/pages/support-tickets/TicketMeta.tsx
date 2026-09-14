import { Chip, Paper, Stack, Typography } from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import { useDateFormat } from '../../utils/dateFormat';
import type { TicketDetail, TicketPriority } from './queries';
import { useTranslation } from '../../i18n/useTranslation';
import { SURFACE_SX } from '../../theme';

const PRIORITY_COLOR: Record<TicketPriority, 'default' | 'warning' | 'error'> = {
  LOW: 'default',
  MEDIUM: 'warning',
  HIGH: 'error',
};

function Field({
  label,
  value,
  'data-testid': testId,
}: Readonly<{ label: string; value: string; 'data-testid': string }>) {
  return (
    <Stack data-testid={testId} sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontWeight: 600
        }}>
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
    <Paper data-testid="ticket-meta" sx={{ ...SURFACE_SX, p: 2 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          mb: 1
        }}>
        <Typography
          data-testid="ticket-meta-category"
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 600,
            flex: 1
          }}>
          {ticket.category}
        </Typography>
        <Chip
          data-testid="ticket-meta-priority"
          size="small"
          icon={<FlagIcon />}
          color={PRIORITY_COLOR[ticket.priority]}
          label={ticket.priority}
        />
      </Stack>
      <Stack direction="row" spacing={2}>
        <Field
          data-testid="ticket-meta-raised"
          label={t('mweb.common.raised')}
          value={formatDateTime(ticket.created_at)}
        />
        <Field
          data-testid="ticket-meta-updated"
          label={t('mweb.common.lastUpdated')}
          value={formatDateTime(lastUpdated)}
        />
      </Stack>
    </Paper>
  );
}
