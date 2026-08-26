import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, YStack } from 'tamagui';
import { autoPodActionable, type AutoPodRow } from '@duncit/utils';

import { StackScreen } from '@/components/StackScreen';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { AutoPodLocationRow, AutoPodQueue, VenueAcceptSheet } from '@/components/auto-pods';
import { useAutoPodScreen } from '@/hooks/useAutoPodScreen';
import { useLocations } from '@/hooks/useLocations';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Venue Studio > Auto Pods — the offers a venue may take.
 *
 * A venue may enrol at any point: first, and its city pins the offer, or after
 * a host or club has, in which case only a venue in that city is offered it.
 * Accepting books one of the venue's own free slots in the same step. The
 * header's city narrows the queue to offers pinned there plus every unpinned
 * one.
 *
 * The mWeb twin is `/venues/auto-pods` (rule 27); the logic both read is
 * `@duncit/utils`' auto-pod helpers.
 */
export function VenueAutoPodsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { selectedId } = useLocations();
  const { labels, formatWhen, formatMoney, rows, isLoading, hasError, refetch } = useAutoPodScreen(
    'venue',
    { locationId: selectedId },
  );
  const [offer, setOffer] = useState<AutoPodRow | null>(null);

  const renderAction = (row: AutoPodRow) =>
    autoPodActionable(row, 'venue') ? (
      <PillButton
        testID={`auto-pod-accept-${row.id}`}
        label={labels.acceptCta}
        onPress={() => setOffer(row)}
        variant="solid"
        disabled={false}
      />
    ) : null;

  return (
    <StackScreen title={labels.venueTitle} testID="venue-auto-pods-screen">
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        <YStack gap={14}>
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
          />
        </YStack>
      </ScrollView>

      <VenueAcceptSheet
        row={offer}
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
