import { Controller } from 'react-hook-form';
import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreatePodForm } from './create-pod.types';

const TERMS_URL = 'https://duncit.com/policies/terms-of-service';

/** Client-side publish gate — the host must accept the Organizer Terms before
 * the last step's "Create Pod" action validates. Mobile twin of mWeb's. */
export function TermsAgreement({ form }: Readonly<{ form: CreatePodForm }>) {
  const { color, primary } = useThemeColors();
  return (
    <Controller
      control={form.control}
      name="agreed_to_terms"
      render={({ field, fieldState }) => (
        <YStack gap={4}>
          <XStack
            testID="create-pod-terms"
            role="checkbox"
            aria-label="Agree to Organizer Terms of Service"
            aria-checked={field.value}
            onPress={() => field.onChange(!field.value)}
            gap={10}
            alignItems="flex-start"
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons
              name={field.value ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={field.value ? primary : color}
            />
            <Text flex={1} fontSize={13} color="$muted">
              I agree to the{' '}
              <Text
                testID="terms-link"
                color="$primary"
                fontWeight="800"
                onPress={() => Linking.openURL(TERMS_URL)}
              >
                Organizer Terms of Service
              </Text>{' '}
              and confirm that I have the right to host this event at the selected venue.
            </Text>
          </XStack>
          {fieldState.error ? (
            <Text testID="agreed_to_terms-error" fontSize={12} color="$danger">
              {fieldState.error.message}
            </Text>
          ) : null}
        </YStack>
      )}
    />
  );
}
