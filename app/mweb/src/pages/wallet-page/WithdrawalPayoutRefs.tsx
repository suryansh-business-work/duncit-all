import { useState } from 'react';
import { Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitIconButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { copyToClipboard } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

type CopyState = 'idle' | 'copied' | 'failed';

/** What a reference line says after a copy — literal keys (rule 38). */
const COPY_STATE_KEY: Record<Exclude<CopyState, 'idle'>, string> = {
  copied: 'withdraw.history.copied',
  failed: 'withdraw.history.copyFailed',
};

interface RefLineProps {
  text: string;
  value: string;
  copyLabel: string;
  testId: string;
}

/** One payout reference: its words, a copy button, and whether the copy landed. */
function RefLine({ text, value, copyLabel, testId }: Readonly<RefLineProps>) {
  const { t } = useTranslation();
  const [state, setState] = useState<CopyState>('idle');

  const copy = async () => {
    const ok = await copyToClipboard(value);
    if (!ok) logs.mWeb.warn('WalletPage', 'copyWithdrawalReference', { reason: 'clipboard unavailable' });
    setState(ok ? 'copied' : 'failed');
  };

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }} data-testid={testId}>
      <Typography variant="caption" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
        {text}
      </Typography>
      <DuncitIconButton size="small" aria-label={copyLabel} onClick={copy} data-testid={`${testId}-copy`}>
        <ContentCopyIcon fontSize="small" />
      </DuncitIconButton>
      <Typography
        variant="caption"
        aria-live="polite"
        data-testid={`${testId}-status`}
        sx={{ color: state === 'failed' ? 'error.main' : 'success.main' }}
      >
        {state === 'idle' ? '' : t(COPY_STATE_KEY[state])}
      </Typography>
    </Stack>
  );
}

interface Props {
  /** RazorpayX's payout id — empty until the payout has been sent. */
  paymentId?: string | null;
  /** The bank's reference (UTR) — empty until the bank has confirmed the payment. */
  utr?: string | null;
  /** The row's test id; each line extends it. */
  testId: string;
}

/**
 * A withdrawal's payout references, once Razorpay has them: the payment id and
 * the bank reference a person quotes to their bank when the money has not
 * arrived. Each is copyable. Native twin: components/wallet/WithdrawalPayoutRefs.
 */
export default function WithdrawalPayoutRefs({ paymentId, utr, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!paymentId && !utr) return null;
  return (
    <Stack spacing={0.25} sx={{ mt: 0.25 }}>
      {paymentId ? (
        <RefLine
          text={t('withdraw.history.paymentId', { vars: { id: paymentId } })}
          value={paymentId}
          copyLabel={t('withdraw.history.copyPaymentId')}
          testId={`${testId}-payment-id`}
        />
      ) : null}
      {utr ? (
        <RefLine
          text={t('withdraw.history.utr', { vars: { utr } })}
          value={utr}
          copyLabel={t('withdraw.history.copyUtr')}
          testId={`${testId}-utr`}
        />
      ) : null}
    </Stack>
  );
}
