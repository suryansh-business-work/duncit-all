import { Box, Card, CardContent, Chip, Link, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import SendIcon from '@mui/icons-material/Send';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import { DuncitButton } from '@duncit/buttons';
import { EM_DASH } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import PlatformIcon from '../PlatformIcon';
import { PUBLISH_STATUS_COLORS, PUBLISH_STATUS_LABEL, TARGET_STATUS_COLORS, TARGET_STATUS_LABEL } from '../copy';
import type { SocialPublishTarget, SocialScheduledPost } from '../publish.queries';
import { usePublishActions } from './usePublishActions';

type Translate = ReturnType<typeof useTranslation>['t'];

const EDITABLE = new Set(['DRAFT', 'SCHEDULED']);
const RETRYABLE = new Set(['FAILED', 'PARTIAL']);

/** One line saying when: going out at, went out at, or not dated yet. */
function whenLine(post: SocialScheduledPost, t: Translate, formatDateTime: (value: string) => string): string {
  if (post.published_at) return t('marketing.social.sentAt', { vars: { when: formatDateTime(post.published_at) } });
  if (post.scheduled_at) return t('marketing.social.goesOutAt', { vars: { when: formatDateTime(post.scheduled_at) } });
  return t('marketing.social.noDateYet');
}

function MediaThumb({ post }: Readonly<{ post: SocialScheduledPost }>) {
  if (!post.media_url) return null;
  if (post.media_type === 'VIDEO') {
    return (
      <Box sx={{ width: 72, height: 72, borderRadius: 1, bgcolor: 'action.hover', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <VideocamOutlinedIcon sx={{ color: 'text.secondary' }} aria-hidden />
      </Box>
    );
  }
  return <Box component="img" src={post.media_url} alt="" sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }} />;
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
  const actions = usePublishActions();
  const failures = post.targets.filter((target) => target.status === 'FAILED' && target.error);

  const remove = async () => {
    if (await actions.remove(post)) onRemoved?.();
  };

  return (
    <Card variant="outlined" data-testid={`social-scheduled-${post.id}`}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <MediaThumb post={post} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
              <StatusChip status={post.status} colorMap={PUBLISH_STATUS_COLORS} label={t(PUBLISH_STATUS_LABEL[post.status])} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {whenLine(post, t, formatDateTime)}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {post.text || EM_DASH}
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
              {post.targets.map((target) => (
                <TargetChip key={target.account_id} target={target} label={`${target.account_name} · ${t(TARGET_STATUS_LABEL[target.status])}`} />
              ))}
            </Stack>
            {failures.map((target) => (
              <Typography key={target.account_id} variant="caption" component="p" sx={{ color: 'error.main', mt: 0.5 }}>
                {`${target.account_name}: ${target.error}`}
              </Typography>
            ))}
          </Box>
          <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1} sx={{ flexShrink: 0, alignItems: 'stretch' }}>
            {EDITABLE.has(post.status) && (
              <DuncitButton size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(post)}>
                {t('shell.common.edit')}
              </DuncitButton>
            )}
            {post.status === 'SCHEDULED' && (
              <DuncitButton size="small" variant="outlined" startIcon={<SendIcon />} onClick={() => actions.shareNow(post)}>
                {t('marketing.social.shareNow')}
              </DuncitButton>
            )}
            {RETRYABLE.has(post.status) && (
              <DuncitButton size="small" variant="outlined" startIcon={<ReplayIcon />} onClick={() => actions.retry(post)}>
                {t('marketing.social.retryFailed')}
              </DuncitButton>
            )}
            {post.status !== 'PUBLISHING' && (
              <DuncitButton size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={remove}>
                {t('shell.common.delete')}
              </DuncitButton>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
