import { Ionicons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { TRUECALLER_COPY } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Says why the form arrived filled in and why no code will be asked: the
 * number was proven by Truecaller. Nothing when there is no proof.
 * mWeb twin: the success Alert in RegisterPage.
 */
export function TruecallerVerifiedNote({ visible }: Readonly<{ visible: boolean }>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  if (!visible) return null;
  return (
    <XStack
      testID="truecaller-verified"
      role="status"
      gap={8}
      padding={12}
      borderRadius={8}
      alignItems="center"
      backgroundColor="$successSoft"
    >
      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
      <Text flex={1} fontSize={14} color="$success">
        {t(TRUECALLER_COPY.verified)}
      </Text>
    </XStack>
  );
}
