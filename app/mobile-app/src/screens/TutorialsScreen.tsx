import { useMemo, useState, type ReactNode } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, YStack } from 'tamagui';
import {
  hasTutorialFilters,
  parseTutorialFilters,
  TUTORIAL_FILTER_PARAMS,
  tutorialFilterParams,
  type TutorialFilters,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { EmptyState } from '@/components/EmptyState';
import { DetailSkeleton } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { TutorialCommentsSheet } from '@/components/tutorials/TutorialCommentsSheet';
import { TutorialFeed } from '@/components/tutorials/TutorialFeed';
import { TutorialFilterBar } from '@/components/tutorials/TutorialFilterBar';
import { useTranslation } from '@/hooks/useTranslation';
import { useTutorialActions } from '@/hooks/useTutorialActions';
import { useTutorialFeed, useTutorialTopics, type TutorialItem } from '@/hooks/useTutorialFeed';
import type { RootStackParamList } from '@/navigation/types';

type TutorialsRoute = RouteProp<RootStackParamList, 'Tutorials'>;

/** Every filter param, cleared ones as undefined — setParams merges, so a
 * cleared filter must be named to leave the route. */
function routeParamsFor(filters: TutorialFilters): NonNullable<RootStackParamList['Tutorials']> {
  const set = tutorialFilterParams(filters);
  return {
    q: set[TUTORIAL_FILTER_PARAMS.search],
    topic: set[TUTORIAL_FILTER_PARAMS.topic],
    lang: set[TUTORIAL_FILTER_PARAMS.language],
    v: set[TUTORIAL_FILTER_PARAMS.focus],
  };
}

/** Tutorials — short how-to videos with search, topics and an English / Hindi
 * filter; like, comment, share, and a Watched check. mWeb twin: /tutorials. */
export function TutorialsScreen() {
  const { t } = useTranslation();
  const route = useRoute<TutorialsRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Tutorials'>>();
  const params = route.params;
  const filters = useMemo(
    () => parseTutorialFilters((name) => (params as Record<string, unknown> | undefined)?.[name]),
    [params],
  );
  const topics = useTutorialTopics();
  const feed = useTutorialFeed(filters);
  const actions = useTutorialActions(feed.patch);
  const [commentsFor, setCommentsFor] = useState<TutorialItem | null>(null);

  const changeFilters = (next: Partial<TutorialFilters>) =>
    navigation.setParams(routeParamsFor({ ...filters, ...next, focus: '' }));
  const clearFilters = () =>
    navigation.setParams(routeParamsFor({ search: '', topic: '', language: '', focus: '' }));

  let body: ReactNode;
  if (feed.loading) {
    body = <DetailSkeleton testID="tutorials-loading" />;
  } else if (feed.failed) {
    body = (
      <EmptyState
        icon="error-outline"
        title={t('mweb.tutorials.loadFailed')}
        actionLabel={t('mweb.tutorials.retry')}
        onAction={feed.retry}
        testID="tutorials-error"
        actionTestID="tutorials-retry"
      />
    );
  } else if (feed.rows.length === 0) {
    const narrowed = hasTutorialFilters(filters);
    body = (
      <YStack flex={1} justifyContent="center" gap={8}>
        <EmptyState
          icon="ondemand-video"
          title={t('mweb.tutorials.empty')}
          actionLabel={narrowed ? t('mweb.tutorials.clearFilters') : undefined}
          onAction={narrowed ? clearFilters : undefined}
          testID="tutorials-empty"
          actionTestID="tutorials-clear-filters"
        />
        {narrowed ? (
          <Text textAlign="center" color="$muted" paddingHorizontal={24}>
            {t('mweb.tutorials.emptyHint')}
          </Text>
        ) : null}
      </YStack>
    );
  } else {
    body = (
      <TutorialFeed
        rows={feed.rows}
        topics={topics}
        focusId={filters.focus}
        loadingMore={feed.loadingMore}
        onEndReached={feed.loadMore}
        onLike={(item) => {
          actions.toggleLike(item).catch(() => undefined);
        }}
        onComment={setCommentsFor}
        onShare={(item) => {
          actions.share(item).catch(() => undefined);
        }}
        onWatched={actions.markWatched}
      />
    );
  }

  return (
    <StackScreen title={t('mweb.tutorials.title')} testID="tutorials-screen">
      <TutorialFilterBar filters={filters} topics={topics} onChange={changeFilters} />
      {actions.notice ? (
        <YStack
          marginHorizontal={16}
          marginBottom={8}
          padding={10}
          borderRadius={12}
          backgroundColor="$soft"
          gap={6}
        >
          <Text role="alert" fontSize={13} color="$danger">
            {actions.notice}
          </Text>
          <DuncitButton
            testID="tutorials-notice-dismiss"
            label={t('mweb.tutorials.close')}
            onPress={actions.clearNotice}
            variant="ghost"
            size="sm"
          />
        </YStack>
      ) : null}
      <YStack flex={1}>{body}</YStack>
      {commentsFor ? (
        <TutorialCommentsSheet
          tutorialId={commentsFor.id}
          onClose={() => setCommentsFor(null)}
          onCountChange={(delta) => feed.bumpComments(commentsFor.id, delta)}
        />
      ) : null}
    </StackScreen>
  );
}
