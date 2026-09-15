import { useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import {
  TICKET_DISCOUNT_MAX_TIERS,
  nextTicketDiscountTier,
  ticketDiscountRows,
  type TicketDiscountLabels,
  type TicketDiscountTier,
} from '@duncit/utils';

import { SectionHeader } from '@/components/SectionHeader';
import { ToggleRow } from '@/components/ToggleRow';
import { useThemeColors } from '@/hooks/useThemeColors';
import { TicketDiscountTierRow, type TicketDiscountTierRowErrors } from './TicketDiscountTierRow';

/** Messages the form resolved: `list` for the whole ladder, `rows[i]` for one tier's fields. */
export interface TicketDiscountFieldErrors {
  list?: string;
  rows?: ReadonlyArray<TicketDiscountTierRowErrors | undefined>;
}

export type TicketDiscountFieldProps = Readonly<{
  enabled: boolean;
  tiers: readonly TicketDiscountTier[];
  onEnabledChange: (enabled: boolean) => void;
  onTiersChange: (tiers: TicketDiscountTier[]) => void;
  /** `publicAppSettings.ticket_discount_max_pct`. */
  maxPct: number;
  /**
   * `ticketDiscountMaxTickets(no_of_spots)`. Kept for prop parity with the MUI
   * field, where it is the input's `max`; an RN number pad has no such bound,
   * so the form's Zod refine is what reports a row above it.
   */
  maxTickets: number;
  labels: TicketDiscountLabels;
  /** The pod's ticket price; with `formatPrice` it adds a per-ticket caption to each tier. */
  unitPrice?: number;
  formatPrice?: (amount: number) => string;
  errors?: TicketDiscountFieldErrors;
  disabled?: boolean;
}>;

/** Each tier's formatted price per ticket, by row; empty when there is no price to format. */
function perTicketPrices(
  tiers: readonly TicketDiscountTier[],
  unitPrice: number | undefined,
  formatPrice: ((amount: number) => string) | undefined,
): readonly string[] {
  if (unitPrice === undefined || formatPrice === undefined) return [];
  const rows = ticketDiscountRows(unitPrice, {
    ticket_discount_enabled: true,
    ticket_discount_tiers: tiers,
  });
  // Row 0 is the fixed base row, which has no box of its own in the editor.
  return rows.slice(1).map((row) => formatPrice(row.per_ticket));
}

/**
 * The multi-ticket discount editor — the Tamagui twin of @duncit/ui
 * TicketDiscountField (same props minus MUI, same test ids, rule 27): a switch,
 * the fixed "1 ticket · 0%" base row, one row per stored tier and "Add tier".
 *
 * Controlled and form-library free: the stepper and the host's Edit Pod sheet
 * own the values and run `ticketDiscountTierIssues` in their Zod refine.
 */
export function TicketDiscountField({
  enabled,
  tiers,
  onEnabledChange,
  onTiersChange,
  maxPct,
  labels,
  unitPrice,
  formatPrice,
  errors,
  disabled = false,
}: TicketDiscountFieldProps) {
  const { primary } = useThemeColors();
  // One stable key per row, never the index (S6479): a removed row takes its own
  // key with it, and rows arriving from outside (a reset, a draft) mint new ones.
  const keys = useRef<string[]>([]);
  const seq = useRef(0);
  while (keys.current.length < tiers.length) {
    seq.current += 1;
    keys.current.push(`ticket-discount-tier-key-${seq.current}`);
  }
  keys.current.length = tiers.length;

  const toggle = (next: boolean) => {
    onEnabledChange(next);
    if (!next) {
      onTiersChange([]);
      return;
    }
    if (tiers.length === 0) onTiersChange([nextTicketDiscountTier(tiers, maxPct)]);
  };
  const addTier = () => onTiersChange([...tiers, nextTicketDiscountTier(tiers, maxPct)]);
  const removeTier = (index: number) => {
    keys.current.splice(index, 1);
    onTiersChange(tiers.filter((_, i) => i !== index));
  };
  const changeTier = (index: number, tier: TicketDiscountTier) =>
    onTiersChange(tiers.map((row, i) => (i === index ? tier : row)));
  const addDisabled = disabled || tiers.length >= TICKET_DISCOUNT_MAX_TIERS;
  const perTicket = perTicketPrices(tiers, unitPrice, formatPrice);

  return (
    <YStack testID="ticket-discount-field" gap={12}>
      <SectionHeader title={labels.title} />
      <ToggleRow
        testID="ticket-discount"
        label={labels.switchLabel}
        hint={labels.hint}
        value={enabled}
        onChange={toggle}
        disabled={disabled}
      />
      {enabled ? (
        <YStack gap={12}>
          <YStack
            testID="ticket-discount-base-row"
            padding={12}
            borderRadius={16}
            backgroundColor="$soft"
          >
            <Text fontSize={13.5} color="$muted">
              {labels.baseRow}
            </Text>
          </YStack>
          {tiers.map((tier, index) => (
            <TicketDiscountTierRow
              key={keys.current[index]}
              index={index}
              tier={tier}
              maxPct={maxPct}
              labels={labels}
              perTicket={perTicket[index]}
              errors={errors?.rows?.[index]}
              disabled={disabled}
              onChange={(next) => changeTier(index, next)}
              onRemove={() => removeTier(index)}
            />
          ))}
          {errors?.list ? (
            <Text role="alert" testID="ticket-discount-list-error" fontSize={12} color="$danger">
              {errors.list}
            </Text>
          ) : null}
          <XStack
            testID="ticket-discount-add-tier"
            role="button"
            tabIndex={0}
            aria-label={labels.addTier}
            aria-disabled={addDisabled}
            onPress={addDisabled ? undefined : addTier}
            alignSelf="flex-start"
            alignItems="center"
            gap={4}
            minHeight={44}
            opacity={addDisabled ? 0.5 : 1}
            pressStyle={PRESS_STYLE.row}
          >
            <MaterialIcons name="add" size={18} color={primary} />
            <Text fontSize={13} fontWeight="600" color="$accent">
              {labels.addTier}
            </Text>
          </XStack>
        </YStack>
      ) : null}
    </YStack>
  );
}
