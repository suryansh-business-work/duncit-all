import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import type { CityLaunchProblem } from '@/hooks/useCityLaunch';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { CityLaunchLocationDialog } from './CityLaunchLocationDialog';
import { LAUNCH_INK, LaunchGlass } from './LaunchGlass';

interface Props {
  city: string;
  subscribing: boolean;
  problem: CityLaunchProblem | null;
  /** Adds the member with their answer to the share-your-location question. */
  onSubscribe: (locationShared: boolean) => void;
  onGoToProfile: () => void;
  onSignIn: () => void;
}

/**
 * The call to action before a name is added. A session the server no longer
 * accepts is sent to sign in; signed in it first asks whether they will share
 * their current location, then adds the member with that answer. The server
 * needs a WhatsApp number to notify, so an account without one is sent to add
 * it. mWeb twin: components/city-launch/CityLaunchNotify.
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
  const [asking, setAsking] = useState(false);
  const arrow = <MaterialIcons name="arrow-forward" size={20} color={onPrimary} />;

  const onAnswer = (locationShared: boolean) => {
    setAsking(false);
    onSubscribe(locationShared);
  };

  if (problem === 'UNAUTHENTICATED') {
    return (
      <DuncitButton
        testID="city-launch-sign-in"
        size="lg"
        fullWidth
        elevated
        label={t('mweb.cityLaunch.signInCta')}
        iconAfter={arrow}
        onPress={onSignIn}
      />
    );
  }

  if (problem === 'WHATSAPP_REQUIRED') {
    return (
      <LaunchGlass testID="city-launch-need-whatsapp" gap={12}>
        <Text role="alert" fontSize={15} lineHeight={21} color={LAUNCH_INK}>
          {t('mweb.cityLaunch.needWhatsapp', { vars: { city } })}
        </Text>
        <YStack alignSelf="flex-start">
          <DuncitButton
            testID="city-launch-go-to-profile"
            label={t('mweb.cityLaunch.goToProfile')}
            onPress={onGoToProfile}
          />
        </YStack>
      </LaunchGlass>
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
        icon={<MaterialIcons name="person-add" size={20} color={onPrimary} />}
        iconAfter={arrow}
        label={t('mweb.cityLaunch.notifyCta')}
        onPress={() => setAsking(true)}
      />
      <CityLaunchLocationDialog open={asking} onAnswer={onAnswer} />
      {/* No toast on native: the failure is said where the button is. */}
      {problem === 'FAILED' ? (
        <Text testID="city-launch-subscribe-failed" role="alert" fontSize={13} color={LAUNCH_INK}>
          {t('mweb.cityLaunch.subscribeFailed')}
        </Text>
      ) : null}
    </YStack>
  );
}
