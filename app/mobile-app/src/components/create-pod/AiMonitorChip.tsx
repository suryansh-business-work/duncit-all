import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

interface Props {
  onPress: () => void;
  testID?: string;
}

/** Colourful gradient pill that sits beside every step's title. Tapping it opens
 * the "What AI monitors" guidelines dialog. */
export function AiMonitorChip({ onPress, testID = 'create-pod-ai-chip' }: Readonly<Props>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label="What AI monitors"
      onPress={onPress}
      pressStyle={{ opacity: 0.85 }}
      borderRadius={999}
      overflow="hidden"
    >
      <LinearGradient
        colors={['#7C3AED', '#EC4899', '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 10,
          paddingVertical: 6,
        }}
      >
        <MaterialIcons name="auto-awesome" size={13} color="#ffffff" />
        <Text fontSize={11} fontWeight="900" color="#ffffff">
          AI monitoring
        </Text>
      </LinearGradient>
    </XStack>
  );
}
