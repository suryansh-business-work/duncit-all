import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { YStack } from 'tamagui';
import { autoPodActionable, autoPodWithdrawable, type AutoPodRow } from '@duncit/utils';

import { StackScreen } from '@/components/StackScreen';
import { DuncitButton } from '@/components/DuncitButton';
import {
  AutoPodLocationRow,
  AutoPodQueue,
  AutoPodWithdrawSheet,
  ClubClaimSheet,
} from '@/components/auto-pods';
import { useAutoPodScreen } from '@/hooks/useAutoPodScreen';
import { useLocations } from '@/hooks/useLocations';
import { RefreshScrollView } from '@/components/PullToRefresh';
import type { RootStackParamList } from '@/navigation/types';

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
  const [withdrawing, setWithdrawing] = useState<AutoPodRow | null>(null);

  // Enrolments happen in any order, so a club is often not the last partner in
  // and its claim can still be taken back, at the same Account Health cost.
  // Once everyone has enrolled the offer HAS materialized into a pod, and the
  // row is the only place that says so — without this an admin had to go and
  // find it in the club's pods list (rule 27: the portals link out here too).
  const renderMineAction = (row: AutoPodRow) => {
    const clubId = row.club_claim?.club_id;
    // Read into consts so the press handler closes over NARROWED values —
    // TypeScript cannot carry a `row.pod_id &&` guard into a closure, and the
    // alternative is a cast that asserts what the guard already proved.
    const podId = row.pod_id;
    return (
      <YStack gap={8}>
        {podId && clubId ? (
          <DuncitButton
            testID={`auto-pod-view-${row.id}`}
            label={labels.viewPod}
            onPress={() => navigation.navigate('ClubPodDetails', { clubId, podId })}
            variant="outline"
            tone="neutral"
            fullWidth
          />
        ) : null}
        {autoPodWithdrawable(row, 'club') ? (
          <DuncitButton
            testID={`auto-pod-withdraw-${row.id}`}
            label={labels.withdrawCta}
            onPress={() => setWithdrawing(row)}
            variant="outline"
            tone="neutral"
            fullWidth
          />
        ) : null}
      </YStack>
    );
  };

  const renderAction = (row: AutoPodRow) =>
    autoPodActionable(row, 'club') ? (
      <DuncitButton
        testID={`auto-pod-claim-${row.id}`}
        label={labels.claimForClubCta}
        onPress={() => setOfferId(row.id)}
        fullWidth
      />
    ) : null;

  return (
    <StackScreen title={labels.clubTitle} testID="club-auto-pods-screen">
      <RefreshScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <YStack gap={20}>
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
            renderMineAction={renderMineAction}
          />
        </YStack>
      </RefreshScrollView>

      <AutoPodWithdrawSheet
        row={withdrawing}
        role="club"
        labels={labels}
        onClose={() => setWithdrawing(null)}
        onWithdrawn={() => {
          setWithdrawing(null);
          refetch();
        }}
      />

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
