import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { EarningsStatement } from '@duncit/utils';
import { ChargeRow, ChargeSection, sectionTint } from './ChargeSection';
import { VENUE_SHORTFALL_MESSAGE } from './step4-copy';
interface Props {
  statement: EarningsStatement;
  money: (value: number) => string;
  /** The pod's total value is below the venue slot price — flag Venue Charges. */
  venueShortfall: boolean;
}

/** "Govt. and other charges" — the auditable deductions tree. Every section
 * keeps its subtotal on the header and every row carries the exact formula the
 * server used, so each value can be verified by hand. mWeb twin. */
export function ChargesAccordion({ statement, money, venueShortfall }: Readonly<Props>) {
  const { primary, muted } = useThemeColors();
  const [open, setOpen] = useState(true);

  return (
    <YStack
      testID="price-panel-charges"
      borderWidth={1}
      // The whole tree carries the failure, exactly like the mWeb twin, so the
      // blocked venue section is findable while the accordion is collapsed.
      borderColor={venueShortfall ? '$danger' : '$borderColor'}
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
          <Text fontSize={13.5} fontWeight="700" color="$color">
            Govt. and other charges
          </Text>
        </XStack>
        <XStack alignItems="center" gap={4}>
          <Text fontSize={13.5} fontWeight="700" color="$color">
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
          {statement.sections.map((section) => {
            const isVenue = section.key === 'venue';
            const shortfall = isVenue && venueShortfall;
            return (
              <ChargeSection
                key={section.key}
                title={section.title}
                amount={money(section.total)}
                tint={sectionTint(isVenue, shortfall)}
                invalidMessage={shortfall ? VENUE_SHORTFALL_MESSAGE : undefined}
                testID={`price-panel-${section.key}-group`}
              >
                {section.lines.map((line) => (
                  <ChargeRow key={line.key} line={line} money={money} />
                ))}
              </ChargeSection>
            );
          })}
          <XStack justifyContent="space-between" paddingHorizontal={12} paddingTop={2}>
            <Text fontSize={13} fontWeight="600" color="$color">
              Total deductions
            </Text>
            <Text fontSize={13} fontWeight="700" color="$color">
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
