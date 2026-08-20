import { useState } from 'react';
import { ScrollView } from 'tamagui';
import { autoPodActionable, type AutoPodRow } from '@duncit/utils';

import { StackScreen } from '@/components/StackScreen';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { AutoPodQueue, ClubClaimSheet } from '@/components/auto-pods';
import { useAutoPodScreen } from '@/hooks/useAutoPodScreen';

/**
 * Club Admin > Auto Pods — offers a venue has dated, waiting to be attached to
 * a club.
 *
 * The club is what gives the resulting pod its category, so the sheet only
 * offers clubs in the Auto Pod's own sub-category. Claiming is the last of the
 * three enrolments: once a club is on it, the pod materializes and goes live.
 *
 * The mWeb twin is `/clubs/auto-pods` (rule 27).
 */
export function ClubAutoPodsScreen() {
  const { labels, formatWhen, formatMoney, rows, isLoading, hasError, refetch } =
    useAutoPodScreen('club');
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
