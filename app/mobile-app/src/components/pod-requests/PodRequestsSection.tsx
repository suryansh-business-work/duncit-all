import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { GiftCardSegmented, type SegmentOption } from '@/components/gift-cards/GiftCardSegmented';
import { HostSectionHeader } from '@/components/host-manage/HostSectionHeader';
import { PartnerSide } from '@/generated/graphql/graphql';
import { usePodRequests } from '@/hooks/usePodRequests';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';
import { PodRequestList } from './PodRequestList';
import { RespondButtons } from './RespondButtons';

type RequestsTab = 'REQUESTS' | 'ACCEPTED';

interface Props {
  side: PartnerSide;
  /** Venue Studio narrows to the venue its switcher has selected. */
  venueId?: string | null;
}

/**
 * Host Studio's "Pod Requests from Venues" and Venue Studio's "Pod Requests
 * from Hosts": what the other side sent (Requests, answered inline), what this
 * side accepted (through to the pod), what this side sent, and the door to
 * the nearby search. One component, the side decides the words. mWeb twin:
 * pod-requests/PodRequestsSection.
 */
export function PodRequestsSection({ side, venueId }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isHost = side === PartnerSide.Host;
  const [tab, setTab] = useState<RequestsTab>('REQUESTS');
  const { incoming, accepted, sent, isLoading, error, actions } = usePodRequests(side, venueId);

  const options: SegmentOption<RequestsTab>[] = [
    { value: 'REQUESTS', label: t('podRequests.tabRequests'), testID: 'pod-requests-tab-requests' },
    {
      value: 'ACCEPTED',
      label: isHost ? t('podRequests.tabVenueAccepted') : t('podRequests.tabHostAccepted'),
      testID: 'pod-requests-tab-accepted',
    },
  ];
  const answer = async (id: string, accept: boolean) => {
    if ((await actions.respond(id, accept)) && accept) setTab('ACCEPTED');
  };
  const searchLabel = isHost
    ? t('podRequests.searchVenuesTitle')
    : t('podRequests.searchHostsTitle');
  const problem = error ?? actions.error;

  return (
    <YStack gap={12} testID={`pod-requests-section-${side.toLowerCase()}`}>
      <HostSectionHeader
        title={isHost ? t('podRequests.fromVenuesTitle') : t('podRequests.fromHostsTitle')}
        testID="pod-requests-title"
      />
      <DuncitButton
        testID="pod-requests-search"
        label={searchLabel}
        variant="outline"
        icon={<MaterialIcons name="travel-explore" size={18} color={primary} />}
        onPress={() => navigation.navigate(isHost ? 'NearbyVenues' : 'NearbyHosts')}
      />
      <GiftCardSegmented options={options} value={tab} onChange={setTab} />
      {problem ? (
        <Text role="alert" testID="pod-requests-error" fontSize={13} color="$danger">
          {problem}
        </Text>
      ) : null}
      {isLoading ? (
        <Spinner role="progressbar" aria-label={t('mweb.a11y.loading')} color="$primary" />
      ) : null}
      {!isLoading && tab === 'REQUESTS' ? (
        <PodRequestList
          requests={incoming}
          emptyText={t('podRequests.emptyIncoming')}
          testID="pod-requests-incoming"
          renderActions={(request) => (
            <RespondButtons
              acceptLabel={t('podRequests.accept')}
              declineLabel={t('podRequests.decline')}
              busy={actions.busy}
              onAnswer={(accept) => fireAndForget(answer(request.id, accept))}
              testID={`pod-request-respond-${request.id}`}
            />
          )}
        />
      ) : null}
      {!isLoading && tab === 'ACCEPTED' ? (
        <PodRequestList
          requests={accepted}
          emptyText={t('podRequests.emptyAccepted')}
          testID="pod-requests-accepted"
        />
      ) : null}
      <HostSectionHeader
        title={isHost ? t('podRequests.sentToVenuesTitle') : t('podRequests.sentToHostsTitle')}
        count={sent.length}
        testID="pod-requests-sent-title"
      />
      {isLoading ? null : (
        <PodRequestList
          requests={sent}
          emptyText={t('podRequests.emptySent')}
          testID="pod-requests-sent"
        />
      )}
    </YStack>
  );
}
