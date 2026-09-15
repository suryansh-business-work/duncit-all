import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import type { TicketDiscountLabels, TicketDiscountTier } from '@duncit/utils';

import { FIELD_HEIGHT, FIELD_RADIUS, Field } from '@/components/Field';
import { useThemeColors } from '@/hooks/useThemeColors';

/** The field messages one tier row shows, already translated by the form. */
export interface TicketDiscountTierRowErrors {
  min_tickets?: string;
  discount_pct?: string;
}

export type TicketDiscountTierRowProps = Readonly<{
  index: number;
  tier: TicketDiscountTier;
  maxPct: number;
  labels: TicketDiscountLabels;
  /** Formatted price of one ticket at this tier; the caption is left out without it. */
  perTicket?: string;
  errors?: TicketDiscountTierRowErrors;
  disabled: boolean;
  onChange: (tier: TicketDiscountTier) => void;
  onRemove: () => void;
}>;

/**
 * The text of a number box as a whole number. RN inputs hold strings, and a
 * cleared box stores 0 so validation names the problem (TICKETS_MIN / PCT_MIN)
 * instead of the row quietly keeping the value just deleted. mWeb twin:
 * `toWholeNumber` in @duncit/ui TicketDiscountTierRow.
 */
const parseWhole = (text: string): number => {
  const value = Number.parseInt(text, 10);
  return Number.isNaN(value) ? 0 : value;
};

type TierNumberInputProps = Readonly<{
  testID: string;
  label: string;
  value: number;
  error?: string;
  hint?: string;
  disabled: boolean;
  onChange: (value: number) => void;
}>;

/** One labelled number box of a tier row — the Tamagui stand-in for MUI's number TextField. */
function TierNumberInput({
  testID,
  label,
  value,
  error,
  hint,
  disabled,
  onChange,
}: TierNumberInputProps) {
  return (
    <YStack flex={1} minWidth={0}>
      <Field label={label} error={error} hint={hint} testID={testID} gap={6}>
        <Input
          testID={testID}
          size="$4"
          minHeight={FIELD_HEIGHT}
          borderRadius={FIELD_RADIUS}
          paddingHorizontal={14}
          backgroundColor="$surface"
          color="$color"
          borderColor={error ? '$danger' : '$borderColor'}
          keyboardType="number-pad"
          value={String(value)}
          onChangeText={(text) => onChange(parseWhole(text))}
          readOnly={disabled}
          aria-label={label}
          aria-invalid={!!error}
        />
      </Field>
    </YStack>
  );
}

/**
 * One stored tier of the multi-ticket discount: how many tickets a single
 * booking needs, the discount it then gets, and the remove button. Native twin
 * of @duncit/ui TicketDiscountTierRow (same test ids, rule 27).
 */
export function TicketDiscountTierRow({
  index,
  tier,
  maxPct,
  labels,
  perTicket,
  errors,
  disabled,
  onChange,
  onRemove,
}: TicketDiscountTierRowProps) {
  const { danger } = useThemeColors();
  return (
    <YStack
      testID={`ticket-discount-tier-${index}`}
      gap={6}
      padding={12}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
    >
      <XStack gap={8} alignItems="flex-start">
        <TierNumberInput
          testID={`ticket-discount-tier-min-${index}`}
          label={labels.ticketsLabel}
          value={tier.min_tickets}
          error={errors?.min_tickets}
          disabled={disabled}
          onChange={(min_tickets) => onChange({ ...tier, min_tickets })}
        />
        <TierNumberInput
          testID={`ticket-discount-tier-pct-${index}`}
          label={labels.discountLabel}
          value={tier.discount_pct}
          error={errors?.discount_pct}
          hint={labels.maxHint(maxPct)}
          disabled={disabled}
          onChange={(discount_pct) => onChange({ ...tier, discount_pct })}
        />
        <XStack
          testID={`ticket-discount-tier-remove-${index}`}
          role="button"
          tabIndex={0}
          aria-label={labels.removeTier}
          aria-disabled={disabled}
          onPress={disabled ? undefined : onRemove}
          width={44}
          height={44}
          marginTop={24}
          alignItems="center"
          justifyContent="center"
          opacity={disabled ? 0.5 : 1}
          pressStyle={PRESS_STYLE.inline}
        >
          <MaterialIcons name="delete-outline" size={20} color={danger} />
        </XStack>
      </XStack>
      {perTicket === undefined ? null : (
        <Text fontSize={12} color="$muted">
          {labels.perTicket(perTicket)}
        </Text>
      )}
    </YStack>
  );
}
