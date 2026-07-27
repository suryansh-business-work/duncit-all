import { useState, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { PotentialEarnings } from '@/hooks/usePotentialEarnings';
import { buildChargeGroups, type ChargeLine } from './charge-groups';

/** Subtle group tints — platform-side vs venue-side (works on both themes). */
const GST_TINT = 'rgba(99,102,241,0.10)';
const VENUE_TINT = 'rgba(245,158,11,0.12)';

function ChargeRow({ line, money }: Readonly<{ line: ChargeLine; money: (n: number) => string }>) {
  return (
    <XStack justifyContent="space-between" gap={12} paddingHorizontal={12} paddingVertical={6}>
      <Text fontSize={12.5} color="$muted" flexShrink={1}>
        • {line.label}
      </Text>
      <Text fontSize={12.5} fontWeight="700" color="$color">
        {money(line.value)}
      </Text>
    </XStack>
  );
}

interface SectionProps {
  title: string;
  amount: string;
  tint: string;
  testID: string;
  children: ReactNode;
}

/** One collapsible charge group — pressable header with a rotating chevron. */
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
  waterfall: PotentialEarnings;
  hasVenue: boolean;
  money: (value: number) => string;
}

/** "Govt. and other charges" — the collapsible deductions tree between the
 * collection line and the payout card. Group totals stay on the headers, so
 * the full charge picture reads without opening anything. mWeb twin. */
export function ChargesAccordion({ waterfall, hasVenue, money }: Readonly<Props>) {
  const { primary, muted } = useThemeColors();
  const [open, setOpen] = useState(true);
  const groups = buildChargeGroups(waterfall, hasVenue);

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
            {money(groups.totalDeductions)}
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
          <ChargeSection
            title="1. GST and other charges"
            amount={money(groups.gstTotal)}
            tint={GST_TINT}
            testID="price-panel-gst-group"
          >
            {groups.gstLines.map((line) => (
              <ChargeRow key={line.label} line={line} money={money} />
            ))}
          </ChargeSection>
          {hasVenue ? (
            <ChargeSection
              title="2. Venue charges"
              amount={money(groups.venueTotal)}
              tint={VENUE_TINT}
              testID="price-panel-venue-group"
            >
              {groups.venueLines.map((line) => (
                <ChargeRow key={line.label} line={line} money={money} />
              ))}
            </ChargeSection>
          ) : null}
          <XStack justifyContent="space-between" paddingHorizontal={12} paddingTop={2}>
            <Text fontSize={13} fontWeight="800" color="$color">
              Total deductions
            </Text>
            <Text fontSize={13} fontWeight="900" color="$color">
              {money(groups.totalDeductions)}
            </Text>
          </XStack>
        </YStack>
      ) : null}
    </YStack>
  );
}
