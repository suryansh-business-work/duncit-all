import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import type { MarketingCampaignRow } from './queries';

interface Props {
  rows: MarketingCampaignRow[];
  loading: boolean;
  sending: boolean;
  onSend: (campaignId: string) => void;
}

const statusColor = (status: string) => {
  if (status === 'SENT') return 'success';
  if (status === 'FAILED') return 'error';
  if (status === 'SCHEDULED') return 'info';
  if (status === 'SENDING') return 'warning';
  return 'default';
};

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : '—');

export default function CampaignTable({ rows, loading, sending, onSend }: Readonly<Props>) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Campaign</TableCell>
              <TableCell>Channel</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Card</TableCell>
              <TableCell>Schedule</TableCell>
              <TableCell>Sent</TableCell>
              <TableCell align="right">Recipients</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.campaign_id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>{row.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{row.subject}</Typography>
                  {row.error && <Typography variant="caption" color="error" display="block">{row.error}</Typography>}
                </TableCell>
                <TableCell><Chip size="small" label={row.channel === 'WHATSAPP' ? 'WhatsApp Email Fallback' : 'Email'} /></TableCell>
                <TableCell><Chip size="small" color={statusColor(row.status) as any} label={row.status} /></TableCell>
                <TableCell>{row.card?.title || '—'}</TableCell>
                <TableCell>{formatDate(row.scheduled_at)}</TableCell>
                <TableCell>{formatDate(row.sent_at)}</TableCell>
                <TableCell align="right">{row.recipient_count}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Send campaign now">
                    <span>
                      <Button size="small" startIcon={<SendIcon />} disabled={sending || row.status === 'SENT' || row.status === 'SENDING'} onClick={() => onSend(row.campaign_id)}>
                        Send
                      </Button>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow><TableCell colSpan={8} align="center">No campaigns yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}