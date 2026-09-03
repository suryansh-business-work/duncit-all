import { Text, YStack } from 'tamagui';
import type { PodChangeRole } from '@duncit/utils';

import { ChangeRequestBoard } from '@/components/change-requests/ChangeRequestBoard';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * The Change Requests section a partner studio shows — the Tamagui twin of
 * mWeb's `StudioChangeRequests` (rule 27).
 *
 * ONE component for all three studios: the board is shared, and what a studio
 * adds is the heading and the role to scope it to, so a venue owner is never
 * shown a host's queue and three copies of the same six lines never drift.
 */
export function StudioChangeRequests({ role }: Readonly<{ role: PodChangeRole }>) {
  const { t } = useTranslation();

  return (
    <YStack
      testID={`studio-change-requests-${role}`}
      gap={10}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <YStack gap={2}>
        <Text fontSize={16} fontWeight="700" color="$color">
          {t('changeRequest.sectionTitle')}
        </Text>
        <Text fontSize={11.5} color="$muted">
          {t('changeRequest.sectionSubtitle')}
        </Text>
      </YStack>
      <ChangeRequestBoard role={role} testID={`change-requests-${role}`} />
    </YStack>
  );
}
