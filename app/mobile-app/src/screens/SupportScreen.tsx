import type { ComponentProps } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

type CardRoute =
  | 'SupportTickets'
  | 'Faqs'
  | 'Policies'
  | 'Sos'
  | 'Callback'
  | 'ChatWithUs'
  | 'AllSupportTickets';

interface Card {
  id: string;
  title: string;
  desc: string;
  icon: IconName;
  route?: CardRoute;
  soon?: boolean;
}

const CARDS: Card[] = [
  { id: 'sos', title: 'SOS', desc: 'Emergency help at your live pod', icon: 'sos', route: 'Sos' },
  {
    id: 'callback',
    title: 'Request a Callback',
    desc: 'Call us or get a callback',
    icon: 'phone-callback',
    route: 'Callback',
  },
  {
    id: 'chat',
    title: 'Chat with Us',
    desc: 'Real-time chat with our support team',
    icon: 'chat',
    route: 'ChatWithUs',
  },
  {
    id: 'tickets',
    title: 'Create Support Tickets',
    desc: 'Raise and track your tickets',
    icon: 'confirmation-number',
    route: 'SupportTickets',
  },
  {
    id: 'all',
    title: 'All Support Tickets',
    desc: 'Every request you have raised, in one list',
    icon: 'history',
    route: 'AllSupportTickets',
  },
  {
    id: 'faqs',
    title: 'FAQs',
    desc: 'Answers to common questions',
    icon: 'help-outline',
    route: 'Faqs',
  },
  {
    id: 'policies',
    title: 'Policies',
    desc: 'Read our policy documents',
    icon: 'description',
    route: 'Policies',
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
        {CARDS.map((card) => (
          <XStack
            key={card.id}
            testID={`support-${card.id}`}
            role="button"
            aria-label={card.title}
            onPress={() => card.route && navigation.navigate(card.route as 'Faqs')}
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
              backgroundColor="$primary"
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
