import { Text, YStack } from 'tamagui';
import type { PodChangeRow } from '@duncit/utils';

import { NoticeCard } from '@/components/attendance/NoticeCard';
import { ChangeRequestCard } from '@/components/change-requests/ChangeRequestCard';

/** A titled list with its own empty line. Hoisted (never a nested component). */
export function BoardList({
  title,
  emptyText,
  rows,
  testID,
  busy,
  when,
  filedOn,
  onApprove,
  onPass,
  onWithdraw,
}: Readonly<{
  title: string;
  emptyText: string;
  rows: readonly PodChangeRow[];
  testID: string;
  busy: boolean;
  when: (iso: string) => string;
  filedOn: (iso: string) => string;
  onApprove?: (row: PodChangeRow) => void;
  onPass?: (row: PodChangeRow) => void;
  onWithdraw?: (row: PodChangeRow) => void;
}>) {
  return (
    <YStack testID={testID} gap={12}>
      <Text testID={`${testID}-title`} role="heading" fontSize={16} fontWeight="600" color="$color">
        {title}
      </Text>
      {rows.length === 0 ? (
        <NoticeCard tone="info" title={emptyText} />
      ) : (
        rows.map((row) => (
          <ChangeRequestCard
            key={row.id}
            row={row}
            testID={`${testID}-${row.id}`}
            when={when(row.pod.pod_date_time)}
            filedOn={filedOn(row.created_at)}
            busy={busy}
            onApprove={onApprove ? () => onApprove(row) : undefined}
            onPass={onPass ? () => onPass(row) : undefined}
            onWithdraw={onWithdraw ? () => onWithdraw(row) : undefined}
          />
        ))
      )}
    </YStack>
  );
}
