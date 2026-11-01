import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useEffect, useState, type ReactNode } from 'react';

import HostCategoryField from '../create-pod/steps/HostCategoryField';
import EditPodLocation from '../create-pod/steps/EditPodLocation';
import RequestSlotPicker from '../create-pod/steps/RequestSlotPicker';
import TicketDiscountStepField from '../create-pod/fields/TicketDiscountStepField';
import PlaceChargesField from '../create-pod/fields/PlaceChargesField';
import { blankCreatePodForm, type CreatePodFormValues } from '../create-pod/create-pod.types';
import { hostCategoryKeyOf } from '../create-pod/create-pod.clubs';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  slots: { data: undefined as unknown, loading: false },
  slotsOpts: undefined as unknown,
  locationProps: undefined as undefined | Record<string, any>,
  tierProps: undefined as undefined | Record<string, any>,
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: (_doc: unknown, opts: unknown) => {
    h.slotsOpts = opts;
    return h.slots;
  },
}));
vi.mock('../create-pod/SlotPicker', () => ({
  default: (p: { slots: Array<{ id: string }>; loading: boolean; selectedSlotId: string; error?: string; onPick: (s: unknown) => void }) => (
    <div data-testid="slot-picker" data-loading={String(p.loading)} data-selected={p.selectedSlotId} data-error={p.error ?? ''}>
      {p.slots.map((slot) => (
        <button key={slot.id} data-testid={`slot-${slot.id}`} onClick={() => p.onPick(slot)} />
      ))}
    </div>
  ),
}));
vi.mock('../../../components/app-header/LocationDialog', () => ({
  default: (p: Record<string, any>) => {
    h.locationProps = p;
    return p.open ? (
      <div data-testid="location-dialog" data-city={p.draftLocationId} data-zone={p.draftZone}>
        <button data-testid="loc-apply" onClick={p.onApply} />
        <button data-testid="loc-auto" onClick={() => p.onAutoApply('loc2', 'North')} />
        <button data-testid="loc-close" onClick={p.onClose} />
      </div>
    ) : null;
  },
}));
vi.mock('@duncit/ui', async (orig) => ({
  ...(await orig<object>()),
  TicketDiscountField: (p: Record<string, any>) => {
    h.tierProps = p;
    return <div data-testid="tier-field" data-enabled={String(p.enabled)} data-max-tickets={p.maxTickets} data-price={String(p.unitPrice)} />;
  },
}));
vi.mock('../../../hooks/usePricing', () => ({ usePricing: () => ({ format: (v: number) => `Rs${v}` }) }));
vi.mock('../../../utils/dateFormat', async (orig) => ({ ...(await orig<object>()), useTicketDiscountMaxPct: () => 40 }));

