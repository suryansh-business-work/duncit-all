import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';

import { useStepperSelections } from '../create-pod/CreatePodStepper/useStepperSelections';
import { useStepperFormSync } from '../create-pod/CreatePodStepper/useStepperFormSync';
import { blankCreatePodForm, type CreatePodFormValues } from '../create-pod/create-pod.types';

const h = vi.hoisted(() => ({
  slots: { data: undefined as unknown },
  slotsOpts: undefined as undefined | { skip: boolean; variables: unknown },
  offer: { quote: null as unknown, quoteMin: null as unknown },
  previewArgs: undefined as undefined | Record<string, any>,
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: (_doc: unknown, opts: typeof h.slotsOpts) => {
    h.slotsOpts = opts;
    return h.slots;
  },
}));
vi.mock('../create-pod/useOfferQuote', () => ({ useOfferQuote: () => h.offer }));
vi.mock('../create-pod/price-panel', () => ({
  useEarningsPreview: (args: Record<string, any>) => {
    h.previewArgs = args;
    return { ready: false };
  },
}));

const run = (
  values: Partial<CreatePodFormValues>,
  sources: Partial<Parameters<typeof useStepperSelections>[1]> = {}
) =>
  renderHook(() => {
    const form = useForm<CreatePodFormValues>({ defaultValues: { ...blankCreatePodForm, ...values } });
    const selections = useStepperSelections(form, {
      clubs: [],
      hostCategories: [],
      products: [],
      subCategories: [],
      venues: [],
      viewerUserId: 'u1',
      ...sources,
    });
    return { form, ...selections };
  });

const venue = (over: Record<string, unknown> = {}) => ({ id: 'v1', venue_name: 'Court', capacity: 40, owner_user_id: 'owner', ...over });
const quote = (pax: number) => ({ pax, total: 1000, venue_payout: 800, platform_fee: 100 });

beforeEach(() => {
  h.slots = { data: undefined };
  h.offer = { quote: null, quoteMin: null };
  h.previewArgs = undefined;
});

describe('club venues and spots', () => {
  it('scopes venues to the selected club, plus the venue a pod request pinned', () => {
    const clubs = [{ id: 'c1', category_id: 'sub1', matched_venues: [{ id: 'vA' }, { id: 'vB' }] }] as never;
    expect([...run({ club_id: 'c1' }, { clubs }).result.current.clubVenueIds]).toEqual(['vA', 'vB']);
    expect([...run({ club_id: 'c1' }, { clubs, pinnedVenueId: 'vP' }).result.current.clubVenueIds]).toEqual(['vA', 'vB', 'vP']);
    expect([...run({ club_id: 'c1' }, { pinnedVenueId: 'vP' }).result.current.clubVenueIds]).toEqual(['vP']);
    expect([...run({ club_id: '' }).result.current.clubVenueIds]).toEqual([]);
  });

  it('takes the minimum guests from the sub-category of the club, and none when the club has no match', () => {
    const clubs = [{ id: 'c1', category_id: 'sub1' }] as never;
    const subCategories = [{ id: 'sub1', min_pax: 6 }, { id: 'sub2', min_pax: 2 }] as never;
    expect(run({ club_id: 'c1', pod_mode: 'VIRTUAL' }, { clubs, subCategories }).result.current.spots.min).toBe(6);
    expect(run({ club_id: 'c1', pod_mode: 'VIRTUAL' }, { clubs }).result.current.spots.min).toBeLessThan(6);
    expect(run({ club_id: 'none', pod_mode: 'VIRTUAL' }, { clubs, subCategories }).result.current.spots.min).toBeLessThan(6);
  });

  it('pulls a physical pod spots back into the range of the space it booked', async () => {
    const { result } = run(
      { pod_mode: 'PHYSICAL', venue_id: 'v1', venue_space_label: 'Whole venue', no_of_spots: 90 },
      { venues: [venue({ capacity: 40 })] as never }
    );
    await waitFor(() => expect(result.current.form.getValues('no_of_spots')).toBeLessThanOrEqual(40));
  });

  it('leaves the spots of a virtual pod, or one not yet sized, alone', async () => {
    const virtual = run({ pod_mode: 'VIRTUAL', no_of_spots: 90 }, { venues: [venue()] as never });
    await act(async () => undefined);
    expect(virtual.result.current.form.getValues('no_of_spots')).toBe(90);
    const unsized = run({ pod_mode: 'PHYSICAL', venue_id: 'v1', no_of_spots: 0 }, { venues: [venue()] as never });
    await act(async () => undefined);
    expect(unsized.result.current.form.getValues('no_of_spots')).toBe(0);
  });
});

