import { useNavigate } from 'react-router';
import { Alert, Box, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReplayIcon from '@mui/icons-material/Replay';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { fmt } from '../../payment-logs-page/helpers';
import FailedPaymentRowActions from '../FailedPaymentRowActions';
import { RESOLUTION_COLORS, VERIFICATION_COLORS, labelOf, resolutionLabels, verificationLabels } from '../labels';
import type { FailedPaymentDialogKind } from '../useFailedPaymentActions';
import type { FailedPaymentDetail } from '../queries';

interface Props {
  detail: FailedPaymentDetail;
  canManage: boolean;
  reverifyBusy: boolean;
  onReverify: () => void;
  onAction: (kind: FailedPaymentDialogKind) => void;
}

/** Who and how much, where the case stands, and the decisions it is ready for. */
export default function DetailHeader({ detail, canManage, reverifyBusy, onReverify, onAction }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <DuncitIconButton aria-label={t('finance.failedPayments.backToList')} onClick={() => navigate('/failed-payments')}>
          <ArrowBackIcon />
        </DuncitIconButton>
        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography component="h1" variant="h5" sx={{ fontWeight: 700, fontFamily: 'monospace' }} data-testid="failed-payment-title">
              {detail.payment_id}
            </Typography>
            <StatusChip status={detail.verification.status} label={labelOf(verificationLabels(t), detail.verification.status)} colorMap={VERIFICATION_COLORS} />
            <StatusChip status={detail.resolution.state} label={labelOf(resolutionLabels(t), detail.resolution.state)} colorMap={RESOLUTION_COLORS} />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {detail.user.name} · {fmt(detail.amount, detail.currency_symbol)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <FailedPaymentRowActions flags={detail} canManage={canManage} onAction={onAction} variant="button" />
          {canManage && (
            <DuncitButton variant="outlined" startIcon={<ReplayIcon />} loading={reverifyBusy} onClick={onReverify} data-testid="failed-payment-reverify">
              {t('finance.failedPayments.reverify')}
            </DuncitButton>
          )}
        </Stack>
      </Stack>
      {detail.highlight === 'GREEN' && (
        <Alert severity="success" sx={{ mt: 2 }}>{t('finance.failedPayments.greenHint')}</Alert>
      )}
      {detail.highlight === 'YELLOW' && (
        <Alert severity="warning" sx={{ mt: 2 }}>{t('finance.failedPayments.yellowHint')}</Alert>
      )}
      {detail.can_refund && detail.highlight !== 'GREEN' && (
        <Alert severity="info" sx={{ mt: 2 }} data-testid="failed-payment-live-check-hint">{t('finance.failedPayments.liveCheckHint')}</Alert>
      )}
      {detail.can_mark_not_refundable && (
        <Alert severity="info" sx={{ mt: 2 }}>{t('finance.failedPayments.notCapturedHint')}</Alert>
      )}
    </Box>
  );
}
