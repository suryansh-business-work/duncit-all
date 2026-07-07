import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { POD_AI_GUIDELINES } from './create-pod.form';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** "What AI monitors" dialog — explains the AI content check and the community
 * guidelines every pod must follow, with the consequences of breaking them. */
export function PodGuidelinesDialog({ open, onClose }: Readonly<Props>) {
  const { primary } = useThemeColors();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} alignItems="center" justifyContent="center" testID="pod-guidelines-dialog">
          <YStack
            testID="pod-guidelines-backdrop"
            role="button"
            aria-label="Close"
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            width="88%"
            maxWidth={440}
            backgroundColor="$background"
            borderRadius={20}
            padding={18}
            gap={12}
          >
            <SafeAreaView edges={[]}>
              <XStack alignItems="center" gap={8} paddingBottom={6}>
                <MaterialIcons name="auto-awesome" size={20} color={primary} />
                <Text fontSize={17} fontWeight="900" color="$color">
                  What AI monitors
                </Text>
              </XStack>
              <Text fontSize={13} color="$muted">
                {POD_AI_GUIDELINES.intro}
              </Text>
              <YStack gap={7} paddingVertical={6}>
                {POD_AI_GUIDELINES.rules.map((rule) => (
                  <XStack key={rule} gap={8} alignItems="flex-start">
                    <MaterialIcons name="block" size={15} color="#ef4444" />
                    <Text flex={1} fontSize={12.5} color="$color">
                      {rule}
                    </Text>
                  </XStack>
                ))}
              </YStack>
              <YStack
                backgroundColor="$surface"
                borderRadius={12}
                padding={12}
                borderWidth={1}
                borderColor="$borderColor"
              >
                <Text fontSize={12} fontWeight="700" color="$danger">
                  {POD_AI_GUIDELINES.warning}
                </Text>
              </YStack>
              <XStack
                testID="pod-guidelines-close"
                role="button"
                aria-label="Got it"
                onPress={onClose}
                height={46}
                borderRadius={12}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$primary"
                pressStyle={{ opacity: 0.85 }}
              >
                <Text fontSize={14} fontWeight="800" color="$onPrimary">
                  Got it
                </Text>
              </XStack>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
