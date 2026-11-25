import { Image } from 'react-native';
import { Text, XStack } from 'tamagui';

import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';

const LOGO = require('../../../assets/duncit-logo.png');

/** The portal login card's top row: the Duncit mark and "duncit.com", and the console's name as a chip. */
export function AuthCardHeader() {
  const { t } = useTranslation();
  return (
    <XStack alignItems="center" justifyContent="space-between" marginBottom="$2">
      <XStack alignItems="center" gap="$2">
        <Image
          source={LOGO}
          style={{ width: 26, height: 26, borderRadius: RADII.sm / 2 }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessible={false}
        />
        <Text fontSize="$5" fontWeight="800" letterSpacing={0.2}>
          {t('crmApp.login.domain')}
        </Text>
      </XStack>
      <XStack
        borderWidth={1}
        borderColor="$primary"
        borderRadius={RADII.pill}
        paddingHorizontal="$2.5"
        paddingVertical="$1"
      >
        <Text color="$primary" fontSize="$2" fontWeight="700">
          {t('crmApp.login.portal')}
        </Text>
      </XStack>
    </XStack>
  );
}
