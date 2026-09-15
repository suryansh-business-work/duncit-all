import { useMutation } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import { DuncitButton } from '@duncit/buttons';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { REVIEW_E2E_SUB_FLOW, errorText, type E2eReviewStatus, type E2eSubFlow } from '../queries';
import { ReviewChip, reviewLabels } from '../review';

interface Props {
  flowId: string;
  subFlow: E2eSubFlow;
}

/**
 * The manual review of a sub flow: Looks good marks its steps ready to become
 * an e2e test, Needs review again sends it back. The mutation answers with the
 * whole flow, so the table behind and this bar update from Apollo's cache.
 */
export default function SubFlowReview({ flowId, subFlow }: Readonly<Props>) {
  const { t } = useTranslation();
  const [review, { loading }] = useMutation<any>(REVIEW_E2E_SUB_FLOW);
  const status = subFlow.review_status;

  const mark = async (next: E2eReviewStatus) => {
    try {
      await review({ variables: { flow_id: flowId, sub_flow_id: subFlow.id, status: next } });
      notifySuccess(t('tech.e2eFlows.reviewSaved'));
    } catch (err) {
      notifyError(errorText(err));
    }
  };

  const caption = subFlow.reviewed_at
    ? t('tech.e2eFlows.reviewedBy', {
        vars: { name: subFlow.reviewed_by, when: formatDateTime(subFlow.reviewed_at) },
      })
    : t('tech.e2eFlows.reviewHint');

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { sm: 'center' }, mb: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}
    >
      <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
        <ReviewChip status={status} labels={reviewLabels(t)} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {caption}
        </Typography>
      </Stack>
      <DuncitButton
        size="small"
        variant="outlined"
        color="warning"
        startIcon={<ReplayIcon />}
        disabled={loading || status === 'NEEDS_REVIEW'}
        onClick={() => mark('NEEDS_REVIEW')}
      >
        {t('tech.e2eFlows.markNeedsReview')}
      </DuncitButton>
      <DuncitButton
        size="small"
        variant="contained"
        color="success"
        startIcon={<CheckCircleOutlineIcon />}
        disabled={loading || status === 'LOOKS_GOOD'}
        onClick={() => mark('LOOKS_GOOD')}
      >
        {t('tech.e2eFlows.markLooksGood')}
      </DuncitButton>
    </Stack>
  );
}
