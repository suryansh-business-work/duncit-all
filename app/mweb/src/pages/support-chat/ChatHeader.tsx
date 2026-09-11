import { useState } from 'react';
import { Chip, Menu, MenuItem, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import EmailIcon from '@mui/icons-material/Email';
import { DuncitRoundButton } from '@duncit/buttons';
import type { TranscriptFormat } from './queries';
import { useTranslation } from '../../i18n/useTranslation';
import { HEADER_BUTTON_SX } from './calmStyles';

interface Props {
  ticketNo: string | null;
  status: 'OPEN' | 'CLOSED' | null;
  /** Whether the closed chat is still within the server reopen window. */
  reopenable: boolean;
  onBack: () => void;
  onResolve: () => void;
  onReopen: () => void;
  onDownload: (format: TranscriptFormat) => void;
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
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const close = () => setAnchor(null);
  const run = (fn: () => void) => () => {
    close();
    fn();
  };

  return (
    <Stack direction="row" spacing={1} sx={{
      alignItems: "center"
    }}>
      <DuncitRoundButton onClick={onBack} aria-label={t('mweb.common.back')} sx={HEADER_BUTTON_SX}>
        <ArrowBackRoundedIcon />
      </DuncitRoundButton>
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography component="h1" sx={{ fontSize: '1.0625rem', fontWeight: 600, lineHeight: 1.2 }} noWrap>
          Chat with Us
        </Typography>
        {ticketNo && (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
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
      <DuncitRoundButton aria-label={t('mweb.supportChat.chatOptions')} disabled={!ticketNo} onClick={(e) => setAnchor(e.currentTarget)} sx={HEADER_BUTTON_SX}>
        <MoreHorizRoundedIcon />
      </DuncitRoundButton>
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
