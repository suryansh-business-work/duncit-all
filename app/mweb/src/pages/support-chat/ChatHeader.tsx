import { useState } from 'react';
import { Chip, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';

interface Props {
  ticketNo: string | null;
  status: 'OPEN' | 'CLOSED' | null;
  /** Whether the closed chat is still within the server reopen window. */
  reopenable: boolean;
  onBack: () => void;
  onResolve: () => void;
  onReopen: () => void;
  onDownload: () => void;
  onEmail: () => void;
}

export default function ChatHeader({
  ticketNo,
  status,
  reopenable,
  onBack,
  onResolve,
  onReopen,
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
      <SupportAgentIcon color="primary" />
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }} noWrap>
          Chat with Us
        </Typography>
        {ticketNo && (
          <Typography variant="caption" color="text.secondary">
            {ticketNo}
          </Typography>
        )}
      </Stack>
      {status && (
        <Chip
          size="small"
          color={status === 'OPEN' ? 'success' : 'default'}
          label={status === 'OPEN' ? 'Open' : 'Resolved'}
        />
      )}
      <IconButton aria-label="Chat options" disabled={!ticketNo} onClick={(e) => setAnchor(e.currentTarget)}>
        <MoreVertIcon />
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
        {status === 'OPEN' ? (
          <MenuItem onClick={run(onResolve)}>
            <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} /> Mark resolved
          </MenuItem>
        ) : (
          <MenuItem onClick={run(onReopen)} disabled={!reopenable}>
            <ReplayIcon fontSize="small" sx={{ mr: 1 }} /> Re-open chat
          </MenuItem>
        )}
        <MenuItem onClick={run(onDownload)}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} /> Download .txt
        </MenuItem>
        <MenuItem onClick={run(onEmail)}>
          <EmailIcon fontSize="small" sx={{ mr: 1 }} /> Email transcript
        </MenuItem>
      </Menu>
    </Stack>
  );
}
