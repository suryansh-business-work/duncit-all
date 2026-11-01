import { Stack, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { OpenOnNetwork, PlatformCell } from '../../social-accounts-page/SocialCells';
import { EnumChip, ReasonCell } from '../../social-accounts-page/monitoring/CommentCells';
import { PLATFORM_LABEL, SENTIMENT_COLORS, SENTIMENT_LABEL, SEVERITY_COLORS, SEVERITY_LABEL } from '../../social-accounts-page/copy';
import { INBOX_STATUS_COLORS, INBOX_STATUS_LABEL } from '../copy';
import type { InboxComment } from '../queries';

/** What was said, where, how the AI read it, and the way to it on the network. */
export default function InboxCommentDetails({ comment }: Readonly<{ comment: InboxComment }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5} data-testid="inbox-comment">
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <PlatformCell platform={comment.platform} label={`${t(PLATFORM_LABEL[comment.platform])} · ${comment.account_name}`} />
        <StatusChip status={comment.status} colorMap={INBOX_STATUS_COLORS} label={t(INBOX_STATUS_LABEL[comment.status])} />
        <EnumChip value={comment.ai_sentiment} colors={SENTIMENT_COLORS} labels={SENTIMENT_LABEL} t={t} />
        <EnumChip value={comment.ai_severity} colors={SEVERITY_COLORS} labels={SEVERITY_LABEL} t={t} />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Typography variant="body1" sx={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {comment.text}
        </Typography>
        <OpenOnNetwork href={comment.permalink} title={t('marketing.inbox.openComment')} />
      </Stack>
      {(comment.ai_reason || comment.ai_categories.length > 0) && (
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">{t('marketing.inbox.aiReason')}</Typography>
          <ReasonCell row={comment} t={t} />
        </Stack>
      )}
      {comment.post_text && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Typography variant="body2" sx={{ flex: 1, color: 'text.secondary' }}>
            {`${t('marketing.inbox.onPost')}: ${comment.post_text}`}
          </Typography>
          <OpenOnNetwork href={comment.post_permalink} title={t('marketing.inbox.openPost')} />
        </Stack>
      )}
    </Stack>
  );
}
