import '@testing-library/jest-dom/vitest';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { describe, expect, it } from 'vitest';
import { TicketPriceField, type EarningsPreview } from '../price-panel';
import { TICKET_PRICE_REQUIRED } from '../price-panel/pricingCopy';
import { createPodSchema } from '../create-pod.form';
import { blankCreatePodForm, type CreatePodFormValues } from '../create-pod.types';

const preview = {
  slotPrice: null,
  podAmount: 0,
  noOfSpots: 0,
  venueId: null,
  isPhysical: false,
  isFree: false,
  projection: undefined,
  loading: false,
  stale: false,
  hasVenue: false,
  ready: false,
  priceMissing: true,
  zeroEarnings: false,
  venueShortfall: false,
  blocked: true,
} satisfies EarningsPreview;

// Step 4 is only reachable with steps 1-3 already filled, so the harness starts
// from a pod that is valid apart from its (blank) price.
const pricedStep4: CreatePodFormValues = {
  ...blankCreatePodForm,
  location_id: 'loc-1',
  pod_title: 'Sunday community hike',
  club_id: 'club-1',
  pod_mode: 'VIRTUAL',
  meeting_url: 'https://meet.duncit.com/x',
  pod_description: 'A relaxed group hike around the lake.',
  pod_date_time: new Date(Date.now() + 24 * 3_600_000),
  media_text: 'https://cdn/img.jpg',
  what_this_pod_offers: ['Guided trail'],
  agreed_to_terms: true,
};

/** The real field on the real schema, so the blank default and the "user input
 * only" rule are exercised exactly as Step 4 renders them. */
function Harness({ onValue }: Readonly<{ onValue: (value: number | null) => void }>) {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    resolver: zodResolver(createPodSchema),
    defaultValues: pricedStep4,
    mode: 'onTouched',
  });
  onValue(form.watch('pod_amount'));
  return <TicketPriceField form={form} preview={preview} isFree={false} />;
}

function renderField() {
  const seen: (number | null)[] = [];
  render(
    <MockedProvider mocks={[]}>
      <Harness onValue={(value) => seen.push(value)} />
    </MockedProvider>,
  );
  return { seen, input: screen.getByLabelText<HTMLInputElement>(/Ticket price/) };
}

describe('TicketPriceField', () => {
  it('starts blank so ₹0 is never entered on the host behalf', () => {
    const { seen, input } = renderField();
    expect(input).toHaveValue(null);
    expect(seen.at(-1)).toBeNull();
  });

  it('holds only what the host typed, and goes back to blank when cleared', async () => {
    const { seen, input } = renderField();
    fireEvent.change(input, { target: { value: '499' } });
    await waitFor(() => expect(seen.at(-1)).toBe(499));

    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() => expect(seen.at(-1)).toBeNull());
  });

  it('asks for a price once the host leaves the field blank', async () => {
    const { input } = renderField();
    fireEvent.blur(input);
    expect(await screen.findByText(TICKET_PRICE_REQUIRED)).toBeInTheDocument();
  });
});