type Form = ReturnType<typeof useForm<CreatePodFormValues>>;
function Harness({
  values,
  errors = {},
  children,
}: Readonly<{ values?: Partial<CreatePodFormValues>; errors?: Record<string, unknown>; children: (form: Form) => ReactNode }>) {
  const form = useForm<CreatePodFormValues>({ defaultValues: { ...blankCreatePodForm, ...values } });
  useEffect(() => {
    for (const [field, error] of Object.entries(errors)) {
      form.setError(field as keyof CreatePodFormValues, error as never);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children(form)}</>;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.slots = { data: undefined, loading: false };
  h.locationProps = undefined;
});

describe('HostCategoryField', () => {
  const forYou = { super_category_id: 's1', super_category_name: 'For You' };
  const pet = { super_category_id: 's2', super_category_name: 'For Your Pet' };
  const badminton = { ...forYou, category_id: 'c1', category_name: 'Sports', sub_category_id: 'u1', sub_category_name: 'Badminton' };
  const cricket = { ...forYou, category_id: 'c1', category_name: 'Sports', sub_category_id: 'u2', sub_category_name: 'Cricket' };
  const music = { ...forYou, category_id: 'c2', category_name: 'Creative', sub_category_id: 'u3', sub_category_name: 'Music' };
  const grooming = { ...pet, category_id: 'c3', category_name: 'Grooming', sub_category_id: 'u4', sub_category_name: 'Dog Grooming' };
  const categories = [badminton, cricket, music, grooming];
  const club = (id: string, row: typeof badminton, location_id: string) => ({
    id,
    club_name: id,
    location_id,
    super_category_id: row.super_category_id,
    category_id: row.sub_category_id,
  });
  // Two badminton clubs and a groomer in the pod's city; the only music club is elsewhere.
  const clubs = [club('b1', badminton, 'loc1'), club('b2', badminton, 'loc1'), club('g1', grooming, 'loc1'), club('m1', music, 'loc2')];
  const chip = (row: typeof badminton) => screen.getByTestId(`create-pod-category-${hostCategoryKeyOf(row)}`);
  const physical = { location_id: 'loc1', pod_mode: 'PHYSICAL' as const };

  it('shows Super, then Category, then the category\'s subs as chips with their icon and club count; picking one resets the club, venue and slot', async () => {
    const icon = 'https://cdn.example.com/badminton.png';
    render(
      <Harness values={{ ...physical, club_id: 'club', venue_id: 'ven', venue_slot_id: 'slot' }}>
        {(form) => (
          <>
            <HostCategoryField form={form} hostCategories={categories} categoryIcons={[{ id: 'u1', icon }]} clubs={clubs} />
            <output data-testid="state">{JSON.stringify([form.watch('host_category_key'), form.watch('club_id'), form.watch('venue_id'), form.watch('venue_slot_id')])}</output>
          </>
        )}
      </Harness>
    );
    // Every level is on screen, even with a single option, and opens on the first of each.
    expect(screen.getByTestId('create-pod-category-super')).toHaveTextContent('For YouFor Your Pet');
    expect(screen.getByTestId('create-pod-category-super-s1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('create-pod-category-group')).toHaveTextContent('SportsCreative');
    expect(screen.getByTestId('create-pod-category-group-c1')).toHaveAttribute('aria-pressed', 'true');
    // Only Sports' subs: Music sits under Creative, Dog Grooming under the pet super.
    expect(screen.getByTestId('create-pod-category-subs')).toHaveTextContent(/Badminton.*Cricket/);
    expect(screen.queryByText('Music')).not.toBeInTheDocument();
    expect(screen.queryByText('Dog Grooming')).not.toBeInTheDocument();

    const tile = chip(badminton);
    expect(tile.querySelector('img')).toHaveAttribute('src', icon);
    expect(tile).toHaveTextContent('Badminton2 clubs');
    // No cricket club in this city: the chip says so and cannot be picked.
    expect(chip(cricket)).toHaveTextContent(fallbackT('mweb.createPod.categoryNoClubs'));
    expect(chip(cricket)).toBeDisabled();

    fireEvent.click(tile);
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')).toEqual([hostCategoryKeyOf(badminton), '', '', '']));
    expect(tile).toHaveAttribute('aria-pressed', 'true');
    expect(chip(cricket)).toHaveAttribute('aria-pressed', 'false');
  });

  it('narrows to the picked Category, and to the picked Super with its first Category', () => {
    render(<Harness values={physical}>{(form) => <HostCategoryField form={form} hostCategories={categories} clubs={clubs} />}</Harness>);
    fireEvent.click(screen.getByTestId('create-pod-category-group-c2'));
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.queryByText('Badminton')).not.toBeInTheDocument();
    // The music club is in another city.
    expect(chip(music)).toBeDisabled();

    fireEvent.click(screen.getByTestId('create-pod-category-super-s2'));
    expect(screen.getByTestId('create-pod-category-group')).toHaveTextContent(/^Grooming$/);
    expect(screen.getByTestId('create-pod-category-group-c3')).toHaveAttribute('aria-pressed', 'true');
    expect(chip(grooming)).toHaveTextContent('Dog Grooming1 club');
    expect(chip(grooming)).toBeEnabled();
  });

  it('counts clubs in every city for a virtual pod', () => {
    render(
      <Harness values={{ location_id: 'loc1', pod_mode: 'VIRTUAL' }}>
        {(form) => <HostCategoryField form={form} hostCategories={categories} clubs={clubs} />}
      </Harness>
    );
    fireEvent.click(screen.getByTestId('create-pod-category-group-c2'));
    expect(chip(music)).toHaveTextContent('Music1 club');
    expect(chip(music)).toBeEnabled();
  });

  it('opens on the Super and Category of the sub already picked', () => {
    render(
      <Harness values={{ ...physical, host_category_key: hostCategoryKeyOf(music) }}>
        {(form) => <HostCategoryField form={form} hostCategories={categories} clubs={clubs} />}
      </Harness>
    );
    expect(screen.getByTestId('create-pod-category-group-c2')).toHaveAttribute('aria-pressed', 'true');
    expect(chip(music)).toHaveAttribute('aria-pressed', 'true');
  });

  it('says the host has no granted categories, and shows the validation message', async () => {
    render(
      <Harness errors={{ host_category_key: { type: 'manual', message: 'Pick a category' } }}>
        {(form) => <HostCategoryField form={form} hostCategories={[]} clubs={clubs} />}
      </Harness>
    );
    expect(screen.getByTestId('create-pod-category-empty')).toHaveTextContent(fallbackT('mweb.createPod.categoryEmpty'));
    expect(screen.queryByTestId('create-pod-category-super')).not.toBeInTheDocument();
    expect(await screen.findByText('Pick a category')).toBeInTheDocument();
  });
});

describe('EditPodLocation', () => {
  const locations = [{ id: 'loc1' }, { id: 'loc2' }] as never;
  const mount = (values: Partial<CreatePodFormValues>, onMoved = vi.fn()) => {
    render(
      <Harness values={values}>
        {(form) => (
          <>
            <EditPodLocation form={form} locations={locations} onMoved={onMoved} />
            <output data-testid="state">{JSON.stringify([form.watch('location_id'), form.watch('locality'), form.watch('club_id')])}</output>
          </>
        )}
      </Harness>
    );
    return onMoved;
  };

  it('opens the picker on this pod city and area, and applies the pick to the pod, saying a club was cleared', async () => {
    const onMoved = mount({ location_id: 'loc1', locality: 'East', club_id: 'club' });
    fireEvent.click(screen.getByTestId('create-pod-edit-location'));
    expect(screen.getByTestId('location-dialog')).toHaveAttribute('data-city', 'loc1');
    expect(screen.getByTestId('location-dialog')).toHaveAttribute('data-zone', 'East');
    act(() => {
      h.locationProps?.setDraftLocationId('loc2');
      h.locationProps?.setDraftZone('West');
    });
    fireEvent.click(screen.getByTestId('loc-apply'));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')).toEqual(['loc2', 'West', '']));
    expect(onMoved).toHaveBeenCalledWith(true);
    await waitFor(() => expect(screen.queryByTestId('location-dialog')).not.toBeInTheDocument());
  });

  it('applies an automatic pick, and closes without changing anything', async () => {
    const onMoved = mount({ location_id: 'loc1', locality: 'East' });
    fireEvent.click(screen.getByTestId('create-pod-edit-location'));
    fireEvent.click(screen.getByTestId('loc-auto'));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]').slice(0, 2)).toEqual(['loc2', 'North']));
    expect(onMoved).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByTestId('create-pod-edit-location'));
    fireEvent.click(screen.getByTestId('loc-close'));
    await waitFor(() => expect(screen.queryByTestId('location-dialog')).not.toBeInTheDocument());
    expect(onMoved).toHaveBeenCalledTimes(1);
  });
});

