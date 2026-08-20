import { useState } from 'react';
import { ScrollView } from 'tamagui';
import { autoPodActionable, type AutoPodRow } from '@duncit/utils';

import { StackScreen } from '@/components/StackScreen';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { AutoPodQueue, HostClaimSheet } from '@/components/auto-pods';
import { useAutoPodScreen } from '@/hooks/useAutoPodScreen';

/**
 * Host Studio > Auto Pods — offers a venue has already dated, waiting for a
 * host to take them.
 *
 * The venue, date and price are fixed by then, so the host is agreeing to run
 * it rather than designing it, and each card carries what they would earn under
 * their own rates.
 *
 * The mWeb twin is `/host/auto-pods` (rule 27).
 */
export function HostAutoPodsScreen() {
  const { labels, formatWhen, formatMoney, rows, isLoading, hasError, refetch } =
    useAutoPodScreen('host');
  const [offer, setOffer] = useState<AutoPodRow | null>(null);

  const renderAction = (row: AutoPodRow) =>
    autoPodActionable(row, 'host') ? (
      <PillButton
        testID={`auto-pod-assign-${row.id}`}
        label={labels.assignMyselfCta}
        onPress={() => setOffer(row)}
        variant="solid"
        disabled={false}
      />
    ) : null;

  return (
    <StackScreen title={labels.hostTitle} testID="host-auto-pods-screen">
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        <AutoPodQueue
          role="host"
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

      <HostClaimSheet
        row={offer}
        labels={labels}
        onClose={() => setOffer(null)}
        onAssigned={() => {
          setOffer(null);
          // Hosts race each other for the same offer, so the queue is re-read
          // rather than patched.
          refetch();
        }}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
      />
    </StackScreen>
  );
}
