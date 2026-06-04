import type { ComponentProps } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface Card {
  id: string;
  title: string;
  desc: string;
  icon: IconName;
  route?: 'SupportTickets' | 'Faqs' | 'Policies';
  soon?: boolean;
}

const CARDS: Card[] = [
  {
    id: 'tickets',
    title: 'Support Tickets',
    desc: 'Raise and track your tickets',
    icon: 'confirmation-number',
    route: 'SupportTickets',
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
  { id: 'sos', title: 'SOS Alert', desc: 'Urgent help at a pod', icon: 'sos', soon: true },
  {
    id: 'callback',
    title: 'Request a Callback',
    desc: 'We will call you back',
    icon: 'phone-callback',
    soon: true,
  },
  {
    id: 'feedback',
    title: 'Live Feedback',
    desc: 'Share feedback about a pod',
    icon: 'rate-review',
    soon: true,
  },
  {
    id: 'chat',
    title: 'Live Chat',
    desc: 'Chat with our support team',
    icon: 'support-agent',
    soon: true,
  },
];

/** Support hub — cards linking to tickets/FAQs (the rest are coming soon). */
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
            onPress={card.route ? () => navigation.navigate(card.route as 'Faqs') : undefined}
            alignItems="center"
            gap={14}
            padding={14}
            borderRadius={16}
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$surface"
            opacity={card.soon ? 0.7 : 1}
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
              <XStack alignItems="center" gap={6}>
                <Text fontSize={15} fontWeight="900" color="$color">
                  {card.title}
                </Text>
                {card.soon ? (
                  <Text fontSize={10} fontWeight="900" color="$muted">
                    SOON
                  </Text>
                ) : null}
              </XStack>
              <Text fontSize={12.5} color="$muted">
                {card.desc}
              </Text>
            </YStack>
            {card.soon ? null : <MaterialIcons name="chevron-right" size={22} color={muted} />}
          </XStack>
        ))}
      </ScrollView>
    </StackScreen>
  );
}
