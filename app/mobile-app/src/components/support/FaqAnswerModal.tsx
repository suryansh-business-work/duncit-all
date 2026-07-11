import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import type { FaqItem } from '@/hooks/useLibrary';
import { useThemeColors } from '@/hooks/useThemeColors';

interface FaqAnswerModalProps {
  faq: FaqItem | null;
  onClose: () => void;
  onStartChat: () => void;
}

/** Bottom-sheet showing a single FAQ's answer with a "still need help"
 * conversation CTA. RN twin of mWeb's FaqAnswerDialog. */
export function FaqAnswerModal({ faq, onClose, onStartChat }: Readonly<FaqAnswerModalProps>) {
  const { primary } = useThemeColors();

  return (
    <Modal visible={faq !== null} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="support-faq-modal">
          <YStack
            role="button"
            aria-label="Close FAQ"
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            backgroundColor="$background"
            borderTopLeftRadius={22}
            borderTopRightRadius={22}
            maxHeight="84%"
          >
            <SafeAreaView edges={['bottom']}>
              {faq ? (
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                  <XStack alignItems="flex-start" justifyContent="space-between" gap={12}>
                    <Text flex={1} fontSize={18} fontWeight="900" color="$color">
                      {faq.question}
                    </Text>
                    <XStack
                      testID="support-faq-modal-close"
                      role="button"
                      aria-label="Close"
                      onPress={onClose}
                      width={32}
                      height={32}
                      alignItems="center"
                      justifyContent="center"
                      borderRadius={16}
                      backgroundColor="$surface"
                    >
                      <MaterialIcons name="close" size={18} color={primary} />
                    </XStack>
                  </XStack>
                  <Text fontSize={14} color="$muted" lineHeight={21} marginTop={12}>
                    {faq.answer}
                  </Text>
                  <YStack
                    marginTop={20}
                    padding={14}
                    borderRadius={14}
                    backgroundColor="rgba(255,79,115,0.08)"
                    gap={10}
                  >
                    <Text fontSize={12} fontWeight="800" color="$muted">
                      Still need help?
                    </Text>
                    <XStack
                      testID="support-faq-modal-chat"
                      role="button"
                      aria-label="Start a conversation"
                      onPress={onStartChat}
                      alignItems="center"
                      justifyContent="center"
                      gap={8}
                      height={44}
                      borderRadius={999}
                      backgroundColor="$primary"
                      pressStyle={{ opacity: 0.9 }}
                    >
                      <MaterialIcons name="chat-bubble-outline" size={18} color="#ffffff" />
                      <Text fontSize={14} fontWeight="900" color="#ffffff">
                        Start a conversation
                      </Text>
                    </XStack>
                  </YStack>
                </ScrollView>
              ) : null}
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
