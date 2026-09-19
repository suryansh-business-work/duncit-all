import { Chip, Divider, Stack, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { EnumChip } from '../monitoring/CommentCells';
import { SENTIMENT_COLORS, SENTIMENT_LABEL, VERDICT_COLORS, VERDICT_LABEL } from '../copy';
import type { SocialPostDetail } from '../queries';

/** How the post's comments read, and the latest of them with the AI's verdict on each. */
export default function PostComments({ detail }: Readonly<{ detail: SocialPostDetail }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const { sentiment, recent_comments: comments } = detail;
  const counts = [
    { key: 'positive', label: t('marketing.social.sentimentPositive'), value: sentiment.positive },
    { key: 'neutral', label: t('marketing.social.sentimentNeutral'), value: sentiment.neutral },
    { key: 'negative', label: t('marketing.social.sentimentNegative'), value: sentiment.negative },
    { key: 'flagged', label: t('marketing.social.verdictFlagged'), value: sentiment.flagged },
  ];

  return (
    <SectionCard title={t('marketing.social.colComments')}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 1.5 }}>
        {counts.map((count) => (
          <Chip key={count.key} size="small" variant="outlined" label={`${count.label}: ${count.value}`} />
        ))}
      </Stack>
      {comments.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('marketing.social.noComments')}
        </Typography>
      ) : (
        <Stack divider={<Divider flexItem />} spacing={1}>
          {comments.map((comment) => (
            <Stack key={comment.id} spacing={0.5}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {comment.author_name || comment.author_handle || t('marketing.social.unknownAuthor')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {comment.published_at ? formatDateTime(comment.published_at) : ''}
                </Typography>
                <EnumChip value={comment.ai_status} colors={VERDICT_COLORS} labels={VERDICT_LABEL} t={t} />
                <EnumChip value={comment.ai_sentiment} colors={SENTIMENT_COLORS} labels={SENTIMENT_LABEL} t={t} />
              </Stack>
              <Typography variant="body2">{comment.text}</Typography>
              {comment.ai_reason && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {comment.ai_reason}
                </Typography>
              )}
            </Stack>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
