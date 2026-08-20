import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView } from 'tamagui';
import { autoPodActionable, type AutoPodRow } from '@duncit/utils';

import { StackScreen } from '@/components/StackScreen';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { AutoPodQueue, VenueAcceptSheet } from '@/components/auto-pods';
import { useAutoPodScreen } from '@/hooks/useAutoPodScreen';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Venue Studio > Auto Pods — the offers a venue may take.
 *
 * A venue enrols FIRST: nothing else can happen until one commits a date, so
 * this queue is where an Auto Pod stops being an idea. Accepting books one of
 * the venue's own free slots in the same step.
 *
 * The mWeb twin is `/venues/auto-pods` (rule 27); the logic both read is
 * `@duncit/utils`' auto-pod helpers.
 */
export function VenueAutoPodsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { labels, formatWhen, formatMoney, rows, isLoading, hasError, refetch } =
    useAutoPodScreen('venue');
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
