import { useCallback } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { Text, XStack, YStack } from 'tamagui';
import { formatMoney, type StatusTone } from '@duncit/utils';

import { TableSortDir } from '@/generated/graphql/graphql';
import { ClubAdminPodPaymentsDocument } from '@/graphql/club-pod-details';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTablePage } from '@/hooks/useTablePage';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { LoadMoreButton } from '../LoadMoreButton';
import { ToneChip } from '../ToneChip';
import { useToneColors } from '../tone';
import { PodDetailSection } from './PodDetailSection';

const PAGE_SIZE = 20;

type PaymentRow = ResultOf<
  typeof ClubAdminPodPaymentsDocument
>['clubAdminPodPayments']['rows'][number];

/** The tone each payment state takes — the native side of the MUI table's
 * `PAYMENT_STATUS_COLORS`, so a payment is never green here and amber there. */
const STATUS_TONES: Readonly<Record<string, StatusTone>> = {
  SUCCESS: 'success',
  PENDING: 'warning',
  FAILED: 'error',
  REFUNDED: 'info',
};

interface RowProps {
  row: PaymentRow;
  /** Resolved chip colour, mapped once in the parent. */
  statusColor: string;
  /** `paid_at` (else `created_at`) in the admin's date/time settings (rule 11). */
  when: string;
  divided: boolean;
}

/** One transaction: its reference, who paid, how much, and what became of it. */
function PaymentLine({ row, statusColor, when, divided }: Readonly<RowProps>) {
  return (
    <YStack
      testID={`club-pod-detail-payment-${row.id}`}
      gap={4}
      paddingVertical={10}
      borderTopWidth={divided ? 1 : 0}
      borderTopColor="$borderColor"
    >
      <XStack alignItems="center" gap={8}>
        <Text flex={1} fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
          {row.user_name}
        </Text>
        <Text fontSize={14} fontWeight="600" color="$color">
          {formatMoney(row.total, { symbol: row.currency_symbol, decimals: 2, grouping: false })}
        </Text>
      </XStack>
      <XStack alignItems="center" gap={8} flexWrap="wrap">
        <ToneChip
          testID={`club-pod-detail-payment-${row.id}-status`}
          label={row.status}
          color={statusColor}
        />
        <Text fontSize={12} color="$muted" numberOfLines={1}>
          {when}
        </Text>
      </XStack>
      <Text fontSize={12} color="$muted" numberOfLines={1}>
        {[row.invoice_no ?? row.payment_id, row.user_email, row.gateway]
          .filter(Boolean)
          .join(' · ')}
      </Text>
    </YStack>
  );
}

/**
 * Every payment transaction of this pod — bookings, failures and refunds.
 *
 * The pod travels as its own argument rather than as a filter inside the table
 * query: that input can express "every payment on the platform", so the
 * narrowing is applied server-side where a caller cannot widen it. The Tamagui
 * twin of `@duncit/pod-details`' `PodPaymentsSection` (rule 27).
 */
export function PodDetailPayments({ podId }: Readonly<{ podId: string }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const tones: Record<StatusTone, string> = useToneColors();

  const fetcher = useCallback(
    (page: number) =>
      graphqlRequest(
        ClubAdminPodPaymentsDocument,
        {
          pod_doc_id: podId,
          query: {
            page,
            page_size: PAGE_SIZE,
            sort_by: 'created_at',
            sort_dir: TableSortDir.Desc,
          },
        },
        { auth: true },
      ).then((res) => res.clubAdminPodPayments),
    [podId],
  );
  const payments = useTablePage(fetcher);
  const settled = !payments.isLoading && !payments.hasError;
  const empty =
    settled && payments.rows.length === 0
      ? t('podDetailsPanel.podPaymentsSection.noPaymentsRecordedForThisPod')
      : null;

  return (
    <PodDetailSection
      title={t('podDetailsPanel.podPaymentsSection.paymentsAndTransactions')}
      testID="club-pod-detail-payments"
      badge={payments.total}
      isLoading={payments.isLoading}
      hasError={payments.hasError}
      onRetry={payments.refetch}
      emptyText={empty}
    >
      {payments.rows.map((row, index) => (
        <PaymentLine
          key={row.id}
          row={row}
          statusColor={tones[STATUS_TONES[row.status] ?? 'default']}
          when={formatDateTime(row.paid_at ?? row.created_at)}
          divided={index > 0}
        />
      ))}
      {payments.hasMore ? (
        <LoadMoreButton
          testID="club-pod-detail-payments-more"
          busy={payments.isLoadingMore}
          onPress={payments.loadMore}
        />
      ) : null}
    </PodDetailSection>
  );
}
