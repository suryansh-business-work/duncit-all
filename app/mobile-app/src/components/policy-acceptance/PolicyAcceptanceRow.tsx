import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { SignupPolicy } from '@/stores/policies.store';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface PolicyAcceptanceRowProps {
  policy: SignupPolicy;
  accepted: boolean;
  /** Draws the hairline above it — every row but the first in the card. */
  divided?: boolean;
  onToggle: () => void;
  onRead: () => void;
}

/**
 * One policy in the acceptance sheet: its own tick, and the way into its text.
 *
 * The title is rendered as Legal wrote it. It is API data, not copy — rule 38
 * governs the words around a policy, never the document itself.
 */
export function PolicyAcceptanceRow({
  policy,
  accepted,
  divided = false,
  onToggle,
  onRead,
}: Readonly<PolicyAcceptanceRowProps>) {
  const { t } = useTranslation();
  const { primary, muted } = useThemeColors();

  return (
    <XStack
      alignItems="center"
      gap={10}
      paddingHorizontal={16}
      paddingVertical={14}
      borderTopWidth={divided ? 1 : 0}
      borderColor="$borderColor"
    >
      <XStack
        testID={`policy-accept-${policy.slug}`}
        role="checkbox"
        aria-label={policy.title}
        aria-checked={accepted}
        onPress={onToggle}
        flex={1}
        alignItems="center"
        gap={10}
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons
          name={accepted ? 'check-box' : 'check-box-outline-blank'}
          size={22}
          color={accepted ? primary : muted}
        />
        <Text flex={1} fontSize={14} fontWeight="600" color="$color">
          {policy.title}
        </Text>
      </XStack>
      <Text
        pressStyle={PRESS_STYLE.inline}
        testID={`policy-read-${policy.slug}`}
        role="button"
        aria-label={t('policyAcceptance.readAction')}
        onPress={onRead}
        fontSize={13}
        fontWeight="600"
        color="$primary"
      >
        {t('policyAcceptance.readAction')}
      </Text>
    </XStack>
  );
}
