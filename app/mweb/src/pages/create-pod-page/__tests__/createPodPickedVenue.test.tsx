/**
 * "Pick This Venue for Pod" on Venue Details: Create Pod opens as a physical
 * pod at the picked venue, keeps it through a category change, offers it alone
 * on Where & when, and picks the club when there is only one around it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';

import HostCategoryField from '../create-pod/steps/HostCategoryField';
import VenueSlotStep from '../create-pod/steps/VenueSlotStep';
import WhatStep from '../create-pod/steps/WhatStep';
import PickedVenueNote from '../create-pod/PickedVenueNote';
import { useStepperSelections } from '../create-pod/CreatePodStepper/useStepperSelections';
import { blankCreatePodForm, type CreatePodFormValues } from '../create-pod/create-pod.types';
import { hostCategoryKeyOf } from '../create-pod/create-pod.clubs';
import { usePickedVenue } from '../usePickedVenue';
import { createPodSeed } from '../createPodSeed';
import { fallbackT } from '../../../i18n/fallback';

vi.mock('../create-pod/usePodMinAdvance', () => ({ usePodMinAdvance: () => null }));
vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: () => ({ data: undefined, loading: false }),
}));
vi.mock('../create-pod/useOfferQuote', () => ({ useOfferQuote: () => ({ quote: null, quoteMin: null }) }));
vi.mock('../create-pod/price-panel', () => ({ useEarningsPreview: () => ({ ready: false }) }));
vi.mock('../create-pod/steps/VenueOfferPicker', () => ({ default: () => <div data-testid="offer-picker" /> }));
vi.mock('../create-pod/VenueContactCard', () => ({ default: () => <div data-testid="contact-card" /> }));
vi.mock('../create-pod/FreeVenueNote', () => ({ default: () => null }));
vi.mock('../../../components/VenueMapPreview', () => ({ default: () => <div data-testid="map" /> }));

type Form = ReturnType<typeof useForm<CreatePodFormValues>>;
function Harness({ values, children }: Readonly<{ values?: Partial<CreatePodFormValues>; children: (form: Form) => ReactNode }>) {
  const form = useForm<CreatePodFormValues>({ defaultValues: { ...blankCreatePodForm, ...values } });
  return <>{children(form)}</>;
}

const venue = (over: Record<string, unknown> = {}) => ({
  id: 'v1',
  venue_name: 'Court One',
  venue_type: 'Cafe',
  capacity: 40,
  location_id: 'loc1',
  locality: 'Baner',
  offer_min_business: [],
  capacity_items: [],
  ...over,
});
const cities = [{ id: 'loc1', location_name: 'Pune', location_zones: [{ zone_name: 'Baner', pincode: '411045' }] }];
const badminton = { super_category_id: 's1', super_category_name: 'For You', category_id: 'c1', category_name: 'Sports', sub_category_id: 'u1', sub_category_name: 'Badminton' };
const cricket = { ...badminton, sub_category_id: 'u2', sub_category_name: 'Cricket' };

beforeEach(() => vi.clearAllMocks());

describe('usePickedVenue', () => {
  const read = (url: string, isNew = true, categories = [badminton], venues = [venue()]) =>
    renderHook(() => usePickedVenue(venues as never, cities as never, categories as never, isNew), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>,
    }).result.current;

  it('opens a new pod at the picked venue, in its city and area, on Where & when for a one-category host', () => {
    expect(read('/create-pod/d1?pick_venue=v1')).toEqual({
      venueId: 'v1',
      seed: {
        values: { pod_mode: 'PHYSICAL', venue_id: 'v1', location_id: 'loc1', locality: 'Baner', host_category_key: hostCategoryKeyOf(badminton) },
        step: 1,
      },
    });
  });

  it('opens on What when the host still has a category to choose', () => {
    expect(read('/create-pod/d1?pick_venue=v1', true, [badminton, cricket]).seed?.step).toBe(0);
  });

  it('keeps the pick but lays nothing over a resumed draft', () => {
    expect(read('/create-pod/d1?pick_venue=v1', false)).toEqual({ venueId: 'v1', seed: null });
  });

  it('ignores a venue Create Pod does not offer, no pick at all, and a Pod Request', () => {
    expect(read('/create-pod/d1?pick_venue=gone')).toEqual({ seed: null });
    expect(read('/create-pod/d1')).toEqual({ seed: null });
    expect(read('/create-pod/d1?pick_venue=v1&partner_request_id=r1')).toEqual({ seed: null });
  });
});

describe('createPodSeed with a picked venue', () => {
  it('opens a fresh pod on the step the pick names, and a stored draft on its own', () => {
    expect(createPodSeed(null, { venue_id: 'v1' }, 1)).toMatchObject({ values: { venue_id: 'v1' }, step: 1 });
    expect(createPodSeed(null, {}).step).toBe(0);
  });
});

describe('What on the picked venue', () => {
  it('drops the mode choice — the pod is physical', () => {
    render(<Harness values={{ pod_mode: 'PHYSICAL' }}>{(form) => <WhatStep form={form} hostCategories={[badminton] as never} clubs={[]} venueLocked />}</Harness>);
    expect(screen.queryByText(fallbackT('mweb.createPod.modeVirtual'))).not.toBeInTheDocument();
    expect(screen.queryByText(fallbackT('mweb.createPod.podMode'))).not.toBeInTheDocument();
  });

  it('keeps the mode choice for any other pod', () => {
    render(<Harness>{(form) => <WhatStep form={form} hostCategories={[badminton] as never} clubs={[]} />}</Harness>);
    expect(screen.getByText(fallbackT('mweb.createPod.modeVirtual'))).toBeInTheDocument();
  });

  it('keeps the picked venue when the category changes, but still clears the club and slot', async () => {
    const clubs = [{ id: 'k1', club_name: 'k1', location_id: 'loc1', super_category_id: 's1', category_id: 'u2' }];
    render(
      <Harness values={{ location_id: 'loc1', pod_mode: 'PHYSICAL', club_id: 'k0', venue_id: 'v1', venue_slot_id: 's' }}>
        {(form) => (
          <>
            <HostCategoryField form={form} hostCategories={[badminton, cricket] as never} clubs={clubs as never} keepVenue />
            <output data-testid="state">{JSON.stringify([form.watch('club_id'), form.watch('venue_id'), form.watch('venue_slot_id')])}</output>
          </>
        )}
      </Harness>,
    );
    fireEvent.click(screen.getByTestId(`create-pod-category-${hostCategoryKeyOf(cricket)}`));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')).toEqual(['', 'v1', '']));
  });
});

describe('Where & when on the picked venue', () => {
  const step = (venueLocked: boolean) =>
    render(
      <Harness values={{ pod_mode: 'PHYSICAL', location_id: 'loc1', venue_id: 'v9' }}>
        {(form) => (
          <VenueSlotStep
            form={form}
            venues={[venue(), venue({ id: 'v9', venue_name: 'Picked Loft', location_id: 'loc2' })] as never}
            clubVenueIds={new Set(['v1'])}
            venueNotice={{} as never}
            spots={{ min: 1, max: 40, slidable: true }}
            venueLocked={venueLocked}
          />
        )}
      </Harness>,
    );

  it('offers the picked venue alone, whatever the club matches', () => {
    step(true);
    expect(screen.getByTestId('create-pod-venue-v9')).toBeInTheDocument();
    expect(screen.queryByTestId('create-pod-venue-v1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('create-pod-no-venues')).not.toBeInTheDocument();
  });

  it("offers the club's venues for any other pod", () => {
    step(false);
    expect(screen.getByTestId('create-pod-venue-v1')).toBeInTheDocument();
    expect(screen.queryByTestId('create-pod-venue-v9')).not.toBeInTheDocument();
  });

  it('names the picked venue over the step, and nothing for a venue it cannot find', () => {
    const { rerender } = render(<PickedVenueNote venues={[venue()] as never} venueId="v1" />);
    expect(screen.getByTestId('create-pod-picked-venue')).toHaveTextContent('A physical pod at Court One');
    rerender(<PickedVenueNote venues={[venue()] as never} venueId="gone" />);
    expect(screen.queryByTestId('create-pod-picked-venue')).not.toBeInTheDocument();
  });
});

describe('useStepperSelections on the picked venue', () => {
  const club = (id: string) => ({ id, club_name: id, location_id: 'loc1', locality: 'Baner', super_category_id: 's1', category_id: 'u1' });
  const run = (values: Partial<CreatePodFormValues>, clubs: unknown[], pickedVenueId?: string) =>
    renderHook(() => {
      const form = useForm<CreatePodFormValues>({ defaultValues: { ...blankCreatePodForm, ...values } });
      const selections = useStepperSelections(form, {
        clubs: clubs as never,
        hostCategories: [badminton] as never,
        products: [],
        subCategories: [],
        venues: [venue()] as never,
        viewerUserId: 'u1',
        pinnedVenueId: pickedVenueId,
        pickedVenueId,
      });
      return { form, ...selections };
    }).result;
  const onPicked = { pod_mode: 'PHYSICAL' as const, location_id: 'loc1', locality: 'Baner', venue_id: 'v1', host_category_key: hostCategoryKeyOf(badminton) };

  it('locks the venue while the form is on it, and picks the only club around it', async () => {
    const result = run(onPicked, [club('k1')], 'v1');
    expect(result.current.venueLocked).toBe(true);
    await waitFor(() => expect(result.current.form.getValues('club_id')).toBe('k1'));
  });

  it('leaves the club to the host when there is a choice', async () => {
    const result = run(onPicked, [club('k1'), club('k2')], 'v1');
    expect(result.current.venueLocked).toBe(true);
    await waitFor(() => expect(result.current.form.getValues('club_id')).toBe(''));
  });

  it('unlocks once the venue changes, and never picks a club for an ordinary pod', async () => {
    expect(run({ ...onPicked, venue_id: 'v2' }, [club('k1')], 'v1').current.venueLocked).toBe(false);
    const plain = run(onPicked, [club('k1')]);
    expect(plain.current.venueLocked).toBe(false);
    await waitFor(() => expect(plain.current.form.getValues('club_id')).toBe(''));
  });
});
