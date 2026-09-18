import { useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useSignupPolicies } from '@/hooks/usePolicies';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { allPoliciesAccepted, togglePolicyId } from '@/utils/policy-acceptance';
import { PolicyAcceptanceBody } from './PolicyAcceptanceBody';
import { PolicyAcceptanceFooter } from './PolicyAcceptanceFooter';
import { PolicyAcceptanceReader } from './PolicyAcceptanceReader';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { SOCIAL_AUTH_COPY, type SocialProvider } from '@duncit/utils';

export interface PolicyAcceptanceSheetProps {
  open: boolean;
  /**
   * Set after Google (or Apple) has returned its token: it has confirmed who
   * the person is, but the account genuinely does not exist yet, and the intro
   * has to say so — nothing has been created in their name while they decide.
   */
  afterProvider?: SocialProvider;
  acceptedIds: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}

/**
 * The signup policy gate: every policy that gates an account, each with its own
 * tick, the full text behind each one, and "Accept all" at the bottom.
 *
 * Controlled — the accepted ids live with whoever opened it, because both
 * callers need them after it closes: the form submits them with `register`, the
 * Google pass spends them on `signupWithGoogle`. mWeb renders the same list in
 * MUI; only the decision of WHAT to render is shared, and that comes from the
 * API (rule 40 — logic, never UI).
 */
export function PolicyAcceptanceSheet({
  open,
  afterProvider,
  acceptedIds,
  onChange,
  onClose,
}: Readonly<PolicyAcceptanceSheetProps>) {
  const { t } = useTranslation();
  const { color } = useThemeColors();
  const { policies, isLoading, error } = useSignupPolicies();
  const [readingId, setReadingId] = useState<string | null>(null);

  const reading = policies.find((policy) => policy.id === readingId) ?? null;
  const done = policies.filter((policy) => acceptedIds.includes(policy.id)).length;
  const canAcceptAll = policies.length > 0 && !allPoliciesAccepted(policies, acceptedIds);
  const intro = afterProvider
    ? t(SOCIAL_AUTH_COPY[afterProvider].policyIntro)
    : t('policyAcceptance.dialogIntro');

  // Backing out of a policy comes before backing out of the sheet, so reading
  // one is never a way to lose the ticks already made.
  const dismiss = () => {
    if (reading) setReadingId(null);
    else onClose();
  };

  const acceptAll = canAcceptAll
    ? () => {
        onChange(policies.map((policy) => policy.id));
        onClose();
      }
    : undefined;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={dismiss}>
      <ModalThemeScope>
        <YStack
          flex={1}
          justifyContent="flex-end"
          testID="policy-acceptance-sheet"
          onAccessibilityEscape={dismiss}
        >
          <YStack
            pressStyle={PRESS_STYLE.surface}
            role="button"
            aria-label={t('policyAcceptance.close')}
            onPress={dismiss}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.55)"
          />
          <YStack
            backgroundColor="$background"
            borderTopLeftRadius={28}
            borderTopRightRadius={28}
            maxHeight="86%"
          >
            <SafeAreaView edges={['bottom']} style={SHEET_SAFE_AREA}>
              <XStack alignItems="center" gap={8} paddingHorizontal={16} paddingVertical={16}>
                <Text
                  testID="policy-acceptance-sheet-title"
                  role="heading"
                  flex={1}
                  fontSize={17}
                  fontWeight="600"
                  color="$color"
                  numberOfLines={2}
                >
                  {reading?.title ?? t('policyAcceptance.dialogTitle')}
                </Text>
                <XStack
                  testID="policy-acceptance-dismiss"
                  role="button"
                  aria-label={t('policyAcceptance.close')}
                  tabIndex={0}
                  hitSlop={4}
                  onPress={dismiss}
                  width={40}
                  height={40}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={20}
                  backgroundColor="$surface"
                  pressStyle={PRESS_STYLE.row}
                >
                  <MaterialIcons name={reading ? 'arrow-back' : 'close'} size={18} color={color} />
                </XStack>
              </XStack>

              {reading ? (
                <PolicyAcceptanceReader policy={reading} />
              ) : (
                <PolicyAcceptanceBody
                  policies={policies}
                  loading={isLoading}
                  failed={!!error}
                  intro={intro}
                  acceptedIds={acceptedIds}
                  onToggle={(id) => onChange(togglePolicyId(acceptedIds, id))}
                  onRead={setReadingId}
                />
              )}

              {reading ? null : (
                <PolicyAcceptanceFooter
                  done={done}
                  total={policies.length}
                  canAcceptAll={canAcceptAll}
                  onClose={onClose}
                  onAcceptAll={acceptAll}
                />
              )}
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
