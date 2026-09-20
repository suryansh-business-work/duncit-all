import { useId } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Drawer, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import PlatformIcon from '../PlatformIcon';
import { OpenOnNetwork } from '../SocialCells';
import { PLATFORM_LABEL } from '../copy';
import { SOCIAL_POST, type SocialPostDetail } from '../queries';
import PostMetrics from './PostMetrics';
import PostAiAnalysis from './PostAiAnalysis';
import PostComments from './PostComments';

interface Props {
  /** The post to show; null when closed. */
  postId: string | null;
  onClose: () => void;
}

/** One post, opened: what it said, how it did against the account's usual, what the AI makes of it, and its comments. */
export default function PostDetailDrawer({ postId, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const titleId = useId();
  const { data, loading, error } = useQuery<{ socialPost: SocialPostDetail }>(SOCIAL_POST, {
    variables: { id: postId ?? '' },
    skip: !postId,
    fetchPolicy: 'cache-and-network',
  });
  const detail = data?.socialPost;
  const post = detail?.post;

  return (
    <Drawer
      anchor="right"
      open={!!postId}
      onClose={onClose}
      slotProps={{ paper: { 'aria-labelledby': titleId, sx: { width: { xs: '100%', md: 600 } } } }}
    >
      <Stack spacing={2} sx={{ p: 2 }} data-testid="social-post-detail">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {post && <PlatformIcon platform={post.platform} sx={{ color: 'text.secondary' }} />}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id={titleId} variant="h6" component="h2" noWrap>
              {post ? `${post.account_name} · ${t(PLATFORM_LABEL[post.platform])}` : t('marketing.social.postsTitle')}
            </Typography>
            {post?.published_at && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {formatDateTime(post.published_at)}
              </Typography>
            )}
          </Box>
          {post && <OpenOnNetwork href={post.permalink} title={t('marketing.social.openPost')} />}
          <Tooltip title={t('shell.common.close')}>
            <DuncitIconButton onClick={onClose}>
              <CloseIcon />
            </DuncitIconButton>
          </Tooltip>
        </Stack>

        {loading && !detail && <LinearProgress />}
        {error && <Alert severity="error">{parseApiError(error)}</Alert>}

        {detail && post && (
          <>
            {post.media_url && (
              <Box component="img" src={post.media_url} alt="" sx={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 1 }} />
            )}
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              {post.text}
            </Typography>
            <PostMetrics detail={detail} />
            <PostAiAnalysis postId={post.id} analysis={post.ai_analysis} />
            <PostComments detail={detail} />
          </>
        )}
      </Stack>
    </Drawer>
  );
}
