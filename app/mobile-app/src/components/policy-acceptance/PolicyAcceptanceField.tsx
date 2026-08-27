import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useSignupPolicies } from '@/hooks/usePolicies';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { allPoliciesAccepted } from '@/utils/policy-acceptance';
import { PolicyAcceptanceSheet } from './PolicyAcceptanceSheet';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface PolicyAcceptanceFieldProps {
  acceptedIds: string[];
  onChange: (ids: string[]) => void;
  errorMessage?: string;
}

/**
 * The single checkbox the signup form carries.
 *
 * Tapping it opens the sheet rather than ticking anything: one tap cannot stand
 * for a stack of documents nobody opened, so the tick here only ever reflects
 * what the sheet actually collected.
 */
export function PolicyAcceptanceField({
  acceptedIds,
  onChange,
  errorMessage,
}: Readonly<PolicyAcceptanceFieldProps>) {
  const { t } = useTranslation();
  const { primary, color } = useThemeColors();
  const { policies, loaded, refetch } = useSignupPolicies();
  const [open, setOpen] = useState(false);

  const accepted = loaded && allPoliciesAccepted(policies, acceptedIds);

  // Re-opening IS the retry "Please try again" asks for: the list is fetched
  // once on mount, so a blip would otherwise hold the gate shut for good.
  const openSheet = () => {
    if (!loaded) fireAndForget(refetch());
    setOpen(true);
  };

  return (
    <YStack gap={4}>
      <XStack
        testID="signup-policies-checkbox"
        role="checkbox"
        aria-label={t('policyAcceptance.checkboxLabel')}
        aria-checked={accepted}
        onPress={openSheet}
        gap={10}
        alignItems="flex-start"
        pressStyle={PRESS_STYLE.row}
      >
        <MaterialIcons
          name={accepted ? 'check-box' : 'check-box-outline-blank'}
          size={22}
          color={accepted ? primary : color}
        />
        <Text flex={1} fontSize={13} color="$muted">
          {t('policyAcceptance.checkboxLabel')}
        </Text>
      </XStack>
      {errorMessage ? (
        <Text testID="acceptedPolicyIds-error" fontSize={12} color="$danger">
          {errorMessage}
        </Text>
      ) : null}
      <PolicyAcceptanceSheet
        open={open}
        acceptedIds={acceptedIds}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </YStack>
  );
}
