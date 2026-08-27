import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

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
 * links each issue to the step it lives on (tap → jump there).
 *
 * On {@link DuncitDialog} because the preflight can flag many violations at
 * once: with no cap and no scroller, the Close button was pushed off the bottom
 * and the dialog could only be dismissed with the hardware back button. */
export function ModerationBlockedDialog({ violations, onJump, onClose }: Readonly<Props>) {
  const { primary } = useThemeColors();
  const { t } = useTranslation();
  const close = t('mweb.auth.close');

  const footer = (
    <XStack
      testID="moderation-blocked-close"
      role="button"
      aria-label={close}
      onPress={onClose}
      height={46}
      borderRadius={12}
      alignItems="center"
      justifyContent="center"
      borderWidth={1}
      borderColor="$borderColor"
      pressStyle={PRESS_STYLE.row}
    >
      <Text fontSize={14} fontWeight="600" color="$color">
        {close}
      </Text>
    </XStack>
  );

  return (
    <DuncitDialog
      open={violations.length > 0}
      onClose={onClose}
      testID="moderation-blocked-dialog"
      variant="center"
      title={t('mweb.createPod.moderationTitle')}
      subtitle={t('mweb.createPod.moderationDescription')}
      closeLabel={close}
      showCloseButton={false}
      footer={footer}
    >
      <YStack gap={10}>
        {violations.map((violation) => {
          const fixIn = t('mweb.createPod.moderationFixIn', {
            vars: { step: violation.stepTitle },
          });
          return (
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
                aria-label={fixIn}
                onPress={() => onJump(violation.stepIndex)}
                alignSelf="flex-start"
                alignItems="center"
                gap={4}
                pressStyle={PRESS_STYLE.row}
              >
                <MaterialIcons name="arrow-forward" size={14} color={primary} />
                <Text fontSize={12} fontWeight="600" color="$primary">
                  {fixIn}
                </Text>
              </XStack>
            </YStack>
          );
        })}
      </YStack>
    </DuncitDialog>
  );
}
