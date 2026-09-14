import { Divider, Stack, TextField } from '@mui/material';
import {
  POD_FEEDBACK_ASPECT_KEY,
  type PodFeedbackAspect,
  type PodFeedbackScores,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import AspectRatingRow from './AspectRatingRow';

interface Props {
  aspects: readonly PodFeedbackAspect[];
  scores: PodFeedbackScores;
  onScore: (aspect: PodFeedbackAspect, value: number) => void;
  message: string;
  onMessage: (value: string) => void;
}

/**
 * The questions themselves — one row per part of the pod, plus the comment box.
 *
 * Shared by the pop-up that appears after a pod and the standalone page behind
 * the link a host shares, because a guest who answers in one place and edits in
 * the other must be looking at the same form.
 */
export default function PodFeedbackFields({
  aspects,
  scores,
  onScore,
  message,
  onMessage,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <>
      <Stack data-testid="pod-feedback-fields" divider={<Divider flexItem />}>
        {aspects.map((aspect) => {
          const label = t(POD_FEEDBACK_ASPECT_KEY[aspect]);
          return (
            <AspectRatingRow
              key={aspect}
              label={label}
              value={scores[aspect] ?? 0}
              onChange={(value) => onScore(aspect, value)}
              starLabel={(stars) =>
                t('mweb.podFeedback.rateAspect', { vars: { aspect: label, stars } })
              }
              testId={`pod-feedback-${aspect}`}
            />
          );
        })}
      </Stack>

      <TextField
        data-testid="pod-feedback-comment"
        size="small"
        label={t('mweb.podFeedback.comments')}
        placeholder={t('mweb.podFeedback.commentsPlaceholder')}
        value={message}
        onChange={(event) => onMessage(event.target.value)}
        multiline
        minRows={2}
        slotProps={{
          htmlInput: { maxLength: 1000, 'data-testid': 'pod-feedback-comment-input' }
        }}
      />
    </>
  );
}
