import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { SignupPolicy } from '@/stores/policies.store';

export interface PolicyAcceptanceRowProps {
  policy: SignupPolicy;
  accepted: boolean;
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
  onToggle,
  onRead,
}: Readonly<PolicyAcceptanceRowProps>) {
  const { t } = useTranslation();
  const { primary, color } = useThemeColors();

  return (
    <XStack
      alignItems="center"
      gap={10}
      padding={12}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
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
        pressStyle={{ opacity: 0.8 }}
      >
        <MaterialIcons
          name={accepted ? 'check-box' : 'check-box-outline-blank'}
          size={22}
          color={accepted ? primary : color}
        />
        <Text flex={1} fontSize={14} fontWeight="600" color="$color">
          {policy.title}
        </Text>
      </XStack>
      <Text
        testID={`policy-read-${policy.slug}`}
        role="button"
        aria-label={t('policyAcceptance.readAction')}
        onPress={onRead}
        fontSize={13}
        fontWeight="700"
        color="$primary"
      >
        {t('policyAcceptance.readAction')}
      </Text>
    </XStack>
  );
}
