import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import type { FaqItem } from '@/hooks/useLibrary';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface FaqAnswerModalProps {
  faq: FaqItem | null;
  onClose: () => void;
  onStartChat: () => void;
}

/** Bottom-sheet showing a single FAQ's answer with a "still need help"
 * conversation CTA. RN twin of mWeb's FaqAnswerDialog. */
export function FaqAnswerModal({ faq, onClose, onStartChat }: Readonly<FaqAnswerModalProps>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();

  return (
    <Modal visible={faq !== null} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="support-faq-modal">
          <YStack
            pressStyle={PRESS_STYLE.surface}
            role="button"
            aria-label={t('mweb.support.closeFaq')}
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
            <SafeAreaView edges={['bottom']} style={SHEET_SAFE_AREA}>
              {faq ? (
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                  <XStack alignItems="flex-start" justifyContent="space-between" gap={12}>
                    <Text flex={1} fontSize={18} fontWeight="700" color="$color">
                      {faq.question}
                    </Text>
                    <XStack
                      pressStyle={PRESS_STYLE.surface}
                      testID="support-faq-modal-close"
                      role="button"
                      aria-label={t('mweb.common.close')}
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
                    <Text fontSize={12} fontWeight="600" color="$muted">
                      Still need help?
                    </Text>
                    <XStack
                      testID="support-faq-modal-chat"
                      role="button"
                      aria-label={t('mweb.common.startAConversation')}
                      onPress={onStartChat}
                      alignItems="center"
                      justifyContent="center"
                      gap={8}
                      height={44}
                      borderRadius={999}
                      backgroundColor="$primary"
                      pressStyle={PRESS_STYLE.surface}
                    >
                      <MaterialIcons name="chat-bubble-outline" size={18} color="#ffffff" />
                      <Text fontSize={14} fontWeight="700" color="#ffffff">
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
