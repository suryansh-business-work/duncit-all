import { Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  open: boolean;
  /** The address Google verified — named so the invite is about THEIR account
   * rather than about accounts in general. */
  email: string;
  onAccept: () => void;
  onDismiss: () => void;
}

/**
 * "Google knows you, Duncit does not — shall we make you an account?"
 *
 * Shown when `loginWithGoogle` answers GOOGLE_ACCOUNT_NOT_FOUND. Before this,
 * native had no answer for that code at all: it fell through to the screen's
 * plain error line, which read as a failure and left the credential to be
 * thrown away. Accepting carries the credential Google already returned into
 * the signup screen.
 *
 * The detail line is the promise the copy has to keep: a Google credential
 * carries no number and no birthday, so signup still has two questions and a
 * code to ask — and nothing exists until they are answered.
 *
 * Hardware back maps to DISMISS, which is honest here: nothing is pending on
 * this answer, so closing it really is "not now". mWeb twin
 * (GoogleSignupInviteDialog).
 */
export function GoogleSignupInviteModal({ open, email, onAccept, onDismiss }: Readonly<Props>) {
  const { primary } = useThemeColors();
  const { t } = useTranslation();

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onDismiss}>
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
            testID="google-signup-invite"
            width="88%"
            maxWidth={420}
            backgroundColor="$background"
            borderRadius={20}
            padding={18}
            gap={12}
          >
            <XStack alignItems="center" gap={8}>
              <MaterialIcons name="person-add" size={20} color={primary} />
              <Text fontSize={16.5} fontWeight="700" color="$color" flexShrink={1}>
                {t('mweb.login.googleNotFoundTitle')}
              </Text>
            </XStack>

            <Text fontSize={13.5} color="$color">
              {t('mweb.login.googleNotFoundBody', { vars: { email } })}
            </Text>
            <Text fontSize={12} color="$muted">
              {t('mweb.login.googleNotFoundDetail')}
            </Text>

            <XStack gap={10} marginTop={4}>
              <XStack
                testID="google-signup-dismiss"
                role="button"
                aria-label={t('mweb.login.googleNotFoundDismiss')}
                onPress={onDismiss}
                flex={1}
                height={44}
                borderRadius={12}
                borderWidth={1}
                borderColor="$borderColor"
                alignItems="center"
                justifyContent="center"
                pressStyle={PRESS_STYLE.ghost}
              >
                <Text fontSize={14} fontWeight="700" color="$color">
                  {t('mweb.login.googleNotFoundDismiss')}
                </Text>
              </XStack>
              <XStack
                testID="google-signup-accept"
                role="button"
                aria-label={t('mweb.login.googleNotFoundAction')}
                onPress={onAccept}
                flex={1.4}
                height={44}
                borderRadius={12}
                backgroundColor="$primary"
                alignItems="center"
                justifyContent="center"
                pressStyle={PRESS_STYLE.control}
              >
                <Text fontSize={14} fontWeight="700" color="$onPrimary">
                  {t('mweb.login.googleNotFoundAction')}
                </Text>
              </XStack>
            </XStack>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
