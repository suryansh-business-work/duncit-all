import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { CityLaunchProblem } from '@/hooks/useCityLaunch';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  city: string;
  subscribing: boolean;
  problem: CityLaunchProblem | null;
  onSubscribe: () => void;
  onGoToProfile: () => void;
  onSignIn: () => void;
}

/**
 * The call to action before a name is added. A session the server no longer
 * accepts is sent to sign in; signed in it adds the member. The server needs a
 * WhatsApp number to notify, so an account without one is sent to add it.
 * mWeb twin: components/city-launch/CityLaunchNotify.
 */
export function CityLaunchNotify({
  city,
  subscribing,
  problem,
  onSubscribe,
  onGoToProfile,
  onSignIn,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();

  if (problem === 'UNAUTHENTICATED') {
    return (
      <PrimaryButton
        testID="city-launch-sign-in"
        label={t('mweb.cityLaunch.signInCta')}
        onPress={onSignIn}
      />
    );
  }

  if (problem === 'WHATSAPP_REQUIRED') {
    return (
      <SurfaceCard testID="city-launch-need-whatsapp" gap={12}>
        <Text role="alert" fontSize={15} lineHeight={21} color="$color">
          {t('mweb.cityLaunch.needWhatsapp', { vars: { city } })}
        </Text>
        <YStack alignSelf="flex-start">
          <DuncitButton
            testID="city-launch-go-to-profile"
            label={t('mweb.cityLaunch.goToProfile')}
            onPress={onGoToProfile}
          />
        </YStack>
      </SurfaceCard>
    );
  }

  return (
    <YStack gap={8}>
      <DuncitButton
        testID="city-launch-notify"
        size="lg"
        fullWidth
        elevated
        loading={subscribing}
        icon={<MaterialIcons name="notifications-active" size={20} color={onPrimary} />}
        label={t('mweb.cityLaunch.notifyCta', { vars: { city } })}
        onPress={onSubscribe}
      />
      {/* No toast on native: the failure is said where the button is. */}
      {problem === 'FAILED' ? (
        <Text testID="city-launch-subscribe-failed" role="alert" fontSize={13} color="$danger">
          {t('mweb.cityLaunch.subscribeFailed')}
        </Text>
      ) : null}
    </YStack>
  );
}
