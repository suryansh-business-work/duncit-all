import type { ReactNode } from 'react';
import { Text, YStack } from 'tamagui';

import type { PodRequestRow as Row } from '@/hooks/usePodRequests';
import { PodRequestRow } from './PodRequestRow';

interface Props {
  requests: readonly Row[];
  emptyText: string;
  testID: string;
  renderActions?: (request: Row) => ReactNode;
}

/** A studio's list of requests, or the one line that says it is empty. */
export function PodRequestList({ requests, emptyText, testID, renderActions }: Readonly<Props>) {
  if (requests.length === 0) {
    return (
      <Text testID={`${testID}-empty`} role="status" fontSize={14} color="$muted">
        {emptyText}
      </Text>
    );
  }
  return (
    <YStack gap={10} testID={testID}>
      {requests.map((request) => (
        <PodRequestRow key={request.id} request={request} actions={renderActions?.(request)} />
      ))}
    </YStack>
  );
}
