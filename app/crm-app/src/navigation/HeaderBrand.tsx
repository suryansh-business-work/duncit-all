import { Image } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

const WORDMARK = require('../../assets/duncit-wordmark-white.png');
/** The wordmark file is 500 × 142. */
const WORDMARK_HEIGHT = 22;
const WORDMARK_WIDTH = Math.round((WORDMARK_HEIGHT * 500) / 142);
/**
 * Where the wordmark's lowercase letters ("uncit") sit inside its 142 px tall
 * file: their top (the x-height) at row 40 and their baseline at row 134 —
 * the rows above hold only the d and t ascenders and the i's dot.
 */
const WORDMARK_X_HEIGHT_ROW = 40;
const WORDMARK_BASELINE_ROW = 134;
const WORDMARK_ROWS = 142;
/**
 * One line box for the wordmark, the divider and both labels, Android's font
 * padding off. Centring boxes left the capitals of "CRM" and the screen name
 * about 2.5 dp above the wordmark's letters (its letters sit low in the file),
 * so the labels and divider move down onto the band "uncit" occupies: the
 * capitals then share its top and its baseline.
 */
const LINE = WORDMARK_HEIGHT + 2;
const BAND_CENTRE = (WORDMARK_X_HEIGHT_ROW + WORDMARK_BASELINE_ROW) / 2 / WORDMARK_ROWS;
const LABEL_SHIFT = (BAND_CENTRE - 0.5) * WORDMARK_HEIGHT;
const LABEL = {
  lineHeight: LINE,
  includeFontPadding: false,
  textAlignVertical: 'center',
  transform: [{ translateY: LABEL_SHIFT }],
} as const;

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
      <YStack
        width={1}
        height={LINE}
        backgroundColor="$onPrimary"
        opacity={0.6}
        transform={[{ translateY: LABEL_SHIFT }]}
      />
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
