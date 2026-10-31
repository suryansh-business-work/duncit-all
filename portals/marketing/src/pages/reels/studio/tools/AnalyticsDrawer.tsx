import { Alert, Box, Drawer, Link, List, ListItem, ListItemText, Paper, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InsightsIcon from '@mui/icons-material/Insights';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { EmptyState, Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { PLATFORM_LABEL } from '../../../social-accounts-page/copy';
import type { ReelAnalytics } from '../../types';
import { useReelAnalytics } from './useReelAnalytics';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

const TOTALS = ['views', 'likes', 'comments', 'shares', 'engagement'] as const;
type Total = (typeof TOTALS)[number];

const TOTAL_LABEL: Readonly<Record<Total, string>> = {
  views: 'ai.reels.analytics.views',
  likes: 'ai.reels.analytics.likes',
  comments: 'ai.reels.analytics.comments',
  shares: 'ai.reels.analytics.shares',
  engagement: 'ai.reels.analytics.engagement',
};

/** The five numbers, then every post they add up from. */
function Results({ analytics }: Readonly<{ analytics: ReelAnalytics }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 1 }} data-testid="reel-analytics-totals">
        {TOTALS.map((total) => (
          <Paper key={total} variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }} data-testid={`reel-analytics-${total}`}>
            <Typography variant="h6" component="p">
              {analytics[total].toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t(TOTAL_LABEL[total])}
            </Typography>
          </Paper>
        ))}
      </Box>
      <List disablePadding aria-label={t('ai.reels.analytics.postsLabel')} data-testid="reel-analytics-posts">
        {analytics.posts.map((post) => (
          <ListItem key={post.permalink} divider sx={{ px: 0 }} data-testid={`reel-analytics-post-${post.platform}`}>
            <ListItemText
              primary={t(PLATFORM_LABEL[post.platform])}
              secondary={t('ai.reels.analytics.postLine', {
                vars: { when: post.published_at ? formatDateTime(post.published_at) : '—', views: post.views, likes: post.likes, comments: post.comments, shares: post.shares },
              })}
            />
            {post.permalink !== '' && (
              <Link href={post.permalink} target="_blank" rel="noopener noreferrer" variant="body2">
                {t('ai.reels.analytics.openPost')}
              </Link>
            )}
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}

/** Analytics after posting: the totals, each post, and what to make next. */
export default function AnalyticsDrawer({ open, onClose, projectId }: Readonly<Props>) {
  const { t } = useTranslation();
  const tools = useReelAnalytics(projectId, open);
  const { analytics } = tools;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }} data-testid="reel-analytics-drawer">
      <Stack sx={{ height: '100%' }} role="region" aria-labelledby="reel-analytics-title">
        <Stack direction="row" sx={{ alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography id="reel-analytics-title" variant="h6" component="h2" sx={{ flex: 1 }}>
            {t('ai.reels.analytics.title')}
          </Typography>
          <DuncitIconButton aria-label={t('shell.common.close')} onClick={onClose} data-testid="reel-analytics-close">
            <CloseIcon />
          </DuncitIconButton>
        </Stack>
        <Stack spacing={2} sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {tools.error && (
            <Alert severity="error" data-testid="reel-analytics-error">
              {parseApiError(tools.error, t('ai.reels.analytics.failed'))}
            </Alert>
          )}
          {tools.loading && !analytics && <Loader variant="block" />}
          {analytics && analytics.posts.length === 0 && (
            <EmptyState compact icon={<InsightsIcon />} title={t('ai.reels.analytics.emptyTitle')} body={t('ai.reels.analytics.emptyBody')} data-testid="reel-analytics-empty" />
          )}
          {analytics && analytics.posts.length > 0 && <Results analytics={analytics} />}
          <DuncitButton variant="outlined" startIcon={<LightbulbOutlinedIcon />} loading={tools.recommending} onClick={tools.recommend} sx={{ alignSelf: 'flex-start' }} data-testid="reel-analytics-recommend">
            {t('ai.reels.analytics.recommend')}
          </DuncitButton>
          {tools.recommendations && (
            <List disablePadding aria-label={t('ai.reels.analytics.recommendationsLabel')} data-testid="reel-analytics-recommendations">
              {tools.recommendations.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('ai.reels.analytics.noRecommendations')}
                </Typography>
              )}
              {tools.recommendations.map((item) => (
                <ListItem key={item.title} divider sx={{ px: 0, display: 'block' }}>
                  <Typography variant="subtitle2">{item.title}</Typography>
                  <Typography variant="body2">{item.why}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {item.evidence}
                  </Typography>
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </Stack>
    </Drawer>
  );
}
