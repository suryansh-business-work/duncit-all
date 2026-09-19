import { Linking, Share } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { config } from '@/constants/config';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

import { CityLaunchActionTile } from './CityLaunchActionTile';
import { LAUNCH_INK, LaunchGlass } from './LaunchGlass';

interface Props {
  /** The city's slug (`Location.location_id`, e.g. "agra"). */
  citySlug: string;
  city: string;
  /** The city's WhatsApp group; '' hides the tile. */
  whatsappGroupUrl: string;
}

/**
 * Once a name is added: the confirmation, a tile to pass the page on (the
 * system share sheet, with this city's own waitlist link) and, when the admin
 * set one, the city's WhatsApp group — all in one glass panel over the first
 * screen's video. mWeb twin: components/city-launch/CityLaunchAdded.
 */
export function CityLaunchAdded({ citySlug, city, whatsappGroupUrl }: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent, success } = useThemeColors();

  const onShare = () => {
    // The mWeb origin of THIS build, so a staging app shares a staging link —
    // on the city's own slug, so the address reads (and ranks) as that city's page.
    const url = `${config.webUrl}/city-launch/${citySlug}`;
    fireAndForget(
      Share.share({ message: t('mweb.cityLaunch.shareText', { vars: { city, url } }) }),
    );
  };

  return (
    <LaunchGlass testID="city-launch-added" gap={12}>
      <XStack gap={8} alignItems="center">
        <MaterialIcons name="check-circle" size={24} color={success} />
        <Text
          role="heading"
          flex={1}
          fontSize={18}
          lineHeight={23}
          fontWeight="600"
          color={LAUNCH_INK}
        >
          {t('mweb.cityLaunch.addedTitle')}
        </Text>
      </XStack>
      <Text fontSize={15} lineHeight={21} color={LAUNCH_INK} opacity={0.9}>
        {t('mweb.cityLaunch.addedBody', { vars: { city } })}
      </Text>
      <CityLaunchActionTile
        testID="city-launch-share"
        icon={<MaterialIcons name="share" size={22} color={accent} />}
        label={t('mweb.cityLaunch.shareFriends')}
        onPress={onShare}
      />
      {whatsappGroupUrl ? (
        <CityLaunchActionTile
          testID="city-launch-join-whatsapp"
          icon={<Ionicons name="logo-whatsapp" size={22} color={accent} />}
          label={t('mweb.cityLaunch.joinWhatsapp', { vars: { city } })}
          onPress={() => fireAndForget(Linking.openURL(whatsappGroupUrl))}
        />
      ) : null}
    </LaunchGlass>
  );
}
