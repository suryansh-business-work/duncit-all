import { Alert, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useUserData } from '@duncit/user-context';
import { formatPhoneLine } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { PaymentClaimForm } from './payment-claim-form';
import { usePaymentClaim, type PaymentClaimResult } from './usePaymentClaim';

interface Props {
  paymentDocId: string;
  onClose: () => void;
}

const TITLE_ID = 'payment-claim-title';

function ClaimOpened({ result, onDone }: Readonly<{ result: PaymentClaimResult; onDone: () => void }>) {
  const { t } = useTranslation();
  const key = result.already_open ? 'mweb.payment.claim.alreadyOpen' : 'mweb.payment.claim.success';
  return (
    <>
      <DialogContent sx={{ pt: 0 }}>
        <Alert severity="success" role="status" data-testid="payment-claim-success">
          {t(key, { vars: { ticket: result.ticket_no } })}
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <DuncitButton fullWidth variant="contained" onClick={onDone} data-testid="payment-claim-done">
          {t('mweb.payment.claim.done')}
        </DuncitButton>
      </DialogActions>
    </>
  );
}

/**
 * The deduction claim, opened from the failure dialog's Support section.
 * Mounted only while open, so every opening is one attempt with its own
 * request id. Support reaches the buyer on the account's registered contact.
 */
export default function PaymentClaimDialog({ paymentDocId, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { user } = useUserData();
  const claim = usePaymentClaim(paymentDocId);
  const contact = {
    phone: formatPhoneLine(user?.phone_extension, user?.phone_number),
    email: user?.email ?? '',
  };

  return (
    <Dialog
      open
      onClose={claim.submitting ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby={TITLE_ID}
      data-testid="payment-claim-dialog"
    >
      <DialogTitle id={TITLE_ID} sx={{ fontSize: 20, fontWeight: 600 }}>
        {t('mweb.payment.claim.title')}
      </DialogTitle>
      {claim.result ? (
        <ClaimOpened result={claim.result} onDone={onClose} />
      ) : (
        <PaymentClaimForm
          submitting={claim.submitting}
          error={claim.error}
          contact={contact}
          onSubmit={claim.submit}
          onCancel={onClose}
        />
      )}
    </Dialog>
  );
}
