import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { grievanceTicketFieldCopy } from '@duncit/i18n';
import { Button, Text, XStack, YStack } from 'tamagui';

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
  const { warning, onPrimary } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const copy = grievanceTicketFieldCopy(t);

  return (
    <YStack
      testID="grievance-ticket-empty"
      gap={8}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor={warning}
      backgroundColor={`${warning}22`} // ~13% tint — mirrors MUI's filled Alert
    >
      <XStack gap={8} alignItems="center">
        <MaterialIcons name="confirmation-number" size={18} color={warning} />
        <Text flex={1} fontSize={13} fontWeight="700" color={warning}>
          {copy.emptyTitle}
        </Text>
      </XStack>
      <Text fontSize={12} color="$muted">
        {copy.emptyBody}
      </Text>
      <Button
        testID="grievance-ticket-empty-cta"
        theme="active"
        size="$3"
        borderRadius={10}
        color={onPrimary}
        onPress={() => navigation.navigate('SupportTickets')}
      >
        {copy.emptyCta}
      </Button>
    </YStack>
  );
}
