import { Alert, Box, Divider, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitButton } from '@duncit/buttons';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { useTranslation, type DateFormatter, type Translator } from '@duncit/app-settings';
import type { FailedPaymentAiRecommendation } from '@duncit/gql-types';
import DetailCard from './DetailCard';
import RelevantLinks from './RelevantLinks';
import { useAiSummary } from './useAiSummary';
import type { FailedPaymentDetail } from '../queries';

interface Props {
  detail: FailedPaymentDetail;
  formatDateTime: DateFormatter['formatDateTime'];
}

const RECOMMENDATION_COLORS: StatusColorMap = {
  REFUND: 'success',
  DO_NOT_REFUND: 'error',
  NEEDS_REVIEW: 'warning',
};

/** Each key a literal, so the localization gate sees it rendered. */
const recommendationLabels = (t: Translator['t']): Record<FailedPaymentAiRecommendation, string> => ({
  REFUND: t('finance.failedPayments.aiRefund'),
  DO_NOT_REFUND: t('finance.failedPayments.aiDoNotRefund'),
  NEEDS_REVIEW: t('finance.failedPayments.aiNeedsReview'),
});

/** The note itself: verdict, a two-line summary and the facts behind it. */
function Note({ note, formatDateTime }: Readonly<{ note: NonNullable<FailedPaymentDetail['ai_summary']>; formatDateTime: Props['formatDateTime'] }>) {
  const { t } = useTranslation();
  if (note.error || !note.recommendation) {
    return <Alert severity="warning" data-testid="failed-payment-ai-error">{note.error || t('finance.failedPayments.aiFailed')}</Alert>;
  }
  return (
    <Stack spacing={1} data-testid="failed-payment-ai-note">
      <Box>
        <StatusChip
          status={note.recommendation}
          label={recommendationLabels(t)[note.recommendation]}
          colorMap={RECOMMENDATION_COLORS}
        />
      </Box>
      <Typography variant="body2">{note.summary}</Typography>
      {note.reasons.length > 0 && (
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {note.reasons.map((reason) => (
            <Typography key={reason} component="li" variant="body2" sx={{ color: 'text.secondary' }}>{reason}</Typography>
          ))}
        </Box>
      )}
      {note.stale && <Alert severity="info">{t('finance.failedPayments.aiStale')}</Alert>}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('finance.failedPayments.aiGenerated', {
          vars: { when: note.generated_at ? formatDateTime(note.generated_at) : '', name: note.generated_by_name ?? '' },
        })}
      </Typography>
    </Stack>
  );
}

/**
 * The AI's short "refund or not" note, asked for on demand and cached on the
 * case, beside the pages worth opening before deciding. It is advice only: the
 * Refund dialog still asks Razorpay live, and the server refuses anything
 * Razorpay does not allow.
 */
export default function AiSummaryCard({ detail, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const { summarize, busy } = useAiSummary(detail.id);
  const note = detail.ai_summary;
  const action = note ? t('finance.failedPayments.aiRefresh') : t('finance.failedPayments.aiAsk');

  return (
    <DetailCard title={t('finance.failedPayments.aiSection')} testId="failed-payment-ai-card">
      <Stack spacing={1.5}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('finance.failedPayments.aiDisclaimer')}</Typography>
        {note ? (
          <Note note={note} formatDateTime={formatDateTime} />
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('finance.failedPayments.aiEmpty')}</Typography>
        )}
        <Box>
          <DuncitButton
            variant="outlined"
            startIcon={note ? <RefreshIcon /> : <AutoAwesomeIcon />}
            loading={busy}
            onClick={() => summarize(Boolean(note))}
            data-testid="failed-payment-ai-ask"
          >
            {action}
          </DuncitButton>
        </Box>
        <Divider flexItem />
        <RelevantLinks detail={detail} />
      </Stack>
    </DetailCard>
  );
}
