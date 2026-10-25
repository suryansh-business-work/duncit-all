import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import { AVAILABILITY_BUNDLE, flattenCatalogue } from '@duncit/i18n';
import { VenueOfferAskFields } from '@duncit/forms';
import { makeVenueOfferAskSchema, type VenueOfferAskValues } from '@duncit/forms/schemas';
import { VENUE_OFFER_ASK_LIMITS, offeringsFromText } from '@duncit/utils';
import { defineDemo } from '../../types';

export interface VenueOfferAskMock {
  /** The points as typed, one per line. */
  offerings: string;
  note: string;
}

const AVAILABILITY_TEXT = flattenCatalogue(AVAILABILITY_BUNDLE);

/** The shipped English, with {placeholders} filled — what a surface's t() answers. */
const askT = (key: string, options?: { vars?: Record<string, string | number> }) =>
  Object.entries(options?.vars ?? {}).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    AVAILABILITY_TEXT[key] ?? key,
  );

const schema = makeVenueOfferAskSchema(askT);

/** A real form around the two fields, validating as the host types. */
function VenueOfferAskDemo({ mock }: Readonly<{ mock: VenueOfferAskMock }>) {
  const { control } = useForm<VenueOfferAskValues>({
    values: mock,
    mode: 'all',
    resolver: zodResolver(schema) as unknown as Resolver<VenueOfferAskValues>,
  });
  const typed = useWatch({ control, name: 'offerings' });
  return (
    <Stack spacing={1.5}>
      <VenueOfferAskFields
        control={control}
        offeringsName="offerings"
        noteName="note"
        idPrefix="demo"
        required
        labels={{
          offerings: askT('availability.offers.ask.offeringsLabel'),
          offeringsHint: askT('availability.offers.ask.offeringsHint'),
          note: askT('availability.offers.ask.noteLabel'),
          noteHint: askT('availability.offers.ask.noteHint', { vars: { max: VENUE_OFFER_ASK_LIMITS.note } }),
        }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {JSON.stringify(offeringsFromText(typed))}
      </Typography>
    </Stack>
  );
}

export const venueOfferAskDemo = defineDemo<VenueOfferAskMock>({
  id: 'venue-offer-ask',
  title: "A venue offer's ask — what the host needs from the venue, and a note",
  note:
    'Each line is one point: the leading "- " is dropped and the blank line is skipped, as the array under the fields shows. Clear the points and the field refuses the offer; paste a point over 120 characters and it says so. The note stops at the server\'s 1000 characters. Create Pod on mWeb, the Partners pod form and the resubmit dialog all draw these two fields.',
  mock: { offerings: '- A projector\n\n10 chairs', note: 'We start sharp at 7.' },
  render: (mock) => <VenueOfferAskDemo mock={mock} />,
});