describe('RequestSlotPicker', () => {
  const space = { slotSpaceLabel: 'Court A', label: 'Court A' } as never;
  const mount = (values: Partial<CreatePodFormValues> = {}, errors: Record<string, unknown> = {}) =>
    render(
      <Harness values={{ venue_id: 'v1', ...values }} errors={errors}>
        {(form) => (
          <>
            <RequestSlotPicker form={form} space={space} />
            <output data-testid="state">{JSON.stringify([form.watch('venue_slot_id'), form.watch('pod_date_time'), form.watch('pod_end_date_time')])}</output>
          </>
        )}
      </Harness>
    );

  it('lists only the slots of this space, asks with the request id, and fills the pod window from the pick', async () => {
    h.slots = {
      data: {
        venueAvailableSlots: [
          { id: 's1', space_label: 'Court A', start_at: '2030-01-01T10:00:00.000Z', end_at: '2030-01-01T12:00:00.000Z' },
          { id: 's2', space_label: 'Court B', start_at: '2030-01-01T10:00:00.000Z', end_at: '2030-01-01T12:00:00.000Z' },
          { id: 's3', space_label: null, start_at: '2030-01-01T10:00:00.000Z', end_at: '2030-01-01T12:00:00.000Z' },
        ],
      },
      loading: false,
    };
    mount({ partner_request_id: 'req1' });
    expect((h.slotsOpts as { variables: object }).variables).toEqual({ venue_id: 'v1', partner_request_id: 'req1' });
    expect(screen.getByTestId('slot-s1')).toBeInTheDocument();
    expect(screen.queryByTestId('slot-s2')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('slot-s1'));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')).toEqual(['s1', '2030-01-01T10:00:00.000Z', '2030-01-01T12:00:00.000Z']));
  });

  it('lists a slot with no space label under the whole-venue space', () => {
    h.slots = { data: { venueAvailableSlots: [{ id: 's3', space_label: null, start_at: 'a', end_at: 'b' }] }, loading: false };
    render(
      <Harness values={{ venue_id: 'v1' }}>
        {(form) => <RequestSlotPicker form={form} space={{ slotSpaceLabel: '', label: 'Whole venue' } as never} />}
      </Harness>
    );
    expect(screen.getByTestId('slot-s3')).toBeInTheDocument();
  });

  it('sends no request id when the pod is not from a request, shows loading only before the first answer, and passes the slot error', async () => {
    h.slots = { data: undefined, loading: true };
    mount({}, { venue_slot_id: { type: 'manual', message: 'Pick a slot' } });
    expect((h.slotsOpts as { variables: { partner_request_id: string | null } }).variables.partner_request_id).toBeNull();
    expect(screen.getByTestId('slot-picker')).toHaveAttribute('data-loading', 'true');
    await waitFor(() => expect(screen.getByTestId('slot-picker')).toHaveAttribute('data-error', 'Pick a slot'));
  });

  it('is not loading while a refresh runs behind an answer, and treats no answer as no slots', () => {
    h.slots = { data: { venueAvailableSlots: [] }, loading: true };
    mount();
    expect(screen.getByTestId('slot-picker')).toHaveAttribute('data-loading', 'false');
  });

  it('copes with a missing slot list', () => {
    h.slots = { data: {}, loading: false };
    mount();
    expect(screen.queryByTestId(/^slot-s/)).not.toBeInTheDocument();
  });
});

