import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import { DuncitButton } from '@duncit/buttons';
import { hasTutorialFilters, parseTutorialFilters, tutorialFilterParams, type TutorialFilters } from '@duncit/utils';
import EmptyState from '../../components/EmptyState';
import { useTranslation } from '../../i18n/useTranslation';
import LearningsFilterBar from './LearningsFilterBar';
import LearningReels from './LearningReels';
import LearningCommentsDrawer from './LearningCommentsDrawer';
import { useLearningFeed } from './useLearningFeed';
import { useLearningActions } from './useLearningActions';
import { LEARNING_TOPICS, type LearningCard, type LearningTopicsData } from './queries';

/** The reel fills what the app bar, the filter bar and the bottom nav leave. */
const REEL_SX = {
  flex: 1,
  minHeight: 0,
  position: 'relative',
  overflow: 'hidden',
  touchAction: 'none',
  '& .slick-slider, & .slick-slide > div': { height: '100%' },
  '& .slick-list, & .slick-track, & .slick-slide': { height: '100% !important' },
} as const;

/**
 * Learnings (code name: tutorials) — short how-to videos from the Support
 * portal, as a vertical reel. The filters live in the URL so a link reproduces
 * the view. Native twin: TutorialsScreen.
 */
export default function LearningsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseTutorialFilters((name) => params.get(name)), [params]);
  const setFilters = useCallback(
    (change: Partial<TutorialFilters>) => setParams(tutorialFilterParams({ ...filters, ...change }), { replace: true }),
    [filters, setParams],
  );
  const topicsQuery = useQuery<LearningTopicsData>(LEARNING_TOPICS);
  const topics = useMemo(() => topicsQuery.data?.tutorialTopics ?? [], [topicsQuery.data]);
  const topicLabels = useMemo(() => new Map(topics.map((topic) => [topic.key, topic.label])), [topics]);

  const feed = useLearningFeed(filters);
  const actions = useLearningActions(feed.patch);
  const [commentsFor, setCommentsFor] = useState<LearningCard | null>(null);
  const onCountChange = useCallback(
    (card: LearningCard, delta: number) => {
      const current = feed.rows.find((row) => row.id === card.id)?.comment_count ?? card.comment_count;
      feed.patch(card.id, { comment_count: Math.max(0, current + delta) });
    },
    [feed],
  );

  const renderBody = () => {
    if (feed.loading) {
      return (
        <Stack sx={{ alignItems: 'center', p: 6 }} data-testid="learnings-loading">
          <CircularProgress aria-label={t('mweb.a11y.loading')} />
        </Stack>
      );
    }
    if (feed.error) {
      return (
        <Alert
          severity="error"
          sx={{ m: 2 }}
          data-testid="learnings-error"
          action={<DuncitButton size="small" onClick={() => { feed.refetch().catch(() => undefined); }}>{t('mweb.tutorials.retry')}</DuncitButton>}
        >
          {t('mweb.tutorials.loadFailed')}
        </Alert>
      );
    }
    if (feed.rows.length === 0) {
      const narrowed = hasTutorialFilters(filters);
      return (
        <Stack sx={{ alignItems: 'center' }} data-testid="learnings-empty">
          <EmptyState
            icon={<OndemandVideoIcon />}
            title={t('mweb.tutorials.empty')}
            actionLabel={narrowed ? t('mweb.tutorials.clearFilters') : undefined}
            onAction={narrowed ? () => setParams({}, { replace: true }) : undefined}
          />
          {narrowed && <Typography sx={{ color: 'text.secondary', px: 3, textAlign: 'center' }}>{t('mweb.tutorials.emptyHint')}</Typography>}
        </Stack>
      );
    }
    return (
      <Box sx={REEL_SX}>
        <LearningReels
          cards={feed.rows}
          topicLabels={topicLabels}
          onNearEnd={() => { feed.loadMore().catch(() => undefined); }}
          onLike={(card) => { actions.like(card).catch(() => undefined); }}
          onComments={setCommentsFor}
          onShare={(card) => { actions.share(card).catch(() => undefined); }}
          onWatched={actions.watched}
        />
        {feed.loadingMore && (
          <CircularProgress size={20} aria-label={t('mweb.tutorials.loadingMore')} sx={{ position: 'absolute', bottom: 12, left: '50%', color: 'common.white' }} />
        )}
      </Box>
    );
  };

  return (
    <Stack data-testid="learnings-page" sx={{ height: 'calc(100dvh - 64px - 56px - env(safe-area-inset-bottom))' }}>
      <Box sx={{ px: 2, pt: 2 }}>
        <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
          {t('mweb.tutorials.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.tutorials.subtitle')}
        </Typography>
      </Box>
      <LearningsFilterBar filters={filters} topics={topics} onChange={setFilters} />
      {renderBody()}
      <LearningCommentsDrawer card={commentsFor} onClose={() => setCommentsFor(null)} onCountChange={onCountChange} />
    </Stack>
  );
}
