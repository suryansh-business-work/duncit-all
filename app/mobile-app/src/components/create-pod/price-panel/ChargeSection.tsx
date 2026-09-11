import { useState, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { withAlpha } from '@/constants/survey-palette';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { StatementLine } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Section tints — theme tokens, so both modes flip on their own. */
export const DEFAULT_TINT = '$soft';
/** Alpha of the venue's amber tint over the theme's `warning` (there is no soft
 * warning token) — mWeb's twin is alpha(warning.main, 0.12). */
export const VENUE_TINT = 0.12;
/** The venue section when the pod cannot cover the slot price. */
export const SHORTFALL_TINT = '$dangerSoft';

/** One auditable row: label + amount with the formula that produced it
 * underneath. Context rows (the taxable base) render muted, not bold. */
export function ChargeRow({
  line,
  money,
}: Readonly<{ line: StatementLine; money: (n: number) => string }>) {
  const { t } = useTranslation();
  return (
    <YStack paddingHorizontal={12} paddingVertical={6} gap={2}>
      <XStack justifyContent="space-between" gap={12}>
        <Text fontSize={14} color={line.deduction ? '$color' : '$muted'} flexShrink={1}>
          {line.label}
        </Text>
        <Text fontSize={14} fontWeight={line.deduction ? '700' : '500'} color="$color">
          {money(line.amount)}
        </Text>
      </XStack>
      <Text fontSize={12} color="$muted">
        {t('mweb.createPod.formula', { vars: { formula: line.formula } })}
      </Text>
    </YStack>
  );
}

interface SectionProps {
  title: string;
  /** Why this charge exists — revealed by the section's info button. */
  description: string;
  amount: string;
  tint: string;
  testID: string;
  /** Blocking validation message rendered under the header, always visible. */
  invalidMessage?: string;
  children: ReactNode;
}

/**
 * One collapsible charge section — pressable header with a rotating chevron,
 * and beside it an info button that opens the reason the charge exists.
 * An `invalidMessage` turns the section red and pins the reason under it.
 *
 * The info control sits OUTSIDE the header press area, exactly as on mWeb: the
 * header opens the arithmetic, the info button opens the justification, and
 * nesting one press target in the other would make them fight for the tap.
 */
export function ChargeSection({
  title,
  description,
  amount,
  tint,
  testID,
  invalidMessage,
  children,
}: Readonly<SectionProps>) {
  const { muted, primary } = useThemeColors();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(false);
  const { t } = useTranslation();
  const infoColor = info ? primary : muted;
  return (
    <YStack
      borderRadius={16}
      overflow="hidden"
      backgroundColor={tint}
      borderWidth={invalidMessage ? 1.5 : 1}
      borderColor={invalidMessage ? '$danger' : '$borderColor'}
    >
      <XStack alignItems="center" paddingRight={6}>
        <XStack
          flex={1}
          testID={testID}
          role="button"
          aria-label={title}
          aria-expanded={open}
          onPress={() => setOpen((value) => !value)}
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal={12}
          paddingVertical={10}
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={14} fontWeight="600" color="$color" flexShrink={1}>
            {title}
          </Text>
          <XStack alignItems="center" gap={4}>
            <Text fontSize={14} fontWeight="600" color="$color">
              {amount}
            </Text>
            <MaterialIcons
              name="expand-more"
              size={18}
              color={muted}
              style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
            />
          </XStack>
        </XStack>
        <XStack
          testID={`${testID}-info`}
          role="button"
          aria-label={t('earnings.statement.whyThisCharge')}
          aria-expanded={info}
          onPress={() => setInfo((value) => !value)}
          padding={6}
          pressStyle={PRESS_STYLE.control}
        >
          <MaterialIcons name="info-outline" size={16} color={infoColor} />
        </XStack>
      </XStack>
      {info ? (
        <YStack
          testID={`${testID}-description`}
          backgroundColor="$surface"
          marginHorizontal={4}
          marginBottom={4}
          borderRadius={12}
          paddingHorizontal={10}
          paddingVertical={8}
        >
          <Text fontSize={12} color="$muted" lineHeight={17}>
            {description}
          </Text>
        </YStack>
      ) : null}
      {invalidMessage ? (
        <Text
          testID={`${testID}-invalid`}
          fontSize={12}
          fontWeight="600"
          color="$danger"
          paddingHorizontal={12}
          paddingBottom={10}
        >
          {invalidMessage}
        </Text>
      ) : null}
      {open ? (
        <YStack backgroundColor="$surface" marginHorizontal={4} marginBottom={4} borderRadius={12}>
          {children}
        </YStack>
      ) : null}
    </YStack>
  );
}

/** Venue-side sections carry the amber tint (the theme's `warning` colour), and
 * the red one when the pod cannot cover the slot price; everything else stays
 * on the soft fill. */
export function sectionTint(isVenue: boolean, shortfall: boolean, warning: string): string {
  if (shortfall) return SHORTFALL_TINT;
  return isVenue ? withAlpha(warning, VENUE_TINT) : DEFAULT_TINT;
}
