import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { POD_GUIDELINE_RULE_KEYS } from './create-pod.form';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** "What AI monitors" dialog — explains the AI content check and the community
 * guidelines every pod must follow, with the consequences of breaking them.
 *
 * On {@link DuncitDialog} because the six rules are localized free text: a
 * verbose locale or a large system font scale used to push "Got it" off the
 * bottom of an uncapped, unscrollable card. */
export function PodGuidelinesDialog({ open, onClose }: Readonly<Props>) {
  const { danger } = useThemeColors();
  const { t } = useTranslation();

  const footer = (
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
      pressStyle={PRESS_STYLE.control}
    >
      <Text fontSize={14} fontWeight="600" color="$onPrimary">
        {t('mweb.createPod.gotIt')}
      </Text>
    </XStack>
  );

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="pod-guidelines-dialog"
      variant="center"
      title={t('mweb.createPod.aiMonitors')}
      subtitle={t('mweb.createPod.guidelinesIntro')}
      closeLabel={t('mweb.auth.close')}
      showCloseButton={false}
      footer={footer}
    >
      <YStack gap={12}>
        <YStack gap={7}>
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
      </YStack>
    </DuncitDialog>
  );
}
