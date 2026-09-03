import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, YStack } from 'tamagui';
import { autoPodActionable, autoPodWithdrawable, type AutoPodRow } from '@duncit/utils';

import { StackScreen } from '@/components/StackScreen';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import {
  AutoPodLocationRow,
  AutoPodQueue,
  AutoPodVenueRow,
  AutoPodWithdrawSheet,
  VenueAcceptSheet,
} from '@/components/auto-pods';
import { useAutoPodScreen } from '@/hooks/useAutoPodScreen';
import type { AutoPodVenueOption } from '@/hooks/useAutoPodVenues';
import { useLocations } from '@/hooks/useLocations';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Venue Studio > Auto Pods — the offers a venue may take.
 *
 * The venue picked at the top is the one looking: the offers are what THAT
 * venue could take (its category, its city), each card counting down the
 * window Pod Settings gives the offer. Accepting picks one of the venue's free
 * slots in the next few days, nearest first, priced as the venue would be paid
 * — in one step. The venue goes first: hosts are offered the pod only once
 * the slot is fixed, and an accepted offer sits under "Assigned slot" with a
 * Cancel until a host and a club admin are on it. The header's city narrows
 * the queue to offers pinned there plus every unpinned one.
 *
 * The mWeb twin is `/venues/auto-pods` (rule 27); the logic both read is
 * `@duncit/utils`' auto-pod helpers.
 */
export function VenueAutoPodsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { selectedId } = useLocations();
  const [venue, setVenue] = useState<AutoPodVenueOption | null>(null);
  const { labels, formatWhen, formatMoney, rows, isLoading, hasError, refetch } = useAutoPodScreen(
    'venue',
    { locationId: selectedId, venueId: venue?.id },
  );
  const [offer, setOffer] = useState<AutoPodRow | null>(null);
  const [withdrawing, setWithdrawing] = useState<AutoPodRow | null>(null);

  const renderMineAction = (row: AutoPodRow) =>
    autoPodWithdrawable(row, 'venue') ? (
      <PillButton
        testID={`auto-pod-withdraw-${row.id}`}
        label={labels.withdrawCta}
        onPress={() => setWithdrawing(row)}
        variant="ghost"
        disabled={false}
      />
    ) : null;

  const renderAction = (row: AutoPodRow) =>
    autoPodActionable(row, 'venue') ? (
      <PillButton
        testID={`auto-pod-accept-${row.id}`}
        label={labels.acceptCta}
        onPress={() => setOffer(row)}
        variant="solid"
        disabled={!venue}
      />
    ) : null;

  return (
    <StackScreen title={labels.venueTitle} testID="venue-auto-pods-screen">
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        <YStack gap={14}>
          <AutoPodVenueRow value={venue} onChange={setVenue} labels={labels} />
          <AutoPodLocationRow labels={labels} />
          <AutoPodQueue
            role="venue"
            rows={rows}
            labels={labels}
            loading={isLoading}
            error={hasError}
            onRetry={refetch}
            formatWhen={formatWhen}
            formatMoney={formatMoney}
            renderAction={renderAction}
            renderMineAction={renderMineAction}
          />
        </YStack>
      </ScrollView>

      <AutoPodWithdrawSheet
        row={withdrawing}
        role="venue"
        labels={labels}
        onClose={() => setWithdrawing(null)}
        onWithdrawn={() => {
          setWithdrawing(null);
          refetch();
        }}
      />

      <VenueAcceptSheet
        row={offer}
        venue={venue}
        labels={labels}
        onClose={() => setOffer(null)}
        onAccepted={() => {
          setOffer(null);
          // The slot is committed server-side; re-read rather than patch, so a
          // race lost to another venue shows as lost.
          refetch();
        }}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
        onAddAvailability={() => {
          setOffer(null);
          navigation.navigate('VenueManage');
        }}
      />
    </StackScreen>
  );
}
