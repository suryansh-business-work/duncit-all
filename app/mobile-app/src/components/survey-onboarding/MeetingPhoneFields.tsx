import { Input, Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useTranslation } from '@/hooks/useTranslation';
import { CALM_FIELD } from './calmField';

interface Props {
  ext: string;
  phone: string;
  hasProfilePhone: boolean;
  onGoToProfile: () => void;
}

/**
 * The read-only contact number, always taken from the profile — and, when the
 * profile has none, the notice that sends them to add it (phone is required).
 * Split out of MeetingPhase to keep that file within the 200-line rule.
 */
export function MeetingPhoneFields({
  ext,
  phone,
  hasProfilePhone,
  onGoToProfile,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <>
      <Text fontSize={14} fontWeight="600" color="$color">
        {t('mweb.common.phone')} *
      </Text>
      <XStack gap={8}>
        <Input
          testID="meeting-ext"
          aria-label={t('mweb.surveyOnboarding.countryCode')}
          value={ext}
          {...CALM_FIELD}
          disabled
          opacity={0.6}
          width={84}
        />
        <Input
          testID="meeting-phone"
          aria-label={t('mweb.common.phone')}
          value={phone}
          keyboardType="phone-pad"
          {...CALM_FIELD}
          disabled
          opacity={0.6}
          flex={1}
        />
      </XStack>
      {hasProfilePhone ? (
        <Text fontSize={12} color="$muted">
          {t('mweb.surveyGate.fromYourProfile')}
        </Text>
      ) : (
        <YStack gap={8} padding={16} borderRadius={16} backgroundColor="$soft">
          <Text testID="meeting-phone-missing" fontSize={13} color="$color">
            {t('mweb.surveyOnboarding.phoneRequiredNotice')}
          </Text>
          <XStack
            testID="meeting-go-to-profile"
            role="button"
            aria-label={t('mweb.surveyOnboarding.goToProfile')}
            onPress={onGoToProfile}
            alignSelf="flex-start"
            height={36}
            alignItems="center"
            paddingHorizontal={16}
            borderRadius={999}
            backgroundColor="$primary"
            pressStyle={PRESS_STYLE.solid}
          >
            <Text fontSize={13} fontWeight="600" color="$onPrimary">
              {t('mweb.surveyOnboarding.goToProfile')}
            </Text>
          </XStack>
        </YStack>
      )}
    </>
  );
}
