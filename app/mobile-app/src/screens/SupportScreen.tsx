import type { ComponentProps } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

type CardRoute = 'SupportTickets' | 'Sos' | 'Callback' | 'ChatWithUs' | 'AllSupportTickets';

interface Card {
  id: string;
  title: string;
  desc: string;
  icon: IconName;
  /** Per-section accent (matches mWeb's SUPPORT_SECTIONS colours), so the icons
   * are multi-coloured rather than all one brand colour. */
  color: string;
  route?: CardRoute;
  soon?: boolean;
}

// Items + order mirror mWeb's support hub. FAQs and Policies are NOT here —
// they live in the account drawer (useMenuItems) / Policies group, same as mWeb.
const CARDS: Card[] = [
  {
    id: 'sos',
    title: 'SOS',
    desc: 'Emergency help at your live pod',
    icon: 'sos',
    color: '#f44336',
    route: 'Sos',
  },
  {
    id: 'callback',
    title: 'Callback Request',
    desc: 'Call us or get a callback',
    icon: 'phone-callback',
    color: '#2196f3',
    route: 'Callback',
  },
  {
    id: 'tickets',
    title: 'Create Support Tickets',
    desc: 'Raise an issue with our team',
    icon: 'confirmation-number',
    color: '#ff4f73',
    route: 'SupportTickets',
  },
  {
    id: 'chat',
    title: 'Chat with Us',
    desc: 'Real-time chat with our support team',
    icon: 'chat',
    color: '#4caf50',
    route: 'ChatWithUs',
  },
  {
    id: 'all',
    title: 'All Support Tickets',
    desc: 'Every request you have raised, in one list',
    icon: 'history',
    color: '#7c5cff',
    route: 'AllSupportTickets',
  },
];

/** Support hub — cards linking to SOS, callback, feedback, tickets, FAQs, policies.
 * RN twin of mWeb's SupportHubPage. */
export function SupportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { muted } = useThemeColors();

  return (
    <StackScreen title="Support" testID="support-screen">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <Text testID="support-intro" fontSize={13} color="$muted" marginBottom={2}>
          Get help, raise a ticket, or reach us in an emergency.
        </Text>
        {CARDS.map((card) => (
          <XStack
            key={card.id}
            testID={`support-${card.id}`}
            role="button"
            aria-label={card.title}
            onPress={() => card.route && navigation.navigate(card.route as 'Sos')}
            alignItems="center"
            gap={14}
            padding={14}
            borderRadius={16}
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$surface"
            pressStyle={{ opacity: 0.85 }}
          >
            <YStack
              width={44}
              height={44}
              borderRadius={14}
              backgroundColor={card.color}
              alignItems="center"
              justifyContent="center"
            >
              <MaterialIcons name={card.icon} size={22} color="#ffffff" />
            </YStack>
            <YStack flex={1} gap={2}>
              <Text fontSize={15} fontWeight="900" color="$color">
                {card.title}
              </Text>
              <Text fontSize={12.5} color="$muted">
                {card.desc}
              </Text>
            </YStack>
            <MaterialIcons name="chevron-right" size={22} color={muted} />
          </XStack>
        ))}
      </ScrollView>
    </StackScreen>
  );
}
