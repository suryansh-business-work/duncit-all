import { StackScreen } from '@/components/StackScreen';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { PodRequestsSection } from '@/components/pod-requests/PodRequestsSection';
import { PartnerSide } from '@/generated/graphql/graphql';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Studio menu → Requests → Pod Requests: the inbox that used to live only
 * inside Host / Venue Studio, given its own screen so the menu opens it
 * directly. The section is the one the studio screen shows — not a copy.
 * mWeb twin: pages/pod-requests/PodRequestsPage.
 */
function PodRequestsScreen({ side, testID }: Readonly<{ side: PartnerSide; testID: string }>) {
  const { t } = useTranslation();
  return (
    <StackScreen title={t('mweb.studioNav.podRequests')} testID={testID}>
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <PodRequestsSection side={side} />
      </RefreshScrollView>
    </StackScreen>
  );
}

/** Host Studio → Requests → Pod Requests (/host/pod-requests). */
export function HostPodRequestsScreen() {
  return <PodRequestsScreen side={PartnerSide.Host} testID="host-pod-requests-screen" />;
}

/** Venue Studio → Requests → Pod Requests (/venues/pod-requests). */
export function VenuePodRequestsScreen() {
  return <PodRequestsScreen side={PartnerSide.Venue} testID="venue-pod-requests-screen" />;
}
