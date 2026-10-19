import { useRoute, type RouteProp } from '@react-navigation/native';
import { Spinner, Text, YStack } from 'tamagui';
import { canRevealGigContact } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { GigContactCard } from '@/components/gigs/GigContactCard';
import { GigContactReveal } from '@/components/gigs/GigContactReveal';
import { GigFacts } from '@/components/gigs/GigFacts';
import { GigInterestsList } from '@/components/gigs/GigInterestsList';
import { GigNote } from '@/components/gigs/GigNote';
import { GigViewerActions } from '@/components/gigs/GigViewerActions';
import { useGigContext } from '@/components/gigs/useGigContext';
import { useGigJob } from '@/components/gigs/useGigJob';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/**
 * One gig (mWeb /gigs/:id): what it is, what this viewer can do, the poster's
 * contact (shown once shared, or on "View contact"), and — for the poster —
 * who is interested.
 * mWeb twin: @duncit/gig-jobs GigJobDetail.
 */
export function GigJobDetailScreen() {
  const { t } = useTranslation();
  const { id } = useRoute<RouteProp<RootStackParamList, 'GigJobDetail'>>().params;
  const { viewer } = useGigContext();
  const gig = useGigJob(id);
  const job = gig.job;

  let body;
  if (gig.failed && !job) {
    body = (
      <YStack gap={8}>
        <Text fontSize={13.5} color="$muted">
          {t('gigJobs.board.loadFailed')}
        </Text>
        <DuncitButton
          label={t('gigJobs.board.retry')}
          variant="outline"
          onPress={() => gig.refetch()}
        />
      </YStack>
    );
  } else if (gig.missing) {
    body = <GigNote text={t('gigJobs.detail.notFound')} testID="gig-not-found" />;
  } else if (job) {
    body = (
      <>
        <GigFacts job={job} />
        <GigViewerActions job={job} viewer={viewer} onChanged={gig.replace} />
        {job.contact && !job.is_mine ? <GigContactCard contact={job.contact} /> : null}
        {canRevealGigContact(job) ? <GigContactReveal key={job.id} jobId={job.id} /> : null}
        {job.is_mine ? <GigInterestsList jobId={job.id} /> : null}
      </>
    );
  } else {
    body = (
      <Spinner
        role="progressbar"
        aria-label={t('mweb.a11y.loading')}
        color="$primary"
        testID="gig-loading"
      />
    );
  }

  return (
    <StackScreen title={t('gigJobs.board.title')} testID="gig-detail-screen">
      <RefreshScrollView
        flex={1}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
      >
        {body}
      </RefreshScrollView>
    </StackScreen>
  );
}
