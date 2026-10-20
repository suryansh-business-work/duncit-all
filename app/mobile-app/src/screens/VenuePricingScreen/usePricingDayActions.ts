import { useMemo } from 'react';
import { toggleDayKey, withDateOverride, withoutDateOverride } from '@duncit/utils';

import {
  PriceRuleType,
  type PriceRuleInput,
  type VenuePricingInput,
} from '@/generated/graphql/graphql';
import { MODE_ENUM, savedRuleInput, savedToInput, type SavedPricing } from '@/forms/venue-pricing';
import type { DayActions } from '@/components/venue-pricing/PricingDaySheet';
import { UpdateVenueSettingsDocument } from '@/graphql/venue-availability';
import { graphqlRequest } from '@/services/graphql.client';

interface Options {
  venueId: string;
  dayKey: string | null;
  pricing: SavedPricing;
  holidays: readonly string[];
  /** Replaces the whole pricing — every write sends all of it. */
  savePricing: (input: VenuePricingInput) => Promise<void>;
  /** Re-reads the venue (its holidays) and the visible month. */
  onChanged: () => void;
}

/**
 * The four things a calendar date can change, each written from the SAVED
 * pricing so nothing else the owner set — slots, other rules, other blocked
 * dates — is lost. Holidays stay where they always lived: the venue settings.
 */
export function usePricingDayActions(options: Options): DayActions {
  const { venueId, dayKey, pricing, holidays, savePricing, onChanged } = options;

  return useMemo(() => {
    const day = dayKey ?? '';
    const rules = pricing.price_rules.map(savedRuleInput);
    const writePricing = async (patch: Parameters<typeof savedToInput>[1]) => {
      await savePricing(savedToInput(pricing, patch));
      onChanged();
    };
    return {
      setOverride: (mode, value) => {
        const override: PriceRuleInput = {
          type: PriceRuleType.DateOverride,
          label: '',
          days: [],
          dates: [day],
          from: null,
          to: null,
          mode: MODE_ENUM[mode],
          value,
        };
        return writePricing({ price_rules: withDateOverride(rules, day, override) });
      },
      clearOverride: () => writePricing({ price_rules: withoutDateOverride(rules, day) }),
      toggleBlock: () => writePricing({ blocked_dates: toggleDayKey(pricing.blocked_dates, day) }),
      toggleHoliday: async () => {
        await graphqlRequest(
          UpdateVenueSettingsDocument,
          { venue_doc_id: venueId, input: { holidays: toggleDayKey(holidays, day) } },
          { auth: true },
        );
        onChanged();
      },
    };
  }, [venueId, dayKey, pricing, holidays, savePricing, onChanged]);
}
