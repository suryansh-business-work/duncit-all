import { Link as RouterLink } from 'react-router-dom';
import { Alert, Stack, Tooltip } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ReplayIcon from '@mui/icons-material/Replay';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import type { PodHistoryItem } from './queries';

interface Props {
  item: PodHistoryItem;
  isDeleted: boolean;
  podDetailsPath: string;
  supportPath: string;
  /** From the shared participation rules — what this booking may still be offered. */
  canBackout: boolean;
  /** True once the server says this pod has no Backout attempts left. Absent
   * while that query is still open, which renders the same as "not maxed". */
  backoutMaxed?: boolean;
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
 * The Backout control, and the reason it is sometimes dead.
 *
 * Shown-and-disabled rather than hidden once the attempts are gone: a booking
 * that HAD this button yesterday and simply lacks it today reads as a bug, so
 * the control stays and says why. The words come from Pod Details, which
 * refuses the same booking for the same reason.
 */
function BackoutButton({
  disabled,
  maxed,
  label,
  onBackout,
}: Readonly<{ disabled: boolean; maxed: boolean; label: string; onBackout: () => void }>) {
  const { t } = useTranslation();
  const button = (
    <DuncitButton
      data-tour="booking-backout"
      onClick={onBackout}
      disabled={disabled || maxed}
      color="error"
      variant="outlined"
      startIcon={<RestartAltIcon />}
    >
      {label}
    </DuncitButton>
  );
  if (!maxed) return button;
  return (
    // A disabled button fires no pointer events of its own, so the tooltip
    // listens on a wrapper — otherwise hovering it says nothing at all.
    <Tooltip title={t('mweb.podDetails.backoutMaxed')} enterTouchDelay={0} arrow>
      <span style={{ display: 'inline-flex' }}>{button}</span>
    </Tooltip>
  );
}

/**
 * Everything this booking can still have done to it.
 *
 * Two of these are gated by the participation rules rather than by the
 * membership status, and both are absent rather than disabled when they do not
 * apply: a pod that has already happened cannot be backed out of, and a booking
 * nobody asked a refund for has no refund status to report. An action the pod
 * itself no longer allows is absent; one this person has simply run out of
 * stays put and explains itself.
 */
export default function PodHistoryActions({
  item,
  isDeleted,
  podDetailsPath,
  supportPath,
  canBackout,
  backoutMaxed = false,
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
          {t('mweb.podHistory.podRemovedNotice')}
        </Alert>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap sx={{
        flexWrap: "wrap"
      }}>
        {!isDeleted && (
          <>
            <DuncitButton
              component={RouterLink}
              to={podDetailsPath || '#'}
              disabled={!podDetailsPath}
              variant="contained"
              endIcon={<ArrowForwardIcon />}
            >
              {t('mweb.podHistory.goToPodDetails')}
            </DuncitButton>
            {canBackout && (
              <BackoutButton
                disabled={item.status !== 'JOINED' || backingOut}
                maxed={backoutMaxed}
                label={
                  backingOut ? t('mweb.podHistory.backingOut') : t('mweb.podHistory.backoutPod')
                }
                onBackout={onBackout}
              />
            )}
            {canRejoin && (
              <DuncitButton
                onClick={onRejoin}
                disabled={rejoining}
                color="success"
                variant="contained"
                startIcon={<ReplayIcon />}
              >
                {rejoining ? t('mweb.podHistory.rejoining') : t('mweb.podHistory.rejoinPod')}
              </DuncitButton>
            )}
            {showRefundState && (
              <DuncitButton variant="outlined" startIcon={<ReceiptLongIcon />} onClick={onShowRefundStatus}>
                {t('mweb.podHistory.refundChip', { vars: { status: refundLabel } })}
              </DuncitButton>
            )}
            {/* Shown-and-disabled rather than hidden, matching native: the same
                booking used to offer this control on one surface and not the
                other, which also made the tour one step shorter on mWeb. */}
            <DuncitButton
              data-tour="booking-ticket"
              onClick={onDownloadTicket}
              disabled={item.status !== 'JOINED' || ticketLoading}
              variant="contained"
              startIcon={<ConfirmationNumberIcon />}
              sx={{
                background: 'linear-gradient(90deg, #ff4f73 0%, #ff8b5f 100%)',
                fontWeight: 700,
              }}
            >
              {ticketLoading ? t('mweb.ticket.downloading') : t('mweb.ticket.download')}
            </DuncitButton>
          </>
        )}
        <DuncitButton
          onClick={onDownloadInvoice}
          disabled={!item.payment_id || invoiceLoading}
          variant="outlined"
          startIcon={<ReceiptLongIcon />}
        >
          {invoiceLoading ? t('mweb.podHistory.downloading') : t('mweb.podHistory.invoice')}
        </DuncitButton>
        <DuncitButton
          component={RouterLink}
          to={supportPath}
          variant="outlined"
          startIcon={<ContactSupportIcon />}
        >
          {t('mweb.podHistory.contactSupport')}
        </DuncitButton>
      </Stack>
    </>
  );
}