describe('what the venue costs', () => {
  it('uses the held slot price and capacity for a pod request, with no offer minimum', () => {
    h.slots = { data: { venueAvailableSlots: [{ id: 's1', price: 700, capacity: 12 }, { id: 's2', price: 900, capacity: 20 }] } };
    const { result } = run(
      { pod_mode: 'PHYSICAL', venue_id: 'v1', venue_slot_id: 's1', partner_request_id: 'req', no_of_spots: 10 },
      { venues: [venue()] as never }
    );
    expect(h.slotsOpts?.skip).toBe(false);
    expect(h.slotsOpts?.variables).toEqual({ venue_id: 'v1', partner_request_id: 'req' });
    expect(h.previewArgs).toMatchObject({ slotPrice: 700, venueId: 'v1', isPhysical: true });
    expect(result.current.offerMinGuests).toBe(0);
  });

  it('prices a held slot as unknown until its row arrives, and asks for no request id without one', () => {
    h.slots = { data: undefined };
    run({ pod_mode: 'PHYSICAL', venue_id: 'v1', venue_slot_id: 's1', no_of_spots: 10 }, { venues: [venue()] as never });
    expect(h.previewArgs?.slotPrice).toBeNull();
    expect((h.slotsOpts?.variables as { partner_request_id: string | null }).partner_request_id).toBeNull();
  });

  it('skips the slot read for a virtual pod, a pod with no venue, or an offer with no held slot', () => {
    run({ pod_mode: 'VIRTUAL', venue_id: 'v1', venue_slot_id: 's1' });
    expect(h.slotsOpts?.skip).toBe(true);
    run({ pod_mode: 'PHYSICAL', venue_id: '', venue_slot_id: 's1' });
    expect(h.slotsOpts?.skip).toBe(true);
    run({ pod_mode: 'PHYSICAL', venue_id: 'v1', venue_slot_id: '' });
    expect(h.slotsOpts?.skip).toBe(true);
  });

  it('prices an offer by the server quote and passes its money at both ends of the guests to the earnings preview', () => {
    h.offer = { quote: quote(20), quoteMin: quote(8) };
    const { result } = run(
      { pod_mode: 'PHYSICAL', venue_id: 'v1', venue_space_label: '', no_of_spots: 20 },
      { venues: [venue({ offer_min_guests: 8 })] as never }
    );
    expect(h.previewArgs?.slotPrice).toBe(1000);
    expect(h.previewArgs?.offerEarnings).not.toBeNull();
    expect(result.current.offerMinGuests).toBeGreaterThan(0);
  });

  it('prices an offer with no minimum quote at the quote itself, and has no earnings money before a quote arrives', () => {
    h.offer = { quote: quote(20), quoteMin: null };
    run({ pod_mode: 'PHYSICAL', venue_id: 'v1', no_of_spots: 20 }, { venues: [venue()] as never });
    expect(h.previewArgs?.offerEarnings).not.toBeNull();
    h.offer = { quote: null, quoteMin: null };
    run({ pod_mode: 'PHYSICAL', venue_id: 'v1', no_of_spots: 20 }, { venues: [venue()] as never });
    expect(h.previewArgs?.offerEarnings).toBeNull();
    expect(h.previewArgs?.slotPrice).toBeNull();
  });

  it('reports no venue cost for a virtual pod', () => {
    h.offer = { quote: quote(20), quoteMin: null };
    const { result } = run({ pod_mode: 'VIRTUAL', venue_id: 'v1', pod_type: 'FREE' }, { venues: [venue()] as never });
    expect(result.current.venueNotice).toBeDefined();
    expect(h.previewArgs?.isPhysical).toBe(false);
    expect(h.previewArgs?.isFree).toBe(true);
  });

  it('tells a free pod host about a priced slot that is not their own venue', () => {
    h.slots = { data: { venueAvailableSlots: [{ id: 's1', price: 700, capacity: 12 }] } };
    const priced = run({ pod_type: 'FREE', pod_mode: 'PHYSICAL', venue_id: 'v1', venue_slot_id: 's1' }, { venues: [venue({ owner_user_id: 'owner' })] as never, viewerUserId: 'u1' });
    const own = run({ pod_type: 'FREE', pod_mode: 'PHYSICAL', venue_id: 'v1', venue_slot_id: 's1' }, { venues: [venue({ owner_user_id: 'u1' })] as never, viewerUserId: 'u1' });
    expect(priced.result.current.venueNotice).not.toEqual(own.result.current.venueNotice);
  });
});

