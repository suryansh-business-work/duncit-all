import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { VENUE_OFFER_ASK_LIMITS, venueOfferInput } from '@duncit/utils';
import VenueOfferAskFields from '../src/VenueOfferAskFields';
import { makeVenueOfferAskSchema, venueOfferAskDefaults, type VenueOfferAskValues } from '../src/schemas';

/** Messages resolve as `t:<key>`, so the assertions name WHICH rule fired. */
const t = (key: string) => `t:${key}`;
const schema = makeVenueOfferAskSchema(t);

const labels = {
  offerings: 'What you need from the venue',
  offeringsHint: 'offerings-hint',
  note: 'Request from the venue',
  noteHint: 'note-hint',
};

let submitted: VenueOfferAskValues | null = null;

function Harness({ required, disabled }: Readonly<{ required?: boolean; disabled?: boolean }>) {
  const { control, handleSubmit } = useForm<VenueOfferAskValues>({
    defaultValues: venueOfferAskDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<VenueOfferAskValues>,
  });
  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        submitted = values;
      })}
    >
      <VenueOfferAskFields
        control={control}
        offeringsName="offerings"
        noteName="note"
        labels={labels}
        idPrefix="create"
        required={required}
        disabled={disabled}
      />
      <button type="submit">submit</button>
    </form>
  );
}

const offeringsBox = () => screen.getByRole('textbox', { name: /What you need from the venue/ });
const noteBox = () => screen.getByRole('textbox', { name: /Request from the venue/ });

describe('VenueOfferAskFields', () => {
  it('draws the points and the note with what each one is for', () => {
    render(<Harness />);
    expect(screen.getByTestId('create-offer-ask')).toBeInTheDocument();
    expect(screen.getByTestId('create-offer-offerings')).toBeInTheDocument();
    expect(screen.getByTestId('create-offer-note')).toBeInTheDocument();
    expect(screen.getByText('offerings-hint')).toBeInTheDocument();
    expect(screen.getByText('note-hint')).toBeInTheDocument();
    // Optional unless the surface says otherwise.
    expect(offeringsBox()).not.toBeRequired();
    expect(offeringsBox()).toBeEnabled();
  });

  it('marks the points as required when the offer needs them', () => {
    render(<Harness required />);
    expect(offeringsBox()).toBeRequired();
    // The note never is.
    expect(noteBox()).not.toBeRequired();
  });

  it('holds the note to the server bound as it is typed', () => {
    render(<Harness />);
    expect(noteBox()).toHaveAttribute('maxLength', String(VENUE_OFFER_ASK_LIMITS.note));
  });

  it('can be shown read-only while a write is in flight', () => {
    render(<Harness disabled />);
    expect(offeringsBox()).toBeDisabled();
    expect(noteBox()).toBeDisabled();
  });

  it('refuses an empty list of points and says so under the field, in place of the hint', async () => {
    submitted = null;
    render(<Harness required />);
    await userEvent.click(screen.getByRole('button', { name: 'submit' }));
    expect(await screen.findByText('t:availability.offers.validation.offeringsRequired')).toBeInTheDocument();
    expect(screen.queryByText('offerings-hint')).not.toBeInTheDocument();
    expect(submitted).toBeNull();
  });

  it('refuses a point longer than the server keeps', async () => {
    submitted = null;
    render(<Harness required />);
    await userEvent.click(offeringsBox());
    await userEvent.paste('x'.repeat(VENUE_OFFER_ASK_LIMITS.offeringLength + 1));
    await userEvent.click(screen.getByRole('button', { name: 'submit' }));
    expect(await screen.findByText('t:availability.offers.validation.offeringTooLong')).toBeInTheDocument();
    expect(submitted).toBeNull();
  });

  it('sends one point per typed line and the note, which the offer input carries as typed', async () => {
    submitted = null;
    render(<Harness required />);
    await userEvent.type(offeringsBox(), '- A projector{enter}{enter}10 chairs');
    await userEvent.type(noteBox(), '  We start sharp at 7  ');
    await userEvent.click(screen.getByRole('button', { name: 'submit' }));
    await waitFor(() => expect(submitted).not.toBeNull());

    const offer = venueOfferInput({
      start: '2030-06-01T10:00:00.000Z',
      end: '2030-06-01T12:00:00.000Z',
      pax: 12,
      pets: false,
      spaceLabel: '',
      model: 'PER_GUEST',
      rate: '300',
      offerings: submitted?.offerings,
      note: submitted?.note,
    });
    // A leading bullet and the blank line are dropped; the note is trimmed.
    expect(offer?.offerings).toEqual(['A projector', '10 chairs']);
    expect(offer?.note).toBe('We start sharp at 7');
  });
});
