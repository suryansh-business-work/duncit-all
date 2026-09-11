import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { grievanceTicketFieldCopy } from '@duncit/i18n';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/**
 * What the ticket field becomes when the user has never contacted support.
 *
 * There is nothing to escalate, so the field is replaced by the way forward
 * rather than by an empty dropdown — the RN twin of the warning mWeb shows in
 * the same spot, down to the same three sentences.
 */
export function GrievanceTicketEmpty() {
  const { t } = useTranslation();
  const { warning } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const copy = grievanceTicketFieldCopy(t);

  return (
    <YStack
      testID="grievance-ticket-empty"
      gap={8}
      padding={14}
      borderRadius={18}
      backgroundColor="$soft"
    >
      <XStack gap={8} alignItems="center">
        <MaterialIcons name="confirmation-number" size={18} color={warning} />
        <Text flex={1} fontSize={14} fontWeight="600" color="$color">
          {copy.emptyTitle}
        </Text>
      </XStack>
      <Text fontSize={12} color="$muted">
        {copy.emptyBody}
      </Text>
      <DuncitButton
        testID="grievance-ticket-empty-cta"
        size="sm"
        label={copy.emptyCta}
        onPress={() => navigation.navigate('SupportTickets')}
      />
    </YStack>
  );
}