describe('product rows follow the club', () => {
  it('drops a product row the new club no longer offers, and keeps rows it still offers', async () => {
    const products = [{ id: 'p1', category_id: 'cat1' }] as never;
    const rows = [{ product_id: 'gone', quantity: 1 }];
    const { result } = run({ product_requests: rows as never, club_id: '' }, { products });
    await waitFor(() => expect(result.current.form.getValues('product_requests')).toEqual([]));
  });

  it('leaves the rows untouched when every one is still on offer', async () => {
    const { result } = run({ product_requests: [] as never }, { products: [] });
    await act(async () => undefined);
    expect(result.current.form.getValues('product_requests')).toEqual([]);
    expect(result.current.form.formState.dirtyFields.product_requests).toBeUndefined();
  });
});

describe('useStepperFormSync', () => {
  const sync = (values: Partial<CreatePodFormValues>, showProducts: boolean, hostCategories: never[] = []) =>
    renderHook(() => {
      const form = useForm<CreatePodFormValues>({ defaultValues: { ...blankCreatePodForm, ...values } });
      useStepperFormSync(form, showProducts, hostCategories);
      return form;
    });

  it('drops stale product values when products are off, but leaves a clean form alone', async () => {
    const stale = sync({ products_enabled: true, product_requests: [{ product_id: 'p1', quantity: 1 }] as never }, false);
    await waitFor(() => expect(stale.result.current.getValues('products_enabled')).toBe(false));
    expect(stale.result.current.getValues('product_requests')).toEqual([]);
    const clean = sync({}, false);
    await act(async () => undefined);
    expect(clean.result.current.getValues('products_enabled')).toBe(false);
  });

  it('keeps product values when products are on', async () => {
    const on = sync({ products_enabled: true, product_requests: [{ product_id: 'p1', quantity: 1 }] as never }, true);
    await act(async () => undefined);
    expect(on.result.current.getValues('products_enabled')).toBe(true);
    expect(on.result.current.getValues('product_requests')).toHaveLength(1);
  });

  it('auto-selects the only host category, but never over a choice already made or among several', async () => {
    const cat = { super_category_id: 's1', category_id: 'c1', sub_category_id: 'u1', super_category_name: 'S', category_name: 'C', sub_category_name: 'U' } as never;
    const sole = sync({ host_category_key: '' }, true, [cat]);
    await waitFor(() => expect(sole.result.current.getValues('host_category_key')).not.toBe(''));
    const chosen = sync({ host_category_key: 'mine' }, true, [cat]);
    await act(async () => undefined);
    expect(chosen.result.current.getValues('host_category_key')).toBe('mine');
    const several = sync({ host_category_key: '' }, true, [cat, cat]);
    await act(async () => undefined);
    expect(several.result.current.getValues('host_category_key')).toBe('');
  });
});
