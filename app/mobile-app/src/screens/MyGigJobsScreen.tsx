import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DuncitButton } from '@/components/DuncitButton';
import { GigList } from '@/components/gigs/GigList';
import { usePagedGigs } from '@/components/gigs/usePagedGigs';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/** My gig posts (mWeb /gigs/mine) — open and closed. mWeb twin: @duncit/gig-jobs MyGigJobs. */
export function MyGigJobsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const mine = usePagedGigs('MINE');

  return (
    <StackScreen title={t('gigJobs.mine.title')} testID="my-gigs-screen">
      <RefreshScrollView
        flex={1}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
      >
        <DuncitButton
          label={t('gigJobs.board.postGig')}
          onPress={() => navigation.navigate('GigJobForm', {})}
          testID="my-gigs-post"
        />
        <GigList
          rows={mine.rows}
          total={mine.total}
          loading={mine.loading}
          failed={mine.failed}
          emptyTitle={t('gigJobs.mine.empty')}
          onRetry={() => mine.retry()}
          onMore={mine.more}
          onOpen={(id) => navigation.navigate('GigJobDetail', { id })}
        />
      </RefreshScrollView>
    </StackScreen>
  );
}
