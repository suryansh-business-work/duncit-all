import { useMutation, useQuery } from '@apollo/client/react';
import { UPDATE_VENUE_SETTINGS } from '../queries';
import { UPDATE_VENUE_PRICING, VENUE_PRICING } from './queries';
import type { VenuePricingData, VenuePricingInput } from './types';

/**
 * The venue's saved pricing and its two writes: the pricing save (the form,
 * a date override, a blocked date) and the holiday list, which lives in the
 * venue's existing settings rather than in pricing.
 */
export function usePricingModule(venueId: string) {
  const { data, loading, error, refetch } = useQuery<{ venuePricing: VenuePricingData }>(VENUE_PRICING, {
    variables: { venue_id: venueId },
    fetchPolicy: 'cache-and-network',
  });
  const [savePricing, saveState] = useMutation<{ updateVenuePricing: VenuePricingData }>(UPDATE_VENUE_PRICING);
  const [saveSettings, settingsState] = useMutation(UPDATE_VENUE_SETTINGS);

  const save = async (input: VenuePricingInput) => {
    await savePricing({
      variables: { venue_id: venueId, input },
      // The mutation answers with the whole pricing, so the read is updated in place.
      update(cache, result) {
        const saved = result.data?.updateVenuePricing;
        if (saved) cache.writeQuery({ query: VENUE_PRICING, variables: { venue_id: venueId }, data: { venuePricing: saved } });
      },
    });
  };

  const saveHolidays = async (holidays: string[]) => {
    await saveSettings({ variables: { venue_doc_id: venueId, input: { holidays } } });
  };

  return {
    pricing: data?.venuePricing ?? null,
    loading: loading && !data,
    error,
    refetch,
    save,
    saving: saveState.loading,
    saveHolidays,
    savingHolidays: settingsState.loading,
  };
}
