import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { POD_GUIDELINE_RULE_KEYS } from './create-pod.form';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** "What AI monitors" dialog — explains the AI content check and the community
 * guidelines every pod must follow, with the consequences of breaking them. */
export function PodGuidelinesDialog({ open, onClose }: Readonly<Props>) {
  const { primary, danger } = useThemeColors();
  const { t } = useTranslation();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} alignItems="center" justifyContent="center" testID="pod-guidelines-dialog">
          <YStack
            testID="pod-guidelines-backdrop"
            role="button"
            aria-label={t('mweb.auth.close')}
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
                <Text fontSize={17} fontWeight="700" color="$color">
                  {t('mweb.createPod.aiMonitors')}
                </Text>
              </XStack>
              <Text fontSize={13} color="$muted">
                {t('mweb.createPod.guidelinesIntro')}
              </Text>
              <YStack gap={7} paddingVertical={6}>
                {POD_GUIDELINE_RULE_KEYS.map((key) => (
                  <XStack key={key} gap={8} alignItems="flex-start">
                    <MaterialIcons name="block" size={15} color={danger} />
                    <Text flex={1} fontSize={12.5} color="$color">
                      {t(key)}
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
                  {t('mweb.createPod.guidelinesWarning')}
                </Text>
              </YStack>
              <XStack
                testID="pod-guidelines-close"
                role="button"
                aria-label={t('mweb.createPod.gotIt')}
                onPress={onClose}
                height={46}
                borderRadius={12}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$primary"
                pressStyle={{ opacity: 0.85 }}
              >
                <Text fontSize={14} fontWeight="600" color="$onPrimary">
                  {t('mweb.createPod.gotIt')}
                </Text>
              </XStack>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
