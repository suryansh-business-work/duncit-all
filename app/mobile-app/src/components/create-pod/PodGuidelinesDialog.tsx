import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { AiMonitorGlyph } from '@/components/ai-monitoring';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { POD_GUIDELINE_RULE_KEYS } from './create-pod.form';

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
    <DuncitButton
      testID="pod-guidelines-close"
      label={t('mweb.createPod.gotIt')}
      onPress={onClose}
      size="lg"
      fullWidth
    />
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
        <YStack alignItems="center" paddingBottom={2}>
          <AiMonitorGlyph size={40} testID="pod-guidelines-glyph" />
        </YStack>
        <YStack gap={8}>
          {POD_GUIDELINE_RULE_KEYS.map((key) => (
            <XStack key={key} gap={8} alignItems="flex-start">
              <MaterialIcons name="block" size={16} color={danger} />
              <Text flex={1} fontSize={14} color="$color">
                {t(key)}
              </Text>
            </XStack>
          ))}
        </YStack>
        <YStack backgroundColor="$soft" borderRadius={16} padding={12}>
          <Text fontSize={12} fontWeight="600" color="$danger">
            {t('mweb.createPod.guidelinesWarning')}
          </Text>
        </YStack>
      </YStack>
    </DuncitDialog>
  );
}
