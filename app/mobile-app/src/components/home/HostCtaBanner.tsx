import { StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  isHost: boolean;
  onCreatePod: () => void;
  onBecomeHost: () => void;
}

/**
 * The mock's pink gradient banner: "Host your own pod → Create Pod". Hosts go
 * straight to pod creation; everyone else is invited into the Earn hub. Tamagui
 * twin of mWeb's HostCtaBanner.
 */
export function HostCtaBanner({ isHost, onCreatePod, onBecomeHost }: Readonly<Props>) {
  const { t } = useTranslation();
  const title = isHost ? t('mweb.home.hostCtaTitle') : t('mweb.home.becomeHostCtaTitle');
  const subtitle = isHost ? t('mweb.home.hostCtaSubtitle') : t('mweb.home.becomeHostCtaSubtitle');
  const buttonLabel = isHost ? t('mweb.home.hostCtaButton') : t('mweb.home.becomeHostCtaButton');
  const onPress = isHost ? onCreatePod : onBecomeHost;

  return (
    <XStack
      testID="host-cta-banner"
      role="button"
      aria-label={title}
      onPress={onPress}
      marginHorizontal={16}
      borderRadius={20}
      overflow="hidden"
      alignItems="center"
      gap={12}
      padding={14}
      pressStyle={PRESS_STYLE.surface}
    >
      <LinearGradient
        colors={['#ff4f73', '#f5337a', '#ff8b5f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <XStack
        width={42}
        height={42}
        borderRadius={21}
        alignItems="center"
        justifyContent="center"
        backgroundColor="rgba(255,255,255,0.2)"
        borderWidth={1}
        borderColor="rgba(255,255,255,0.4)"
        zIndex={1}
      >
        <MaterialIcons name="groups" size={22} color="#ffffff" />
      </XStack>
      <YStack flex={1} minWidth={0} zIndex={1}>
        <Text color="#ffffff" fontSize={14.5} fontWeight="700" numberOfLines={1}>
          {title}
        </Text>
        <Text color="rgba(255,255,255,0.92)" fontSize={11.5} fontWeight="600" numberOfLines={2}>
          {subtitle}
        </Text>
      </YStack>
      <XStack
        alignItems="center"
        gap={4}
        backgroundColor="#ffffff"
        borderRadius={999}
        paddingHorizontal={13}
        paddingVertical={8}
        zIndex={1}
      >
        <Text color="#ff4f73" fontSize={12.5} fontWeight="700">
          {buttonLabel}
        </Text>
        <MaterialIcons name="arrow-forward" size={14} color="#ff4f73" />
      </XStack>
    </XStack>
  );
}
