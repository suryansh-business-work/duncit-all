import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { AiMonitoringCopy } from '@duncit/ai-monitoring';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  open: boolean;
  onClose: () => void;
  copy: AiMonitoringCopy;
}

/**
 * What "AI Monitoring" means, on the native app.
 *
 * The Tamagui twin of @duncit/ai-monitoring/mui's dialog. Every sentence comes
 * from `copy` — the admin's setting layered over the bundled localized
 * fallback — so this component holds no text of its own and cannot drift from
 * what mWeb shows.
 *
 * On {@link DuncitDialog} because the bullet list is localized free text: a
 * verbose locale or a large system font scale would push the dismiss button off
 * the bottom of an uncapped, unscrollable card.
 */
export function AiMonitoringDialog({ open, onClose, copy }: Readonly<Props>) {
  const { success } = useThemeColors();
  const { t } = useTranslation();

  const footer = (
    <XStack
      testID="ai-monitoring-close"
      role="button"
      aria-label={copy.dismissLabel}
      onPress={onClose}
      height={46}
      borderRadius={12}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$primary"
      pressStyle={PRESS_STYLE.control}
    >
      <Text fontSize={14} fontWeight="600" color="$onPrimary">
        {copy.dismissLabel}
      </Text>
    </XStack>
  );

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="ai-monitoring-dialog"
      variant="center"
      title={copy.title}
      subtitle={copy.intro}
      closeLabel={t('mweb.auth.close')}
      showCloseButton={false}
      footer={footer}
    >
      <YStack gap={12}>
        <YStack gap={7}>
          {copy.points.map((point) => (
            <XStack key={point} gap={8} alignItems="flex-start">
              <MaterialIcons name="check-circle-outline" size={15} color={success} />
              <Text flex={1} fontSize={12.5} color="$color">
                {point}
              </Text>
            </XStack>
          ))}
        </YStack>
        {copy.footnote ? (
          <YStack
            backgroundColor="$surface"
            borderRadius={12}
            padding={12}
            borderWidth={1}
            borderColor="$borderColor"
          >
            <Text fontSize={12} color="$muted">
              {copy.footnote}
            </Text>
          </YStack>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
