import { useState } from 'react';
import { ScrollView, YStack } from 'tamagui';
import { autoPodActionable, type AutoPodRow } from '@duncit/utils';

import { StackScreen } from '@/components/StackScreen';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import {
  AutoPodCategoryChips,
  AutoPodLocationRow,
  AutoPodQueue,
  HostClaimSheet,
} from '@/components/auto-pods';
import { useAutoPodScreen } from '@/hooks/useAutoPodScreen';
import { useLocations } from '@/hooks/useLocations';

/**
 * Host Studio > Auto Pods — offers in the host's approved sub-categories,
 * waiting for a host to take them.
 *
 * A host may enrol at any point. On an offer nobody has enrolled in yet, the
 * host's city — the one chosen in the header — is what pins it, which is why
 * "Assign Myself" needs a city selected. Whatever a venue has already fixed
 * (date, price) is shown, along with what the host would earn under their own
 * rates.
 *
 * The mWeb twin is `/host/auto-pods` (rule 27).
 */
export function HostAutoPodsScreen() {
  const { selectedId, cityLabel } = useLocations();
  const [subCategoryId, setSubCategoryId] = useState('');
  const { labels, formatWhen, formatMoney, rows, isLoading, hasError, refetch } = useAutoPodScreen(
    'host',
    { locationId: selectedId, subCategoryId },
  );
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
        <YStack gap={14}>
          <AutoPodLocationRow labels={labels} />
          <AutoPodCategoryChips value={subCategoryId} onChange={setSubCategoryId} labels={labels} />
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
        </YStack>
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
        locationId={selectedId}
        locationLabel={cityLabel}
      />
    </StackScreen>
  );
}
