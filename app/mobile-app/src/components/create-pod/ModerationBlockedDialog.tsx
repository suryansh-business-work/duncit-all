import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';

/** One flagged issue, resolved to the step the host must fix it on. */
export interface BlockedViolation {
  id: string;
  message: string;
  type: string;
  stepIndex: number;
  stepTitle: string;
}

interface Props {
  violations: BlockedViolation[];
  onJump: (stepIndex: number) => void;
  onClose: () => void;
}

/** Shown when the AI + rules preflight blocks publishing: lists what to fix and
 * links each issue to the step it lives on (tap → jump there). */
export function ModerationBlockedDialog({ violations, onJump, onClose }: Readonly<Props>) {
  return (
    <Modal
      visible={violations.length > 0}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <ModalThemeScope>
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          testID="moderation-blocked-dialog"
        >
          <YStack
            testID="moderation-blocked-backdrop"
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
              <XStack alignItems="center" gap={8} paddingBottom={2}>
                <MaterialIcons name="gpp-maybe" size={20} color="#ef4444" />
                <Text fontSize={17} fontWeight="900" color="$color">
                  Fix these before publishing
                </Text>
              </XStack>
              <Text fontSize={12.5} color="$muted">
                Our AI check found content that breaks the community guidelines, so the pod was not
                created. Fix the items below and try again.
              </Text>
              <YStack gap={10} paddingTop={2}>
                {violations.map((violation) => (
                  <YStack
                    key={violation.id}
                    gap={6}
                    backgroundColor="$surface"
                    borderRadius={12}
                    padding={12}
                    borderWidth={1}
                    borderColor="$borderColor"
                  >
                    <Text fontSize={12.5} fontWeight="700" color="$color">
                      {violation.message}
                    </Text>
                    <XStack
                      testID={`moderation-fix-${violation.id}`}
                      role="button"
                      aria-label={`Fix in ${violation.stepTitle}`}
                      onPress={() => onJump(violation.stepIndex)}
                      alignSelf="flex-start"
                      alignItems="center"
                      gap={4}
                      pressStyle={{ opacity: 0.7 }}
                    >
                      <MaterialIcons name="arrow-forward" size={14} color="#7C3AED" />
                      <Text fontSize={12} fontWeight="800" color="#7C3AED">
                        Fix in {violation.stepTitle}
                      </Text>
                    </XStack>
                  </YStack>
                ))}
              </YStack>
              <XStack
                testID="moderation-blocked-close"
                role="button"
                aria-label="Close"
                onPress={onClose}
                height={46}
                borderRadius={12}
                alignItems="center"
                justifyContent="center"
                borderWidth={1}
                borderColor="$borderColor"
                pressStyle={{ opacity: 0.7 }}
              >
                <Text fontSize={14} fontWeight="800" color="$color">
                  Close
                </Text>
              </XStack>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
