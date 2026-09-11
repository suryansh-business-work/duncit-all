import { MaterialIcons } from '@expo/vector-icons';
import { Text } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  /** Hidden when the account has no email or it is already verified. */
  email?: string | null;
  verified: boolean;
  onPress: () => void;
}

/** Home nudge to verify the account email — the RN twin of the info bar mWeb's
 * header shows. Tapping opens Profile Settings, where the verification section
 * mails and checks the OTP. */
export function VerifyEmailBanner({ email, verified, onPress }: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent, muted } = useThemeColors();
  if (!email || verified) return null;

  return (
    <SurfaceCard
      testID="verify-email-banner"
      role="button"
      aria-label={t('mweb.home.verifyYourEmail')}
      onPress={onPress}
      marginHorizontal={16}
      flexDirection="row"
      alignItems="center"
      gap={12}
      paddingHorizontal={16}
      paddingVertical={14}
      pressStyle={PRESS_STYLE.surface}
    >
      <MaterialIcons name="mark-email-unread" size={20} color={accent} />
      <Text flex={1} fontSize={14} fontWeight="600" color="$color">
        {t('mweb.home.verifyYourEmail')}
      </Text>
      <MaterialIcons name="chevron-right" size={20} color={muted} />
    </SurfaceCard>
  );
}
