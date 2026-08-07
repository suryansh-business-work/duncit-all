import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, Stack } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ReplayIcon from '@mui/icons-material/Replay';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useTranslation } from '../../i18n/useTranslation';
import type { PodHistoryItem } from './queries';

interface Props {
  item: PodHistoryItem;
  isDeleted: boolean;
  podDetailsPath: string;
  supportPath: string;
  /** From the shared participation rules — what this booking may still be offered. */
  canBackout: boolean;
  showRefundState: boolean;
  refundLabel: string;
  canRejoin: boolean;
  backingOut: boolean;
  rejoining: boolean;
  ticketLoading: boolean;
  invoiceLoading: boolean;
  onBackout: () => void;
  onRejoin: () => void;
  onDownloadTicket: () => void;
  onDownloadInvoice: () => void;
  onShowRefundStatus: () => void;
}

/**
 * Everything this booking can still have done to it.
 *
 * Two of these are gated by the participation rules rather than by the
 * membership status, and both are absent rather than disabled when they do not
 * apply: a pod that has already happened cannot be backed out of, and a booking
 * nobody asked a refund for has no refund status to report. A disabled control
 * invites the question of how to enable it; an absent one does not.
 */
export default function PodHistoryActions({
  item,
  isDeleted,
  podDetailsPath,
  supportPath,
  canBackout,
  showRefundState,
  refundLabel,
  canRejoin,
  backingOut,
  rejoining,
  ticketLoading,
  invoiceLoading,
  onBackout,
  onRejoin,
  onDownloadTicket,
  onDownloadInvoice,
  onShowRefundStatus,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <>
      {isDeleted && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          This pod was removed. Your booking record stays here — download your invoice or contact
          support.
        </Alert>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
        {!isDeleted && (
          <>
            <Button
              component={RouterLink}
              to={podDetailsPath || '#'}
              disabled={!podDetailsPath}
              variant="contained"
              endIcon={<ArrowForwardIcon />}
            >
              Go to Pod Details
            </Button>
            {canBackout && (
              <Button
                onClick={onBackout}
                disabled={item.status !== 'JOINED' || backingOut}
                color="error"
                variant="outlined"
                startIcon={<RestartAltIcon />}
              >
                {backingOut ? 'Backing out...' : 'Backout Pod'}
              </Button>
            )}
            {canRejoin && (
              <Button
                onClick={onRejoin}
                disabled={rejoining}
                color="success"
                variant="contained"
                startIcon={<ReplayIcon />}
              >
                {rejoining ? 'Rejoining...' : 'Rejoin Pod'}
              </Button>
            )}
            {showRefundState && (
              <Button variant="outlined" startIcon={<ReceiptLongIcon />} onClick={onShowRefundStatus}>
                Refund Status: {refundLabel}
              </Button>
            )}
            {item.status === 'JOINED' && (
              <Button
                onClick={onDownloadTicket}
                disabled={ticketLoading}
                variant="contained"
                startIcon={<ConfirmationNumberIcon />}
                sx={{
                  background: 'linear-gradient(90deg, #ff4f73 0%, #ff8b5f 100%)',
                  fontWeight: 700,
                }}
              >
                {ticketLoading ? t('mweb.ticket.downloading') : t('mweb.ticket.download')}
              </Button>
            )}
          </>
        )}
        <Button
          onClick={onDownloadInvoice}
          disabled={!item.payment_id || invoiceLoading}
          variant="outlined"
          startIcon={<ReceiptLongIcon />}
        >
          {invoiceLoading ? 'Downloading...' : 'Invoice'}
        </Button>
        <Button
          component={RouterLink}
          to={supportPath}
          variant="outlined"
          startIcon={<ContactSupportIcon />}
        >
          Contact Support
        </Button>
      </Stack>
    </>
  );
}
