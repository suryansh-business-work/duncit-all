import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  isHost: boolean;
  onCreatePod: () => void;
  onBecomeHost: () => void;
}

/**
 * "Host your own pod → Create Pod" as a calm card: an accent icon disc, the
 * title and one green pill. Hosts go straight to pod creation; everyone else
 * is invited into the Earn hub. Tamagui twin of mWeb's HostCtaBanner.
 */
export function HostCtaBanner({ isHost, onCreatePod, onBecomeHost }: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const title = isHost ? t('mweb.home.hostCtaTitle') : t('mweb.home.becomeHostCtaTitle');
  const buttonLabel = isHost ? t('mweb.home.hostCtaButton') : t('mweb.home.becomeHostCtaButton');
  const onPress = isHost ? onCreatePod : onBecomeHost;

  return (
    <SurfaceCard
      testID="host-cta-banner"
      role="button"
      aria-label={title}
      onPress={onPress}
      marginHorizontal={16}
      flexDirection="row"
      alignItems="center"
      gap={12}
      padding={12}
      pressStyle={PRESS_STYLE.surface}
    >
      <XStack
        width={44}
        height={44}
        borderRadius={22}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$soft"
      >
        <MaterialIcons name="groups" size={24} color={accent} />
      </XStack>
      <Text flex={1} minWidth={0} fontSize={16} fontWeight="600" color="$color" numberOfLines={2}>
        {title}
      </Text>
      <XStack
        height={44}
        alignItems="center"
        paddingHorizontal={20}
        borderRadius={999}
        backgroundColor="$primary"
      >
        <Text color="$onPrimary" fontSize={14} fontWeight="600">
          {buttonLabel}
        </Text>
      </XStack>
    </SurfaceCard>
  );
}
