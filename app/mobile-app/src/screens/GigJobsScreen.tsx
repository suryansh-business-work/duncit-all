import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';
import { canPostGigs, gigBoardFilter, type GigJobFilter } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { GigFilters } from '@/components/gigs/GigFilters';
import { GigList } from '@/components/gigs/GigList';
import { GigNote } from '@/components/gigs/GigNote';
import { useGigContext } from '@/components/gigs/useGigContext';
import { usePagedGigs } from '@/components/gigs/usePagedGigs';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { useLocations } from '@/hooks/useLocations';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Gig Jobs (mWeb /gigs): every open gig, newest first. Hosts, venue owners and
 * brand owners post; freelancers who joined from Earn with Duncit show
 * interest. mWeb twin: @duncit/gig-jobs GigBoard.
 */
export function GigJobsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { categories, viewer } = useGigContext();
  const { selectedId } = useLocations();
  // Null until the viewer touches a filter: the board follows the header's city, as the pods lists do.
  const [picked, setPicked] = useState<GigJobFilter | null>(null);
  const filter = useMemo(() => gigBoardFilter(picked, selectedId), [picked, selectedId]);
  const onFilter = useCallback((next: GigJobFilter) => setPicked(next), []);
  const board = usePagedGigs('BOARD', filter);
  const canPost = canPostGigs(viewer);

  return (
    <StackScreen title={t('gigJobs.board.title')} testID="gig-jobs-screen">
      <RefreshScrollView
        flex={1}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
      >
        <Text fontSize={13.5} color="$muted">
          {t('gigJobs.board.subtitle')}
        </Text>
        <XStack gap={8} flexWrap="wrap">
          {canPost ? (
            <>
              <DuncitButton
                label={t('gigJobs.board.postGig')}
                onPress={() => navigation.navigate('GigJobForm', {})}
                testID="gig-post"
              />
              <DuncitButton
                label={t('gigJobs.board.myPosts')}
                variant="outline"
                onPress={() => navigation.navigate('MyGigJobs')}
                testID="gig-my-posts"
              />
            </>
          ) : null}
          {viewer ? (
            <DuncitButton
              label={
                viewer.is_freelancer
                  ? t('gigJobs.board.myProfile')
                  : t('gigJobs.board.joinAsFreelancer')
              }
              variant="outline"
              onPress={() => navigation.navigate('FreelancerProfile')}
              testID="gig-freelancer"
            />
          ) : null}
        </XStack>
        {viewer && !viewer.is_freelancer ? (
          <GigNote text={t('gigJobs.board.freelancerHint')} testID="gig-freelancer-hint" />
        ) : null}
        <GigFilters categories={categories} value={filter} onChange={onFilter} />
        <YStack>
          <GigList
            rows={board.rows}
            total={board.total}
            loading={board.loading}
            failed={board.failed}
            emptyTitle={t('gigJobs.board.empty')}
            onRetry={() => board.retry()}
            onMore={board.more}
            onOpen={(id) => navigation.navigate('GigJobDetail', { id })}
          />
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
