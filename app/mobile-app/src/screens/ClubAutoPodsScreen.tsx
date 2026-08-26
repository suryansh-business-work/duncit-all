import { useState } from 'react';
import { ScrollView, YStack } from 'tamagui';
import { autoPodActionable, type AutoPodRow } from '@duncit/utils';

import { StackScreen } from '@/components/StackScreen';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { AutoPodLocationRow, AutoPodQueue, ClubClaimSheet } from '@/components/auto-pods';
import { useAutoPodScreen } from '@/hooks/useAutoPodScreen';
import { useLocations } from '@/hooks/useLocations';

/**
 * Club Admin > Auto Pods — offers in the categories this admin's clubs carry,
 * waiting to be attached to one.
 *
 * The club is what gives the resulting pod its category, so the sheet only
 * offers clubs in the Auto Pod's own sub-category — and, once the offer is
 * pinned to a city, only clubs in that city. A club may enrol at any point;
 * once all three partners are on it, the pod materializes and goes live.
 *
 * The mWeb twin is `/clubs/auto-pods` (rule 27).
 */
export function ClubAutoPodsScreen() {
  const { selectedId } = useLocations();
  const { labels, formatWhen, formatMoney, rows, isLoading, hasError, refetch } = useAutoPodScreen(
    'club',
    { locationId: selectedId },
  );
  // The offer is held by id, not by value: the row carries `sub_category_id`
  // (which the club filter needs) and re-reading it from `rows` keeps the sheet
  // showing what the server last said rather than a stale copy.
  const [offerId, setOfferId] = useState<string | null>(null);
  const offer = rows.find((row) => row.id === offerId) ?? null;

  const renderAction = (row: AutoPodRow) =>
    autoPodActionable(row, 'club') ? (
      <PillButton
        testID={`auto-pod-claim-${row.id}`}
        label={labels.claimForClubCta}
        onPress={() => setOfferId(row.id)}
        variant="solid"
        disabled={false}
      />
    ) : null;

  return (
    <StackScreen title={labels.clubTitle} testID="club-auto-pods-screen">
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        <YStack gap={14}>
          <AutoPodLocationRow labels={labels} />
          <AutoPodQueue
            role="club"
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

      <ClubClaimSheet
        row={offer}
        subCategoryId={offer?.sub_category_id ?? null}
        labels={labels}
        onClose={() => setOfferId(null)}
        onClaimed={() => {
          setOfferId(null);
          refetch();
        }}
        formatWhen={formatWhen}
      />
    </StackScreen>
  );
}
