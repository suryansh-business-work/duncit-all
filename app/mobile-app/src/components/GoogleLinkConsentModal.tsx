import { Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  open: boolean;
  /** The account address Google just authenticated — named so the user knows
   * exactly which Duncit account they are granting access to. */
  email: string;
  busy: boolean;
  error: string | null;
  onAllow: () => void;
  onDeny: () => void;
}

/**
 * The consent step for granting Google sign-in to an email/password account.
 *
 * Reached when loginWithGoogle answers EMAIL_LOGIN_REQUIRED. The server has
 * already verified the Google token and matched its verified address to this
 * account, so nothing here proves identity — it collects INTENT. Denying leaves
 * the account exactly as it was and returns to the login form with a warning.
 *
 * Hardware back maps to DENY, not dismiss: a silent close would look like the
 * grant succeeded. mWeb twin (GoogleLinkConsentDialog).
 */
export function GoogleLinkConsentModal({
  open,
  email,
  busy,
  error,
  onAllow,
  onDeny,
}: Readonly<Props>) {
  const { primary } = useThemeColors();
  const { t } = useTranslation();

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onDeny}>
      <ModalThemeScope>
        <YStack flex={1} alignItems="center" justifyContent="center">
          <YStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.55)"
          />
          <YStack
            testID="google-link-consent"
            width="88%"
            maxWidth={420}
            backgroundColor="$background"
            borderRadius={20}
            padding={18}
            gap={12}
          >
            <XStack alignItems="center" gap={8}>
              <MaterialIcons name="link" size={20} color={primary} />
              <Text fontSize={16.5} fontWeight="700" color="$color" flexShrink={1}>
                {t('mweb.login.linkConsentTitle')}
              </Text>
            </XStack>

            <Text fontSize={13.5} color="$color">
              {t('mweb.login.linkConsentBody', { vars: { email } })}
            </Text>
            <Text fontSize={12} color="$muted">
              {t('mweb.login.linkConsentDetail')}
            </Text>

            {error ? (
              <Text testID="google-link-consent-error" fontSize={12.5} color="$danger">
                {error}
              </Text>
            ) : null}

            <XStack gap={10} marginTop={4}>
              <XStack
                testID="google-link-deny"
                role="button"
                aria-label={t('mweb.login.linkConsentDeny')}
                aria-disabled={busy}
                onPress={busy ? undefined : onDeny}
                flex={1}
                height={44}
                borderRadius={12}
                borderWidth={1}
                borderColor="$borderColor"
                alignItems="center"
                justifyContent="center"
                opacity={busy ? 0.6 : 1}
                pressStyle={PRESS_STYLE.ghost}
              >
                <Text fontSize={14} fontWeight="700" color="$color">
                  {t('mweb.login.linkConsentDeny')}
                </Text>
              </XStack>
              <XStack
                testID="google-link-allow"
                role="button"
                aria-label={t('mweb.login.linkConsentAllow')}
                aria-disabled={busy}
                onPress={busy ? undefined : onAllow}
                flex={1.4}
                height={44}
                borderRadius={12}
                backgroundColor="$primary"
                alignItems="center"
                justifyContent="center"
                gap={8}
                opacity={busy ? 0.7 : 1}
                pressStyle={PRESS_STYLE.control}
              >
                {busy ? <Spinner size="small" color="$onPrimary" /> : null}
                <Text fontSize={14} fontWeight="700" color="$onPrimary">
                  {t('mweb.login.linkConsentAllow')}
                </Text>
              </XStack>
            </XStack>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
