import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { CHECKOUT_REQUIREMENT_KEYS, type CheckoutRequirement } from '@duncit/utils';

/**
 * What is stopping this account paying, and where to go and fix it.
 *
 * Every unmet requirement is listed at once: sending someone to their profile
 * three times, once per discovery, is the thing this card exists to avoid.
 * mWeb twin.
 */
export function CheckoutRequirementsCard({
  missing,
}: Readonly<{ missing: CheckoutRequirement[] }>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Straight to the email step when that is the only thing left; otherwise the
  // profile, where both account requirements are edited.
  const onlyEmail = missing.length === 1 && missing[0] === 'EMAIL_VERIFIED';
  const params = onlyEmail ? { verifyEmail: true } : undefined;
  if (missing.length === 0) return null;

  return (
    <YStack
      testID="checkout-requirements"
      gap={6}
      padding={14}
      borderRadius={14}
      borderWidth={1}
      borderColor="$danger"
      backgroundColor="$surface"
    >
      <Text fontSize={14} fontWeight="700" color="$color">
        {t('mweb.checkout.needTitle')}
      </Text>
      <Text fontSize={12.5} color="$muted">
        {t('mweb.checkout.needIntro')}
      </Text>
      {missing.map((requirement) => (
        <Text key={requirement} fontSize={13} color="$color">
          {`• ${t(CHECKOUT_REQUIREMENT_KEYS[requirement])}`}
        </Text>
      ))}
      <PrimaryButton
        testID="checkout-requirements-action"
        label={t('mweb.checkout.needAction')}
        onPress={() => navigation.navigate('Profile', params)}
      />
    </YStack>
  );
}
