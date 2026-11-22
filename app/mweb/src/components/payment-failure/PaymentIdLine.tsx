import { useState } from 'react';
import { Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitIconButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { copyToClipboard } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Razorpay's payment id, copyable — the reference a buyer reads out to their
 * bank or quotes in a deduction claim. Native twin: the same line, copied
 * through expo-clipboard.
 */
export default function PaymentIdLine({ paymentId }: Readonly<{ paymentId: string }>) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const ok = await copyToClipboard(paymentId);
    if (!ok) logs.mWeb.warn('PaymentFailure', 'copyTransactionId', { reason: 'clipboard unavailable' });
    setCopied(ok);
  };

  return (
    <Stack spacing={0.25} sx={{ alignItems: 'center' }} data-testid="payment-transaction-id">
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', maxWidth: '100%' }}>
        <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
          {t('mweb.payment.transactionIdLabel', { vars: { id: paymentId } })}
        </Typography>
        <DuncitIconButton
          size="small"
          aria-label={t('mweb.payment.copyTransactionId')}
          onClick={() => {
            copy().catch(() => undefined);
          }}
          data-testid="payment-transaction-id-copy"
        >
          <ContentCopyIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
      <Typography variant="caption" aria-live="polite" sx={{ color: 'success.main', minHeight: '1em' }}>
        {copied ? t('mweb.payment.transactionIdCopied') : ''}
      </Typography>
    </Stack>
  );
}
