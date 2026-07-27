import { useState, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { EarningsStatement, StatementLine } from '@duncit/utils';

/** Subtle section tints — venue-side vs everything else (both themes). */
const DEFAULT_TINT = 'rgba(99,102,241,0.10)';
const VENUE_TINT = 'rgba(245,158,11,0.12)';

/** One auditable row: label + amount with the formula that produced it
 * underneath. Context rows (the taxable base) render muted, not bold. */
function ChargeRow({
  line,
  money,
}: Readonly<{ line: StatementLine; money: (n: number) => string }>) {
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
        Formula: {line.formula}
      </Text>
    </YStack>
  );
}

interface SectionProps {
  title: string;
  amount: string;
  tint: string;
  testID: string;
  children: ReactNode;
}

/** One collapsible charge section — pressable header with a rotating chevron. */
function ChargeSection({ title, amount, tint, testID, children }: Readonly<SectionProps>) {
  const { muted } = useThemeColors();
  const [open, setOpen] = useState(false);
  return (
    <YStack borderRadius={10} overflow="hidden" backgroundColor={tint}>
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
        pressStyle={{ opacity: 0.8 }}
      >
        <Text fontSize={13} fontWeight="800" color="$color" flexShrink={1}>
          {title}
        </Text>
        <XStack alignItems="center" gap={4}>
          <Text fontSize={13} fontWeight="800" color="$color">
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

interface Props {
  statement: EarningsStatement;
  money: (value: number) => string;
}

/** "Govt. and other charges" — the auditable deductions tree. Every section
 * keeps its subtotal on the header and every row carries the exact formula the
 * server used, so each value can be verified by hand. mWeb twin. */
export function ChargesAccordion({ statement, money }: Readonly<Props>) {
  const { primary, muted } = useThemeColors();
  const [open, setOpen] = useState(true);

  return (
    <YStack
      testID="price-panel-charges"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
      overflow="hidden"
    >
      <XStack
        testID="price-panel-charges-header"
        role="button"
        aria-label="Govt. and other charges"
        aria-expanded={open}
        onPress={() => setOpen((value) => !value)}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={12}
        paddingVertical={11}
        pressStyle={{ opacity: 0.8 }}
      >
        <XStack alignItems="center" gap={8} flexShrink={1}>
          <MaterialIcons name="receipt-long" size={16} color={primary} />
          <Text fontSize={13.5} fontWeight="900" color="$color">
            Govt. and other charges
          </Text>
        </XStack>
        <XStack alignItems="center" gap={4}>
          <Text fontSize={13.5} fontWeight="900" color="$color">
            {money(statement.total_deductions)}
          </Text>
          <MaterialIcons
            name="expand-more"
            size={20}
            color={muted}
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          />
        </XStack>
      </XStack>
      {open ? (
        <YStack gap={8} paddingHorizontal={8} paddingBottom={8}>
          {statement.sections.map((section) => (
            <ChargeSection
              key={section.key}
              title={section.title}
              amount={money(section.total)}
              tint={section.key === 'venue' ? VENUE_TINT : DEFAULT_TINT}
              testID={`price-panel-${section.key}-group`}
            >
              {section.lines.map((line) => (
                <ChargeRow key={line.key} line={line} money={money} />
              ))}
            </ChargeSection>
          ))}
          <XStack justifyContent="space-between" paddingHorizontal={12} paddingTop={2}>
            <Text fontSize={13} fontWeight="800" color="$color">
              Total deductions
            </Text>
            <Text fontSize={13} fontWeight="900" color="$color">
              {money(statement.total_deductions)}
            </Text>
          </XStack>
          {statement.reconciled ? null : (
            <Text testID="price-panel-reconcile-warning" fontSize={11.5} color="$danger">
              These figures do not reconcile — refresh, or contact support if this persists.
            </Text>
          )}
        </YStack>
      ) : null}
    </YStack>
  );
}
