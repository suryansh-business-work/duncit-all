import { useState } from 'react';
import { IconButton, MenuItem, TextField, Tooltip, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import { ConfirmDialog } from '@duncit/dialogs';
import { BackHeader } from '@duncit/ui';
import TranscriptMenu from '../../../components/TranscriptMenu';
import type { Ticket, TicketPriority, TicketStatus, TranscriptFormat } from '../../../graphql/tickets';
import { useTranslation } from '@duncit/shell';

const STATUSES: TicketStatus[] = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['HIGH', 'MEDIUM', 'LOW'];
const RESOLVED = new Set<TicketStatus>(['RESOLVED', 'CLOSED']);

interface Props {
  ticket: Ticket;
  onBack: () => void;
  onStatus: (status: TicketStatus) => void;
  onPriority: (priority: TicketPriority) => void;
  onResolve: () => void;
  onReopen: () => void;
  onDownload: (format: TranscriptFormat) => void;
  onEmail: (email: string) => void;
}

/** Ticket detail header: subject + ticket no + status/priority setters + resolve / re-open + export. */
export default function TicketHeader({ ticket, onBack, onStatus, onPriority, onResolve, onReopen, onDownload, onEmail }: Readonly<Props>) {
  const { t } = useTranslation();
  const [confirmResolve, setConfirmResolve] = useState(false);
  const isResolved = RESOLVED.has(ticket.status);

  return (
    <>
      <BackHeader
        onBack={onBack}
        eyebrow={
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
            {ticket.ticket_no}
          </Typography>
        }
        title={ticket.subject}
        titleWeight={800}
        titleNoWrap
        actions={
          <>
            {isResolved ? (
              <Tooltip title={t('support.tickets.reopen')}>
                <IconButton size="small" color="primary" aria-label={t('support.tickets.reopen')} onClick={onReopen}>
                  <ReplayIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title={t('support.tickets.markResolved')}>
                <IconButton size="small" color="success" aria-label={t('support.tickets.markResolved')} onClick={() => setConfirmResolve(true)}>
                  <CheckCircleIcon />
                </IconButton>
              </Tooltip>
            )}

            <TranscriptMenu onDownload={onDownload} onEmail={onEmail} />

            <TextField
              select
              size="small"
              label={t('support.tickets.priority')}
              value={ticket.priority}
              onChange={(e) => onPriority(e.target.value as TicketPriority)}
              sx={{ minWidth: 120 }}
            >
              {PRIORITIES.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label={t('shell.common.status')}
              value={ticket.status}
              onChange={(e) => onStatus(e.target.value as TicketStatus)}
              sx={{ minWidth: 130 }}
            >
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </>
        }
      />

      <ConfirmDialog
        open={confirmResolve}
        title={t('support.tickets.resolveTitle')}
        message={t('support.tickets.resolveBody')}
        confirmLabel={t('support.tickets.markResolved')}
        confirmColor="success"
        titleSx={{ fontWeight: 800 }}
        onConfirm={() => {
          setConfirmResolve(false);
          onResolve();
        }}
        onClose={() => setConfirmResolve(false)}
      />
    </>
  );
}
