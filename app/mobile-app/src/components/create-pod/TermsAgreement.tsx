import { Controller } from 'react-hook-form';
import { Linking, type AccessibilityActionEvent } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useLegalUrls } from '@/hooks/useLegalUrls';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { CreatePodForm } from './create-pod.types';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Client-side publish gate — the host must accept the Organizer Terms before
 * the last step's "Create Pod" action validates. Mobile twin of mWeb's; the
 * terms link is the admin Branding Terms page. */
export function TermsAgreement({ form }: Readonly<{ form: CreatePodForm }>) {
  const { color, primary } = useThemeColors();
  const { t } = useTranslation();
  const { termsUrl } = useLegalUrls();
  return (
    <Controller
      control={form.control}
      name="agreed_to_terms"
      render={({ field, fieldState }) => (
        <YStack gap={4}>
          <XStack
            testID="create-pod-terms"
            tabIndex={0}
            role="checkbox"
            aria-label={t('mweb.createPod.termsAria')}
            aria-checked={field.value}
            // The focusable checkbox row hides the terms link nested in its
            // sentence from VoiceOver, so the link rides on the row as a named
            // custom action; `activate` keeps a double-tap toggling the box
            // rather than tapping whatever sits at the row's centre (4.1.2).
            accessibilityActions={[
              { name: 'activate' },
              { name: 'openTerms', label: t('mweb.createPod.termsLink') },
            ]}
            onAccessibilityAction={(event: AccessibilityActionEvent) => {
              if (event.nativeEvent.actionName === 'openTerms') {
                Linking.openURL(termsUrl).catch(() => undefined);
                return;
              }
              field.onChange(!field.value);
            }}
            onPress={() => field.onChange(!field.value)}
            gap={10}
            alignItems="flex-start"
            pressStyle={PRESS_STYLE.row}
          >
            <MaterialIcons
              name={field.value ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={field.value ? primary : color}
            />
            <Text flex={1} fontSize={13} color="$muted">
              {t('mweb.createPod.termsLeadIn')}{' '}
              <Text
                pressStyle={PRESS_STYLE.inline}
                testID="terms-link"
                hitSlop={12}
                role="link"
                color="$accent"
                fontWeight="600"
                onPress={() => Linking.openURL(termsUrl)}
              >
                {t('mweb.createPod.termsLink')}
              </Text>{' '}
              {t('mweb.createPod.termsTail')}
            </Text>
          </XStack>
          {fieldState.error ? (
            <Text testID="agreed_to_terms-error" role="alert" fontSize={12} color="$danger">
              {fieldState.error.message}
            </Text>
          ) : null}
        </YStack>
      )}
    />
  );
}
