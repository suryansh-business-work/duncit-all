import { useState } from 'react';
import { toBookingOffersInput, type BookingOffersValues } from '@duncit/forms/schemas';
import { logs } from '@duncit/logs';

import { BookingOffersForm } from '@/forms/venue-settings';
import { UpdateVenueSettingsDocument } from '@/graphql/venue-availability';
import type { SettingsVenue } from '@/hooks/useVenuesWithSettings';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  venue: SettingsVenue;
  /** Re-reads the venue after a save — what is in effect may have moved. */
  onSaved: () => void;
}

/**
 * Venue settings > Booking offers, for the venue the switcher picked: saves
 * `VenueSettingsInput.offers` on its own, beside the cancellation policy, then
 * re-reads the venue. mWeb twin: venue-settings-page/BookingOffersCard.
 */
export function BookingOffersCard({ venue, onSaved }: Readonly<Props>) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (values: BookingOffersValues) => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await graphqlRequest(
        UpdateVenueSettingsDocument,
        { venue_doc_id: venue.id, input: { offers: toBookingOffersInput(values) } },
        { auth: true },
      );
      setSaved(true);
      onSaved();
    } catch (e) {
      logs.mobileApp.warn('venueSettings', 'saveOffers', { error: e, venue_id: venue.id });
      setError(toErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BookingOffersForm
      stored={venue.settings?.offers ?? null}
      effective={{
        min_guests: venue.offer_min_guests,
        response_hours: venue.offer_response_hours,
      }}
      saving={saving}
      saved={saved}
      error={error}
      onSubmit={(values) => fireAndForget(save(values))}
    />
  );
}
