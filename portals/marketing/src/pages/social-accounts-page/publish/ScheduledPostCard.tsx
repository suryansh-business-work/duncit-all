import { Alert, Box, Card, CardContent, Chip, Link, Stack, Typography } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import PlatformIcon from '../PlatformIcon';
import { PUBLISH_STATUS_COLORS, PUBLISH_STATUS_LABEL, TARGET_STATUS_COLORS, TARGET_STATUS_LABEL } from '../copy';
import type { SocialPublishTarget, SocialScheduledPost } from '../publish.queries';
import { postMedia, sentBackNote } from '../social-post-form';
import { MediaCountChip, MediaThumb } from './PostMediaStrip';
import ScheduledPostActions from './ScheduledPostActions';

type Translate = ReturnType<typeof useTranslation>['t'];

/** One line saying when: going out at, went out at, or not dated yet. */
function whenLine(post: SocialScheduledPost, t: Translate, formatDateTime: (value: string) => string): string {
  if (post.published_at) return t('marketing.social.sentAt', { vars: { when: formatDateTime(post.published_at) } });
  if (post.scheduled_at) return t('marketing.social.goesOutAt', { vars: { when: formatDateTime(post.scheduled_at) } });
  return t('marketing.social.noDateYet');
}

/** A network the post went to — a link to it there once it is out. */
function TargetChip({ target, label }: Readonly<{ target: SocialPublishTarget; label: string }>) {
  const common = {
    size: 'small',
    variant: 'outlined',
    color: TARGET_STATUS_COLORS[target.status],
    icon: <PlatformIcon platform={target.platform} fontSize="small" />,
    label,
  } as const;
  if (!target.permalink) return <Chip {...common} />;
  // The link wraps a plain chip, so there is one interactive element and it has content.
  return (
    <Link href={target.permalink} target="_blank" rel="noopener noreferrer" underline="none">
      <Chip {...common} sx={{ cursor: 'pointer' }} />
    </Link>
  );
}

interface Props {
  post: SocialScheduledPost;
  onEdit: (post: SocialScheduledPost) => void;
  /** Called after the post is deleted, so a dialog around the card can close. */
  onRemoved?: () => void;
}

/** A post written in Duncit: when it goes (or went), where, and how each network took it. */
export default function ScheduledPostCard({ post, onEdit, onRemoved }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const media = postMedia(post);
  const cover = media[0];
  const reviewNote = sentBackNote(post);
  const failures = post.targets.filter((target) => target.status === 'FAILED' && target.error);

  return (
    <Card variant="outlined" data-testid={`social-scheduled-${post.id}`}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {cover && <MediaThumb item={cover} />}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
              <StatusChip status={post.status} colorMap={PUBLISH_STATUS_COLORS} label={t(PUBLISH_STATUS_LABEL[post.status])} />
              {media.length > 1 && <MediaCountChip count={media.length} />}
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {whenLine(post, t, formatDateTime)}
              </Typography>
            </Stack>
            {reviewNote && (
              <Alert severity="warning" sx={{ mb: 1 }} data-testid="social-post-review-note">
                {t('marketing.social.sentBack', { vars: { note: reviewNote } })}
              </Alert>
            )}
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {post.text || EM_DASH}
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
              {post.targets.map((target) => (
                <TargetChip key={target.account_id} target={target} label={`${target.account_name} · ${t(TARGET_STATUS_LABEL[target.status])}`} />
              ))}
            </Stack>
            {post.collaborators.length > 0 && (
              <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mt: 0.5 }} data-testid="social-post-collaborators-line">
                {t('marketing.social.withCollaborators', { vars: { handles: post.collaborators.map((handle) => `@${handle}`).join(', ') } })}
              </Typography>
            )}
            {failures.map((target) => (
              <Typography key={target.account_id} variant="caption" component="p" sx={{ color: 'error.main', mt: 0.5 }}>
                {`${target.account_name}: ${target.error}`}
              </Typography>
            ))}
          </Box>
          <ScheduledPostActions post={post} onEdit={onEdit} onRemoved={onRemoved} />
        </Stack>
      </CardContent>
    </Card>
  );
}
