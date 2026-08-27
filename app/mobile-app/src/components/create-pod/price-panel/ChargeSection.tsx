import { useState, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { StatementLine } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Subtle section tints — venue-side vs everything else (both themes). */
export const DEFAULT_TINT = 'rgba(99,102,241,0.10)';
export const VENUE_TINT = 'rgba(245,158,11,0.12)';
/** The venue section when the pod cannot cover the slot price. */
export const SHORTFALL_TINT = 'rgba(239,68,68,0.12)';

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
        <Text fontSize={12.5} color={line.deduction ? '$color' : '$muted'} flexShrink={1}>
          {line.label}
        </Text>
        <Text fontSize={12.5} fontWeight={line.deduction ? '700' : '500'} color="$color">
          {money(line.amount)}
        </Text>
      </XStack>
      <Text fontSize={10.5} color="$muted">
        {t('mweb.createPod.formula', { vars: { formula: line.formula } })}
      </Text>
    </YStack>
  );
}

interface SectionProps {
  title: string;
  amount: string;
  tint: string;
  testID: string;
  /** Blocking validation message rendered under the header, always visible. */
  invalidMessage?: string;
  children: ReactNode;
}

/** One collapsible charge section — pressable header with a rotating chevron.
 * An `invalidMessage` turns the section red and pins the reason under it. */
export function ChargeSection({
  title,
  amount,
  tint,
  testID,
  invalidMessage,
  children,
}: Readonly<SectionProps>) {
  const { muted } = useThemeColors();
  const [open, setOpen] = useState(false);
  return (
    <YStack
      borderRadius={10}
      overflow="hidden"
      backgroundColor={tint}
      borderWidth={invalidMessage ? 1.5 : 0}
      borderColor="$danger"
    >
      <XStack
        testID={testID}
        role="button"
        aria-label={title}
        aria-expanded={open}
        onPress={() => setOpen((value) => !value)}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={12}
        paddingVertical={9}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={13} fontWeight="600" color="$color" flexShrink={1}>
          {title}
        </Text>
        <XStack alignItems="center" gap={4}>
          <Text fontSize={13} fontWeight="600" color="$color">
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
        <YStack
          backgroundColor="$background"
          marginHorizontal={4}
          marginBottom={4}
          borderRadius={8}
        >
          {children}
        </YStack>
      ) : null}
    </YStack>
  );
}

/** Venue-side sections carry the amber tint, and the red one when the pod
 * cannot cover the slot price; everything else stays neutral. */
export function sectionTint(isVenue: boolean, shortfall: boolean): string {
  if (shortfall) return SHORTFALL_TINT;
  return isVenue ? VENUE_TINT : DEFAULT_TINT;
}
