import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, YStack } from 'tamagui';

import { EarnBox } from '@/components/earn/EarnBox';
import { StackScreen } from '@/components/StackScreen';
import { useMe } from '@/hooks/useMe';
import type { RootStackParamList } from '@/navigation/types';

const BOXES = [
  {
    role: 'HOST',
    title: 'By hosting a pod',
    description: 'Run meetups and experiences for your community and earn from paid pods.',
    icon: 'dashboard',
    route: 'BecomeHost',
  },
  {
    role: 'VENUE_OWNER',
    title: 'By registering your venue',
    description: 'List your space as a Duncit venue and host pods or rent it out.',
    icon: 'store',
    route: 'RegisterVenue',
  },
  {
    role: 'ECOMM_MANAGER',
    title: 'By listing your product',
    description: 'Sell your products to the Duncit community through pods and the shop.',
    icon: 'inventory-2',
    route: 'ListProduct',
  },
] as const;

/** "Earn with Duncit" — three ways to start earning; a box is disabled when the
 * user already holds the matching role. */
export function EarnScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const roles = useMe().data?.me?.roles ?? [];

  return (
    <StackScreen title="Earn with Duncit" testID="earn-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={14} padding={16} paddingBottom={40}>
          <Text fontSize={13} color="$muted">
            Pick a way to start earning on Duncit.
          </Text>
          {BOXES.map((box) => (
            <EarnBox
              key={box.role}
              testID={`earn-box-${box.role}`}
              title={box.title}
              description={box.description}
              icon={box.icon}
              disabled={roles.includes(box.role)}
              onPress={() => navigation.navigate(box.route)}
            />
          ))}
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
