import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { YStack } from 'tamagui';
import { gigViewerAction, type GigJob, type GigViewer } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { GigNote } from './GigNote';
import { GigOwnerActions } from './GigOwnerActions';
import { InterestSheet } from './InterestSheet';

interface Props {
  job: GigJob;
  viewer: Pick<GigViewer, 'is_freelancer'> | null;
  onChanged: (job: GigJob) => void;
}

/**
 * The one thing this viewer can do on this gig (shared rule `gigViewerAction`)
 * — manage it, show interest, join as a freelancer first, or read that it is
 * closed. mWeb twin: @duncit/gig-jobs GigViewerActions.
 */
export function GigViewerActions({ job, viewer, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [interestOpen, setInterestOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const action = gigViewerAction(job, viewer);

  if (action === 'MANAGE') return <GigOwnerActions job={job} onChanged={onChanged} />;
  if (action === 'CONTACT_SHARED') {
    return shared ? <GigNote text={t('gigJobs.interest.sent')} testID="gig-interest-sent" /> : null;
  }
  if (action === 'CLOSED')
    return <GigNote text={t('gigJobs.detail.closed')} tone="warning" testID="gig-closed" />;
  if (action === 'JOIN_AS_FREELANCER') {
    return (
      <YStack gap={10}>
        <GigNote text={t('gigJobs.interest.joinBody')} testID="gig-join-hint" />
        <DuncitButton
          label={t('gigJobs.interest.joinCta')}
          onPress={() => navigation.navigate('FreelancerProfile')}
          testID="gig-join-freelancer"
        />
        <GigNote text={t('gigJobs.contact.hidden')} testID="gig-contact-hidden" />
      </YStack>
    );
  }
  return (
    <YStack gap={10}>
      <DuncitButton
        label={t('gigJobs.interest.cta')}
        onPress={() => setInterestOpen(true)}
        testID="gig-interest-open"
      />
      <GigNote text={t('gigJobs.contact.hidden')} testID="gig-contact-hidden" />
      <InterestSheet
        job={job}
        open={interestOpen}
        onClose={() => setInterestOpen(false)}
        onShared={(next) => {
          setShared(true);
          onChanged(next);
        }}
      />
    </YStack>
  );
}
