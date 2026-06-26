import { useState } from 'react';
import { Chip, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import EmailIcon from '@mui/icons-material/Email';
import type { TicketStatus, TranscriptFormat } from '../queries';

const STATUS_COLOR: Record<TicketStatus, 'primary' | 'warning' | 'success' | 'default'> = {
  OPEN: 'primary',
  PENDING: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

interface Props {
  subject: string;
  status: TicketStatus | null;
  /** Resolve is offered only while the ticket is still open/pending (B7). */
  canResolve: boolean;
  onBack: () => void;
  onResolve: () => void;
  onDownload: (format: TranscriptFormat) => void;
  onEmail: () => void;
}

/** Ticket detail header — title, status chip and the export/resolve menu (B7/B15). */
export default function TicketHeader({
  subject,
  status,
  canResolve,
  onBack,
  onResolve,
  onDownload,
  onEmail,
}: Readonly<Props>) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const close = () => setAnchor(null);
  const run = (fn: () => void) => () => {
    close();
    fn();
  };

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <IconButton size="small" onClick={onBack} aria-label="Back" sx={{ bgcolor: 'action.hover' }}>
        <ArrowBackIcon />
      </IconButton>
      <Typography variant="h6" sx={{ fontWeight: 900, flex: 1 }} noWrap>
        {subject || 'Ticket'}
      </Typography>
      {status && <Chip size="small" color={STATUS_COLOR[status]} label={status} />}
      <IconButton aria-label="Ticket options" disabled={!status} onClick={(e) => setAnchor(e.currentTarget)}>
        <MoreVertIcon />
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
        {canResolve && (
          <MenuItem onClick={run(onResolve)}>
            <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} /> Mark as resolved
          </MenuItem>
        )}
        <MenuItem onClick={run(() => onDownload('TXT'))}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} /> Download .txt
        </MenuItem>
        <MenuItem onClick={run(() => onDownload('DOCX'))}>
          <DescriptionIcon fontSize="small" sx={{ mr: 1 }} /> Download .docx
        </MenuItem>
        <MenuItem onClick={run(onEmail)}>
          <EmailIcon fontSize="small" sx={{ mr: 1 }} /> Email transcript
        </MenuItem>
      </Menu>
    </Stack>
  );
}
