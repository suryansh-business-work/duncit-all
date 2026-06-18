import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { TicketForm } from '@/components/support/TicketForm';
import { MyTicketsList } from '@/components/support/MyTicketsList';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useMeStore } from '@/stores/me.store';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Create Support Tickets — opens straight onto the form (mWeb parity), with the
 * "help squad" reassurance and a "maybe answered already?" shortcut to FAQs. The
 * user's existing tickets live on the All Support Tickets screen, not here.
 */
export function SupportTicketsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const me = useMeStore((s) => s.data?.me);
  const { onPrimary, success } = useThemeColors();

  return (
    <StackScreen title="Create Support Tickets" testID="support-tickets-screen">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}>
        <Text testID="tickets-subtitle" fontSize={13} color="$muted">
          Raise an issue with our team
        </Text>

        <XStack
          testID="tickets-help-banner"
          alignItems="center"
          gap={12}
          padding={14}
          borderRadius={16}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
        >
          <YStack
            width={36}
            height={36}
            borderRadius={18}
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
          >
            <MaterialIcons name="support-agent" size={20} color={onPrimary} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize={14} fontWeight="900" color="$color">
              Help squad is ready
            </Text>
            <Text fontSize={12} color="$muted">
              Average reply within 24 hours
            </Text>
          </YStack>
          <XStack
            paddingHorizontal={10}
            paddingVertical={4}
            borderRadius={999}
            backgroundColor={success}
          >
            <Text fontSize={11} fontWeight="900" color="#ffffff">
              Live
            </Text>
          </XStack>
        </XStack>

        <XStack
          testID="tickets-faq-banner"
          role="button"
          aria-label="Read FAQs"
          onPress={() => navigation.navigate('Faqs')}
          alignItems="center"
          gap={10}
          padding={14}
          borderRadius={16}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
          pressStyle={{ opacity: 0.85 }}
        >
          <MaterialIcons name="help-outline" size={22} color={success} />
          <YStack flex={1}>
            <Text fontSize={14} fontWeight="900" color="$color">
              Maybe answered already?
            </Text>
            <Text fontSize={12} color="$muted">
              Tap to read quick answers before sending a ticket.
            </Text>
          </YStack>
        </XStack>

        <TicketForm
          initialName={me?.full_name || ''}
          initialEmail={me?.email || ''}
          onCreated={(id) => navigation.navigate('TicketDetails', { ticketId: id })}
        />

        <MyTicketsList />
      </ScrollView>
    </StackScreen>
  );
}