describe('TicketDiscountStepField', () => {
  const mount = (values: Partial<CreatePodFormValues> = {}, errors: Record<string, unknown> = {}) =>
    render(
      <Harness values={values} errors={errors}>
        {(form) => (
          <>
            <TicketDiscountStepField form={form} />
            <output data-testid="state">{JSON.stringify([form.watch('ticket_discount_enabled'), form.watch('ticket_discount_tiers')])}</output>
          </>
        )}
      </Harness>
    );

  it('binds the editor to the form with the price and the most tickets the pod allows', async () => {
    mount({ pod_amount: 200, no_of_spots: 10, ticket_discount_enabled: true, ticket_discount_tiers: [{ min_tickets: 2, discount_pct: 10 }] });
    expect(screen.getByTestId('tier-field')).toHaveAttribute('data-enabled', 'true');
    expect(screen.getByTestId('tier-field')).toHaveAttribute('data-price', '200');
    expect(h.tierProps?.maxPct).toBe(40);
    expect(h.tierProps?.formatPrice(5)).toBe('Rs5');
    await act(async () => {
      h.tierProps?.onEnabledChange(false);
    });
    await act(async () => {
      h.tierProps?.onTiersChange([{ min_tickets: 3, discount_pct: 15 }]);
    });
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')).toEqual([false, [{ min_tickets: 3, discount_pct: 15 }]]));
  });

  it('passes no price when the ticket is free or not priced yet', () => {
    mount({ pod_amount: null });
    expect(screen.getByTestId('tier-field')).toHaveAttribute('data-price', 'undefined');
  });

  it('keeps a shown error in step with the host edits by re-validating on change', async () => {
    mount({ ticket_discount_enabled: true, ticket_discount_tiers: [] }, { ticket_discount_tiers: { type: 'manual', message: 'Add a tier' } });
    await waitFor(() => expect(h.tierProps?.errors?.list).toBe('Add a tier'));
    await act(async () => {
      h.tierProps?.onTiersChange([{ min_tickets: 2, discount_pct: 10 }]);
    });
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent ?? '[]')[1]).toEqual([{ min_tickets: 2, discount_pct: 10 }]));
  });
});

describe('PlaceChargesField edits', () => {
  it('edits only the chosen row and keeps stable rows after removing one', () => {
    function Stateful() {
      const [rows, setRows] = useState([
        { label: 'Entry', amount: 10, note: '' },
        { label: 'Table', amount: 20, note: '' },
      ]);
      return (
        <>
          <PlaceChargesField value={rows} onChange={setRows} helperText="Paid at the venue" />
          <output data-testid="rows">{JSON.stringify(rows)}</output>
        </>
      );
    }
    render(<Stateful />);
    expect(screen.getByText('Paid at the venue')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('charge-label-1-input'), { target: { value: 'Seat' } });
    fireEvent.change(screen.getByTestId('charge-amount-1-input'), { target: { value: '25' } });
    fireEvent.change(screen.getByTestId('charge-note-0-input'), { target: { value: 'Per head' } });
    expect(JSON.parse(screen.getByTestId('rows').textContent ?? '[]')).toEqual([
      { label: 'Entry', amount: 10, note: 'Per head' },
      { label: 'Seat', amount: 25, note: '' },
    ]);
    fireEvent.change(screen.getByTestId('charge-amount-0-input'), { target: { value: 'abc' } });
    expect(JSON.parse(screen.getByTestId('rows').textContent ?? '[]')[0].amount).toBe(0);
    fireEvent.click(screen.getByTestId('charge-remove-0'));
    expect(JSON.parse(screen.getByTestId('rows').textContent ?? '[]')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('charge-add'));
    expect(JSON.parse(screen.getByTestId('rows').textContent ?? '[]')).toHaveLength(2);
  });
});
