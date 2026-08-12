import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { CompanionsChecklist, type ChecklistPerson } from './CompanionsChecklist';
import type { HostTicketScanResult } from './scan.types';

interface Props {
  /** The scan that just marked attendance — null keeps the overlay hidden. */
  result: HostTicketScanResult | null;
  /** The headline the scan pane also shows ("Suryansh and 1 more are checked in."). */
  text: string;
  onDone: () => void;
}

/** Buyer first, then every companion on file — each with a green tick. */
function toPeople(result: HostTicketScanResult): ChecklistPerson[] {
  const people: ChecklistPerson[] = [];
  if (result.attendee) {
    people.push({
      key: result.attendee.user_id,
      primary: result.attendee.full_name,
      secondary: result.ticket?.ticket_code,
    });
  }
  people.push(
    ...(result.companions ?? []).map((companion) => ({
      key: `${companion.phone_number}-${companion.name}`,
      primary: companion.name,
      secondary: companion.phone_number,
    })),
  );
  return people;
}

/**
 * The unmissable "it worked": a confirmation the moment a scan marks
 * attendance, listing everyone the ticket just admitted with a green tick —
 * the Tamagui twin of mWeb's ScanConfirmationDialog (rule 27).
 */
export function ScanConfirmation({ result, text, onDone }: Readonly<Props>) {
  const { success, onPrimary } = useThemeColors();
  const { t } = useTranslation();
  if (!result) return null;
  return (
    <YStack
      testID="scan-confirmation"
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      alignItems="center"
      justifyContent="center"
      backgroundColor="rgba(0,0,0,0.6)"
      zIndex={10}
    >
      <YStack
        width="88%"
        maxWidth={420}
        backgroundColor="$background"
        borderRadius={16}
        padding={18}
        gap={12}
        alignItems="center"
      >
        <MaterialIcons name="check-circle" size={56} color={success} />
        <Text fontSize={17} fontWeight="700" color="$color">
          {t('mweb.hostScan.attendanceMarked')}
        </Text>
        <Text fontSize={13} color="$muted" textAlign="center">
          {text}
        </Text>
        <YStack alignSelf="stretch">
          <CompanionsChecklist title={t('mweb.hostScan.checkedInList')} people={toPeople(result)} />
        </YStack>
        <XStack
          testID="scan-confirmation-done"
          role="button"
          aria-label="Done"
          onPress={onDone}
          alignSelf="stretch"
          height={46}
          alignItems="center"
          justifyContent="center"
          borderRadius={12}
          backgroundColor="$primary"
          pressStyle={{ opacity: 0.85 }}
        >
          <Text fontSize={14} fontWeight="700" color={onPrimary}>
            {t('mweb.hostScan.confirmDone')}
          </Text>
        </XStack>
      </YStack>
    </YStack>
  );
}
