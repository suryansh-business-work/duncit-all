import { useState } from 'react';
import { Chip, Menu, MenuItem, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import EmailIcon from '@mui/icons-material/Email';
import { DuncitRoundButton } from '@duncit/buttons';
import type { TicketStatus, TranscriptFormat } from '../queries';
import { useTranslation } from '../../../i18n/useTranslation';
import { HEADER_BUTTON_SX as ROUND_SX } from '../../support-chat/calmStyles';

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
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const close = () => setAnchor(null);
  const run = (fn: () => void) => () => {
    close();
    fn();
  };

  return (
    <Stack data-testid="ticket-header" direction="row" spacing={1} sx={{
      alignItems: "center"
    }}>
      <DuncitRoundButton data-testid="ticket-header-back" onClick={onBack} aria-label={t('mweb.common.back')} sx={ROUND_SX}>
        <ArrowBackRoundedIcon />
      </DuncitRoundButton>
      <Typography
        data-testid="ticket-header-subject"
        component="h1"
        sx={{ fontSize: '1.0625rem', fontWeight: 600, flex: 1, minWidth: 0 }}
        noWrap
      >
        {subject || 'Ticket'}
      </Typography>
      {status && <Chip data-testid="ticket-header-status" size="small" color={STATUS_COLOR[status]} label={status} />}
      <DuncitRoundButton
        data-testid="ticket-header-menu-button"
        aria-label={t('mweb.supportTickets.ticketOptions')}
        disabled={!status}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={ROUND_SX}
      >
        <MoreHorizRoundedIcon />
      </DuncitRoundButton>
      <Menu data-testid="ticket-header-menu" anchorEl={anchor} open={!!anchor} onClose={close}>
        {canResolve && (
          <MenuItem data-testid="ticket-action-resolve" onClick={run(onResolve)}>
            <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} /> Mark as resolved
          </MenuItem>
        )}
        <MenuItem data-testid="ticket-action-download" onClick={run(() => onDownload('TXT'))}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} /> Download .txt
        </MenuItem>
        <MenuItem data-testid="ticket-action-download-docx" onClick={run(() => onDownload('DOCX'))}>
          <DescriptionIcon fontSize="small" sx={{ mr: 1 }} /> Download .docx
        </MenuItem>
        <MenuItem data-testid="ticket-action-email" onClick={run(onEmail)}>
          <EmailIcon fontSize="small" sx={{ mr: 1 }} /> Email transcript
        </MenuItem>
      </Menu>
    </Stack>
  );
}
