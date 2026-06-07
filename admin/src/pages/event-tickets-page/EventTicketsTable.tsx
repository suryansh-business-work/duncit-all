import {
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { EventTicketRow } from './queries';

interface Props {
  loading: boolean;
  tickets: EventTicketRow[];
  onDownload: (t: EventTicketRow) => void;
  onCheckIn: (t: EventTicketRow) => void;
}

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'default'> = {
  VALID: 'warning',
  CHECKED_IN: 'success',
  CANCELLED: 'default',
};

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function EventTicketsTable({ loading, tickets, onDownload, onCheckIn }: Props) {
  if (loading && tickets.length === 0)
    return (
      <Stack alignItems="center" sx={{ p: 4 }}>
        <CircularProgress />
      </Stack>
    );
  if (tickets.length === 0)
    return (
      <Typography color="text.secondary" sx={{ p: 3 }}>
        No tickets yet.
      </Typography>
    );

  return (
    <Card>
      <CardContent sx={{ p: 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ticket</TableCell>
              <TableCell>Event</TableCell>
              <TableCell>Attendee</TableCell>
              <TableCell>When</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>
                  <Typography fontWeight={800}>{t.ticket_code}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {t.pod_title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t.pod_mode === 'VIRTUAL' ? 'Virtual' : t.venue_name || t.zone_name || 'Physical'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{t.user_name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t.user_email}
                  </Typography>
                </TableCell>
                <TableCell>{fmt(t.pod_date_time)}</TableCell>
                <TableCell>
                  <Chip size="small" color={STATUS_COLOR[t.status] ?? 'default'} label={t.status.replace('_', ' ')} />
                  {t.checked_in_at && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {fmt(t.checked_in_at)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Download ticket">
                    <IconButton size="small" onClick={() => onDownload(t)} aria-label="Download ticket">
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t.status === 'CHECKED_IN' ? 'Checked in' : 'Check in'}>
                    <span>
                      <IconButton
                        size="small"
                        color="success"
                        disabled={t.status !== 'VALID'}
                        onClick={() => onCheckIn(t)}
                        aria-label="Check in"
                      >
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
