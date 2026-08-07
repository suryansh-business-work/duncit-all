import { Text, XStack, YStack } from 'tamagui';
import type { PublicGrievanceOfficer } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  officer?: PublicGrievanceOfficer;
}

/**
 * The published Grievance Officer — the RN twin of mWeb's card.
 *
 * Under the form, not above it: someone on this screen came to complain, not
 * to read a contact card. Until Legal fills the details in it says so, rather
 * than rendering an empty block that looks broken.
 */
export function GrievanceOfficerCard({ officer }: Readonly<Props>) {
  const { t } = useTranslation();
  const rows: [string, string][] = [
    [t('grievance.officerName'), officer?.name ?? ''],
    [t('grievance.officerEmail'), officer?.email ?? ''],
    [t('grievance.officerPhone'), officer?.phone ?? ''],
    [t('grievance.officerAddress'), officer?.address ?? ''],
  ];
  const filled = rows.filter(([, value]) => value.trim().length > 0);

  return (
    <YStack
      testID="grievance-officer"
      gap={6}
      padding={14}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <Text fontSize={13} fontWeight="700" color="$color">
        {t('grievance.officerTitle')}
      </Text>
      {filled.length === 0 ? (
        <Text fontSize={12.5} color="$muted">
          {t('grievance.officerEmpty')}
        </Text>
      ) : (
        filled.map(([label, value]) => (
          <XStack key={label} gap={12} justifyContent="space-between">
            <Text fontSize={12.5} color="$muted">
              {label}
            </Text>
            <Text fontSize={12.5} color="$color" flexShrink={1} textAlign="right">
              {value}
            </Text>
          </XStack>
        ))
      )}
    </YStack>
  );
}
