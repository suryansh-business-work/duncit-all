import { Image } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

const WORDMARK = require('../../assets/duncit-wordmark-white.png');
/** The wordmark file is 500 × 142. */
const WORDMARK_HEIGHT = 22;
const WORDMARK_WIDTH = Math.round((WORDMARK_HEIGHT * 500) / 142);

/**
 * The red app bar's title on the main tabs: the duncit wordmark, "CRM", a
 * divider and the screen's name — read out once as "Duncit CRM, Dialer".
 */
export function HeaderBrand({ title }: Readonly<{ title: string }>) {
  const { t } = useTranslation();
  return (
    <XStack
      alignItems="center"
      gap="$2.5"
      role="heading"
      aria-label={`${t('crmApp.login.title')}, ${title}`}
      testID="header-brand"
    >
      <XStack
        alignItems="center"
        gap="$1.5"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Image
          source={WORDMARK}
          style={{ width: WORDMARK_WIDTH, height: WORDMARK_HEIGHT }}
          resizeMode="contain"
          accessible={false}
        />
        <Text color="$onPrimary" fontSize="$6" fontWeight="500">
          {t('crmApp.header.product')}
        </Text>
      </XStack>
      <YStack width={1} height={22} backgroundColor="$onPrimary" opacity={0.6} />
      <Text color="$onPrimary" fontSize="$6" fontWeight="700" numberOfLines={1} flexShrink={1}>
        {title}
      </Text>
    </XStack>
  );
}
