import { Image } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

const WORDMARK = require('../../assets/duncit-wordmark-white.png');
/** The wordmark file is 500 × 142. */
const WORDMARK_HEIGHT = 22;
const WORDMARK_WIDTH = Math.round((WORDMARK_HEIGHT * 500) / 142);
/**
 * One line box for the wordmark, the divider and both labels. Android pads a
 * Text box above its glyphs (includeFontPadding), which pushed the labels a
 * little off the wordmark's centre; with the padding off and the same box
 * height for all three, they share one optical centre line.
 */
const LINE = WORDMARK_HEIGHT + 2;
const LABEL = { lineHeight: LINE, includeFontPadding: false, textAlignVertical: 'center' } as const;

/**
 * The red app bar's title on the main tabs: the duncit wordmark, "CRM", a
 * divider and the screen's name — read out once as "Duncit CRM, Dialer".
 */
export function HeaderBrand({ title }: Readonly<{ title: string }>) {
  const { t } = useTranslation();
  return (
    <XStack
      alignItems="center"
      height={LINE}
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
        <Text color="$onPrimary" fontSize="$6" fontWeight="500" style={LABEL}>
          {t('crmApp.header.product')}
        </Text>
      </XStack>
      <YStack width={1} height={LINE} backgroundColor="$onPrimary" opacity={0.6} />
      <Text
        color="$onPrimary"
        fontSize="$6"
        fontWeight="700"
        numberOfLines={1}
        flexShrink={1}
        style={LABEL}
      >
        {title}
      </Text>
    </XStack>
  );
}
