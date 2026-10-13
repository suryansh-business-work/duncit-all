import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { Observable } from '@apollo/client/utilities';
import { ApolloProvider } from '@apollo/client/react';
import { MemoryRouter } from 'react-router';
import { useRegisterVenueForm, type EditableSectionKey } from './useRegisterVenueForm';
import type { RegisterVenueMode } from './register-venue.types';

afterEach(cleanup);

const account = { name: 'Owner Name', email: 'owner@example.com' };

/** A stored venue whose values satisfy every section of the schema. */
const savedVenue = {
  id: 'venue-1',
  venue_name: 'Cafe Mocha',
  description: 'A cosy corner cafe',
  cover_image_url: 'https://cdn.example.com/cover.jpg',
  venue_category: { super_category_id: 'super-1', category_id: 'cat-1', sub_category_id: 'sub-1' },
  address_line1: '12 Main Street',
  address_line2: '',
  location_id: 'loc-1',
  country: 'India',
  country_code: 'IN',
  state: 'Karnataka',
  state_code: 'KA',
  city: 'Bengaluru',
  locality: 'Indiranagar',
  postal_code: '560038',
  venue_type: 'Cafe',
  capacity_items: [{ label: 'Main hall', capacity: 30 }],
  documents: [{ type: 'PAN Card', url: 'https://cdn.example.com/pan.pdf' }],
  gstin: '22ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  has_gstin: true,
  has_pan: true,
  owner_name: 'Owner Name',
  owner_phone: '+919876543210',
  owner_dob: '1990-05-10T00:00:00.000Z',
  owner_address: '12 Main Street',
  bank_account: {
    payout_method: 'UPI',
    account_holder_name: 'Owner Name',
    account_number: '',
    ifsc_code: '',
    upi_id: 'owner@okaxis',
  },
};

/** What step 3 sends for the stored UPI payout. */
const upiBankAccount = {
  payout_method: 'UPI',
  account_holder_name: 'Owner Name',
  account_number: '',
  ifsc_code: '',
  upi_id: 'owner@okaxis',
};

/** Same venue before its first save — no id, so the hook must create one. */
const draftVenue = { ...savedVenue, id: undefined };

/** A venue that serves food, with one dish the server already knows. */
const dosa = {
  id: 'dish-1',
  name: 'Masala dosa',
  description: 'Crisp, with potato',
  category: 'Mains',
  price: 120,
  images: [],
  diet: 'VEG',
  spice_level: 'MILD',
  is_available: true,
};
const foodVenue = {
  ...savedVenue,
  offers_food: true,
  food_menu: [dosa],
  food_ordering: { enabled: false, razorpay_integration_id: null, discount_pct: 0 },
};
/** What the form sends for that menu: the dish keeps its id. */
const dosaInput = { ...dosa };
/** A dish with no name — the one thing the food section refuses. */
const namelessDish = { ...dosa, id: undefined, name: '' };

const RESULTS: Record<string, Record<string, unknown>> = {
  V1: { submitVenueStep1: { __typename: 'Venue', id: 'venue-1', step_completed: 1, status: 'DRAFT' } },
  V2: { submitVenueStep2: { __typename: 'Venue', id: 'venue-1', step_completed: 2 } },
  V3: { submitVenueStep3: { __typename: 'Venue', id: 'venue-1', step_completed: 3 } },
  VFinal: { submitVenueFinal: { __typename: 'Venue', id: 'venue-9', status: 'SUBMITTED' } },
  UpdateApprovedVenue: {
    updateApprovedVenue: {
      __typename: 'Venue',
      id: 'venue-1',
      status: 'APPROVED',
      updated_at: '2026-07-01T00:00:00.000Z',
    },
  },
};

interface Sent {
  name: string;
  variables: Record<string, any>;
}

const makeClient = (sent: Sent[], failOn?: string) =>
  new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink((operation) => {
      // Every document in this suite is a named operation; v4 types the field
      // optional because an anonymous one is legal GraphQL.
      const name = operation.operationName as string;
      sent.push({ name, variables: operation.variables });
      return new Observable((observer) => {
        if (name === failOn) {
          observer.error(new Error('Venue name already taken'));
          return;
        }
        observer.next({ data: RESULTS[name] });
        observer.complete();
      });
    }),
  });

type Api = ReturnType<typeof useRegisterVenueForm>;

interface HarnessProps {
  venue: any;
  mode: RegisterVenueMode;
  categoryLimit?: number;
  onPersisted: () => Promise<unknown>;
  apiRef: { current: Api | null };
}

const noLocations: any[] = [];

function Harness({ venue, mode, categoryLimit, onPersisted, apiRef }: Readonly<HarnessProps>) {
  apiRef.current = useRegisterVenueForm({ venue, locations: noLocations, account, mode, categoryLimit, onPersisted });
  return null;
}

interface MountOptions {
  venue?: any;
  mode?: RegisterVenueMode;
  categoryLimit?: number;
  failOn?: string;
}

const mount = ({ venue = null, mode = 'register', categoryLimit, failOn }: MountOptions = {}) => {
  const apiRef: { current: Api | null } = { current: null };
  const sent: Sent[] = [];
  const onPersisted = vi.fn().mockResolvedValue(undefined);
  // The active section lives in the URL (?selectedtab=), so the hook needs a router.
  const view = render(
    <ApolloProvider client={makeClient(sent, failOn)}>
      <MemoryRouter>
        <Harness venue={venue} mode={mode} categoryLimit={categoryLimit} onPersisted={onPersisted} apiRef={apiRef} />
      </MemoryRouter>
    </ApolloProvider>
  );
  const rerenderWith = (nextVenue: any) =>
    view.rerender(
      <ApolloProvider client={makeClient(sent, failOn)}>
        <MemoryRouter>
          <Harness venue={nextVenue} mode={mode} categoryLimit={categoryLimit} onPersisted={onPersisted} apiRef={apiRef} />
        </MemoryRouter>
      </ApolloProvider>
    );
  return { apiRef, sent, onPersisted, rerenderWith };
};

const save = async (apiRef: { current: Api | null }, section: EditableSectionKey) => {
  let ok: boolean | undefined;
  await act(async () => {
    ok = await apiRef.current?.saveSection(section);
  });
  return ok;
};

describe('useRegisterVenueForm — section completion', () => {
  it('marks every section incomplete for a blank draft, amenities included until one is picked', () => {
    const { apiRef } = mount();
    expect(apiRef.current?.venueId).toBeNull();
    expect(apiRef.current?.active).toBe('details');
    expect(apiRef.current?.sectionState).toEqual({
      details: 'incomplete',
      'type-capacity': 'incomplete',
      // "No food" is a complete answer, so the untouched switch has nothing to fix.
      food: 'complete',
      amenities: 'incomplete',
      documents: 'incomplete',
      owner: 'incomplete',
      payout: 'incomplete',
    });
  });

  it('leaves amenities incomplete for a stored venue that picked none — every group is optional', () => {
    const { apiRef } = mount({ venue: savedVenue });
    expect(apiRef.current?.sectionState).toMatchObject({ details: 'complete', amenities: 'incomplete', payout: 'complete' });
  });

  it('marks every section complete once a stored venue with a picked amenity hydrates the form', () => {
    const { apiRef } = mount({ venue: { ...savedVenue, amenities: ['AC'] } });
    expect(apiRef.current?.venueId).toBe('venue-1');
    expect(apiRef.current?.sectionState).toEqual({
      details: 'complete',
      'type-capacity': 'complete',
      food: 'complete',
      amenities: 'complete',
      documents: 'complete',
      owner: 'complete',
      payout: 'complete',
    });
    expect(apiRef.current?.form.getValues('owner_dob')).toBe('1990-05-10');
  });

  it('turns a section incomplete as soon as one of its fields breaks', async () => {
    const { apiRef } = mount({ venue: savedVenue });
    await act(async () => {
      apiRef.current?.form.setValue('owner_phone', 'not-a-phone');
    });
    expect(apiRef.current?.sectionState.owner).toBe('incomplete');
    expect(apiRef.current?.sectionState.details).toBe('complete');
  });

  it('marks a broken menu against Food Menu, and leaves Type & Capacity ticked', () => {
    const { apiRef } = mount({ venue: { ...foodVenue, food_menu: [namelessDish] } });

    expect(apiRef.current?.sectionState.food).toBe('incomplete');
    expect(apiRef.current?.sectionState['type-capacity']).toBe('complete');
  });

  it('marks ordering switched on without a Razorpay account against Food Menu', () => {
    const { apiRef } = mount({
      venue: { ...foodVenue, food_ordering: { enabled: true, razorpay_integration_id: null, discount_pct: 0 } },
    });

    expect(apiRef.current?.sectionState.food).toBe('incomplete');
    expect(apiRef.current?.sectionState['type-capacity']).toBe('complete');
  });
});

describe('useRegisterVenueForm — saving a section', () => {
  it('refuses to save a later section and steers back to details when details are invalid', async () => {
    const { apiRef, sent } = mount();

    expect(await save(apiRef, 'documents')).toBe(false);
    expect(apiRef.current?.active).toBe('details');
    expect(apiRef.current?.error).toBe('Complete the Venue Details section first.');
    expect(sent).toEqual([]);
  });

  it('creates the venue with step 1 and advances to type & capacity', async () => {
    const { apiRef, sent, onPersisted } = mount({ venue: draftVenue });

    expect(await save(apiRef, 'details')).toBe(true);

    expect(sent.map((call) => call.name)).toEqual(['V1']);
    expect(sent[0].variables.venue_id).toBeNull();
    expect(sent[0].variables.input).toMatchObject({
      venue_name: 'Cafe Mocha',
      venue_type: 'Cafe',
      capacity: 30,
      capacity_items: [{ label: 'Main hall', capacity: 30 }],
      // The stored venue answers only the legacy single triple: it goes back as a one-entry list.
      venue_categories: [{ super_category_id: 'super-1', category_id: 'cat-1', sub_category_id: 'sub-1' }],
      city: 'Bengaluru',
      postal_code: '560038',
    });
    expect(apiRef.current?.venueId).toBe('venue-1');
    expect(apiRef.current?.active).toBe('type-capacity');
    expect(onPersisted).toHaveBeenCalledTimes(1);
  });

  it('walks Type & Capacity on to Food Menu, and Food Menu on to Amenities — both through step 1', async () => {
    const { apiRef, sent } = mount({ venue: foodVenue });

    expect(await save(apiRef, 'type-capacity')).toBe(true);
    expect(apiRef.current?.active).toBe('food');

    expect(await save(apiRef, 'food')).toBe(true);
    expect(apiRef.current?.active).toBe('amenities');

    expect(sent.map((call) => call.name)).toEqual(['V1', 'V1']);
    expect(sent[1].variables.input).toMatchObject({
      offers_food: true,
      food_menu: [dosaInput],
      food_ordering: { enabled: false, razorpay_integration_id: null, discount_pct: 0 },
    });
  });

  it('refuses a Food Menu save while a dish has no name, without contacting the server', async () => {
    const { apiRef, sent } = mount({ venue: { ...foodVenue, food_menu: [namelessDish] } });

    expect(await save(apiRef, 'food')).toBe(false);

    expect(sent).toEqual([]);
    expect(apiRef.current?.active).toBe('details');
  });

  it('refuses a Food Menu save that turns ordering on with no Razorpay account', async () => {
    const { apiRef, sent } = mount({
      venue: { ...foodVenue, food_ordering: { enabled: true, razorpay_integration_id: null, discount_pct: 0 } },
    });

    expect(await save(apiRef, 'food')).toBe(false);

    expect(sent).toEqual([]);
    expect(apiRef.current?.sectionState.food).toBe('incomplete');
  });

  it('no longer holds Type & Capacity back for a food field', async () => {
    const { apiRef } = mount({ venue: { ...foodVenue, food_menu: [namelessDish] } });

    expect(await save(apiRef, 'type-capacity')).toBe(true);

    expect(apiRef.current?.active).toBe('food');
    expect(apiRef.current?.error).toBeNull();
  });

  it('saves amenities through step 1, where the server stores them — never step 3', async () => {
    const { apiRef, sent } = mount({ venue: draftVenue });

    expect(await save(apiRef, 'amenities')).toBe(true);

    expect(sent.map((call) => call.name)).toEqual(['V1']);
    expect(sent[0].variables.input).toHaveProperty('amenities');
    expect(sent[0].variables.input).toHaveProperty('facilities');
    expect(sent[0].variables.input).toHaveProperty('security');
  });

  it('saves step 1 first for a documents save so the server step gate is satisfied', async () => {
    const { apiRef, sent } = mount({ venue: draftVenue });

    expect(await save(apiRef, 'documents')).toBe(true);

    expect(sent.map((call) => call.name)).toEqual(['V1', 'V2']);
    expect(sent[1].variables.venue_id).toBe('venue-1');
    expect(sent[1].variables.input).toEqual({
      documents: [{ type: 'PAN Card', url: 'https://cdn.example.com/pan.pdf' }],
      gstin: '22ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
    });
    expect(apiRef.current?.active).toBe('owner');
  });

  it('sends the account email as the owner email on step 3', async () => {
    const { apiRef, sent } = mount({ venue: draftVenue });

    expect(await save(apiRef, 'owner')).toBe(true);

    expect(sent.map((call) => call.name)).toEqual(['V1', 'V3']);
    expect(sent[1].variables.input).toEqual({
      owner_name: 'Owner Name',
      owner_email: 'owner@example.com',
      owner_phone: '+919876543210',
      owner_dob: '1990-05-10',
      owner_address: '12 Main Street',
      bank_account: upiBankAccount,
    });
    expect(apiRef.current?.active).toBe('payout');
  });

  it('saves the payout method through step 3 and moves on to leaves', async () => {
    const { apiRef, sent } = mount({ venue: savedVenue });

    expect(await save(apiRef, 'payout')).toBe(true);

    // A stored venue already has its id, so step 1 is not re-sent first.
    expect(sent.map((call) => call.name)).toEqual(['V3']);
    expect(sent[0].variables.venue_id).toBe('venue-1');
    expect(sent[0].variables.input.bank_account).toEqual(upiBankAccount);
    expect(apiRef.current?.active).toBe('leaves');
  });

  it('keeps an invalid section unsaved without contacting the server', async () => {
    const { apiRef, sent } = mount({ venue: { ...savedVenue, owner_phone: 'call me' } });

    expect(await save(apiRef, 'owner')).toBe(false);
    expect(sent).toEqual([]);
    expect(apiRef.current?.error).toBeNull();
  });

  it('surfaces a server error and stays on the section', async () => {
    const { apiRef } = mount({ venue: draftVenue, failOn: 'V1' });

    expect(await save(apiRef, 'details')).toBe(false);
    expect(apiRef.current?.error).toBe('Venue name already taken');
    expect(apiRef.current?.active).toBe('details');
  });
});

describe('useRegisterVenueForm — submitting for review', () => {
  it('jumps to the first failing section instead of submitting', async () => {
    const { apiRef, sent } = mount({ venue: { ...savedVenue, venue_type: '' } });

    let id: string | null | undefined;
    await act(async () => {
      id = await apiRef.current?.submitAll();
    });

    expect(id).toBeNull();
    expect(apiRef.current?.active).toBe('type-capacity');
    expect(apiRef.current?.error).toBe('Fix the highlighted fields before submitting.');
    expect(sent).toEqual([]);
  });

  it('persists all three steps from the current values, then submits and returns the venue id', async () => {
    const { apiRef, sent, onPersisted } = mount({ venue: savedVenue });

    let id: string | null | undefined;
    await act(async () => {
      id = await apiRef.current?.submitAll();
    });

    expect(sent.map((call) => call.name)).toEqual(['V1', 'V2', 'V3', 'VFinal']);
    expect(sent[3].variables).toEqual({ venue_id: 'venue-1' });
    expect(id).toBe('venue-9');
    expect(onPersisted).toHaveBeenCalledTimes(1);
    expect(apiRef.current?.error).toBeNull();
  });

  it('reports the failing step instead of returning an id', async () => {
    const { apiRef, sent } = mount({ venue: savedVenue, failOn: 'V2' });

    let id: string | null | undefined;
    await act(async () => {
      id = await apiRef.current?.submitAll();
    });

    expect(id).toBeNull();
    expect(sent.map((call) => call.name)).toEqual(['V1', 'V2']);
    expect(apiRef.current?.error).toBe('Venue name already taken');
  });
});

describe('useRegisterVenueForm — approved-venue spot edits', () => {
  it('does nothing without a venue id or for a section approval locks', async () => {
    const draft = mount({ venue: draftVenue, mode: 'edit-approved' });
    let ok: boolean | undefined;
    await act(async () => {
      ok = await draft.apiRef.current?.saveApprovedSection('details');
    });
    expect(ok).toBe(false);
    expect(draft.sent).toEqual([]);

    const approved = mount({ venue: savedVenue, mode: 'edit-approved' });
    await act(async () => {
      ok = await approved.apiRef.current?.saveApprovedSection('amenities');
    });
    expect(ok).toBe(false);
    expect(approved.sent).toEqual([]);
  });

  it('sends only the appended documents and never advances the section', async () => {
    const { apiRef, sent, onPersisted } = mount({ venue: savedVenue, mode: 'edit-approved' });

    await act(async () => {
      apiRef.current?.form.setValue('documents', [
        ...savedVenue.documents,
        { type: 'Fire NOC', url: 'https://cdn.example.com/noc.pdf' },
      ]);
    });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await apiRef.current?.saveApprovedSection('documents');
    });

    expect(ok).toBe(true);
    expect(sent.map((call) => call.name)).toEqual(['UpdateApprovedVenue']);
    expect(sent[0].variables).toEqual({
      venue_id: 'venue-1',
      input: { add_documents: [{ type: 'Fire NOC', url: 'https://cdn.example.com/noc.pdf' }] },
    });
    expect(apiRef.current?.saved).toBe('Changes saved.');
    expect(apiRef.current?.active).toBe('details');
    expect(onPersisted).toHaveBeenCalledTimes(1);
  });

  it('sends only description and images for the details section', async () => {
    const { apiRef, sent } = mount({ venue: savedVenue, mode: 'edit-approved' });

    await act(async () => {
      apiRef.current?.form.setValue('description', 'Now with a rooftop');
      await apiRef.current?.saveApprovedSection('details');
    });

    expect(sent[0].variables.input).toEqual({
      description: 'Now with a rooftop',
      cover_image_url: 'https://cdn.example.com/cover.jpg',
      gallery: [],
    });
  });

  it('saves documents for a venue approved before GSTIN and PAN became mandatory', async () => {
    const { apiRef, sent } = mount({ venue: { ...savedVenue, gstin: '', pan: '' }, mode: 'edit-approved' });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await apiRef.current?.saveApprovedSection('documents');
    });

    // The tax ids render locked after approval, so they are never validated here.
    expect(ok).toBe(true);
    expect(sent[0].variables.input).toEqual({ add_documents: [] });
  });

  it('refuses an approved edit whose own fields are invalid', async () => {
    const { apiRef, sent } = mount({ venue: savedVenue, mode: 'edit-approved' });

    let ok: boolean | undefined;
    await act(async () => {
      apiRef.current?.form.setValue('capacity_items', [{ label: '', capacity: 5 }]);
      ok = await apiRef.current?.saveApprovedSection('type-capacity');
    });

    expect(ok).toBe(false);
    expect(sent).toEqual([]);
  });

  it('saves Food Menu on an approved venue with the food input and nothing else', async () => {
    const { apiRef, sent } = mount({ venue: foodVenue, mode: 'edit-approved' });

    let ok: boolean | undefined;
    await act(async () => {
      apiRef.current?.form.setValue('food_menu.0.price', 150);
      ok = await apiRef.current?.saveApprovedSection('food');
    });

    expect(ok).toBe(true);
    expect(sent.map((call) => call.name)).toEqual(['UpdateApprovedVenue']);
    expect(sent[0].variables).toEqual({
      venue_id: 'venue-1',
      input: {
        offers_food: true,
        food_menu: [{ ...dosaInput, price: 150 }],
        food_ordering: { enabled: false, razorpay_integration_id: null, discount_pct: 0 },
      },
    });
    expect(apiRef.current?.saved).toBe('Changes saved.');
  });

  it('saves capacity on an approved venue without naming a food field, so the menu is left alone', async () => {
    const { apiRef, sent } = mount({ venue: foodVenue, mode: 'edit-approved' });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await apiRef.current?.saveApprovedSection('type-capacity');
    });

    expect(ok).toBe(true);
    // The server only writes the keys it is sent — no food key, no food write.
    expect(sent[0].variables.input).toEqual({ capacity_items: [{ label: 'Main hall', capacity: 30 }] });
  });

  it('holds an approved Food Menu save back for a nameless dish, but not an approved capacity save', async () => {
    const { apiRef, sent } = mount({ venue: { ...foodVenue, food_menu: [namelessDish] }, mode: 'edit-approved' });

    let foodOk: boolean | undefined;
    let capacityOk: boolean | undefined;
    await act(async () => {
      foodOk = await apiRef.current?.saveApprovedSection('food');
    });
    expect(foodOk).toBe(false);
    expect(sent).toEqual([]);

    await act(async () => {
      capacityOk = await apiRef.current?.saveApprovedSection('type-capacity');
    });
    expect(capacityOk).toBe(true);
    expect(sent.map((call) => call.name)).toEqual(['UpdateApprovedVenue']);
  });

  it('surfaces a failed approved update and leaves no success message', async () => {
    const { apiRef } = mount({ venue: savedVenue, mode: 'edit-approved', failOn: 'UpdateApprovedVenue' });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await apiRef.current?.saveApprovedSection('owner');
    });

    expect(ok).toBe(false);
    expect(apiRef.current?.error).toBe('Venue name already taken');
    expect(apiRef.current?.saved).toBeNull();
  });
});

describe('useRegisterVenueForm — hydration', () => {
  it('hydrates from the venue the first time it arrives', async () => {
    const { apiRef, rerenderWith } = mount();
    expect(apiRef.current?.form.getValues('venue_name')).toBe('');

    rerenderWith(savedVenue);

    await waitFor(() => expect(apiRef.current?.form.getValues('venue_name')).toBe('Cafe Mocha'));
    expect(apiRef.current?.venueId).toBe('venue-1');
  });

  it('keeps edits made in other sections when a refetch re-delivers the same venue', async () => {
    const { apiRef, rerenderWith } = mount({ venue: savedVenue });

    await act(async () => {
      apiRef.current?.form.setValue('description', 'Edited but not saved yet', { shouldDirty: true });
    });
    // A section save triggers onPersisted → refetch, which hands back a new
    // object with the same id. The hydration key is unchanged, so no reset.
    rerenderWith({ ...savedVenue, description: 'A cosy corner cafe' });

    await waitFor(() => expect(apiRef.current?.venueId).toBe('venue-1'));
    expect(apiRef.current?.form.getValues('description')).toBe('Edited but not saved yet');
  });

  it('re-hydrates from the server once a brand-new draft gains its id', async () => {
    const { apiRef, rerenderWith } = mount();

    await act(async () => {
      apiRef.current?.form.setValue('venue_name', 'Typed by the owner', { shouldDirty: true });
    });
    rerenderWith({ ...savedVenue, venue_name: 'Name from the server' });

    // The hydration key changes from "new:" to the venue id, and nothing in the
    // form subscribes to formState.isDirty, so the server copy wins here.
    await waitFor(() => expect(apiRef.current?.venueId).toBe('venue-1'));
    expect(apiRef.current?.form.getValues('venue_name')).toBe('Name from the server');
  });
});

const COFFEE = {
  super_category_id: 'super-1',
  category_id: 'cat-1',
  sub_category_id: 'sub-1',
  super_category_name: 'Food & Drink',
  category_name: 'Cafe',
  sub_category_name: 'Coffee',
};
const BADMINTON = {
  super_category_id: 'super-2',
  category_id: 'cat-2',
  sub_category_id: 'sub-2',
  super_category_name: 'Sports',
  category_name: 'Racket',
  sub_category_name: 'Badminton',
};
const YOGA = {
  super_category_id: 'super-3',
  category_id: 'cat-3',
  sub_category_id: 'sub-3',
  super_category_name: 'Fitness',
  category_name: 'Yoga',
  sub_category_name: 'Hatha',
};
/** The stored venue once the server answers the list as well as the primary. */
const withCategories = (...categories: (typeof COFFEE)[]) => ({
  ...savedVenue,
  venue_category: categories[0],
  venue_categories: categories,
});

describe('useRegisterVenueForm — several categories', () => {
  it('hydrates one row per category and sends them all back, primary first', async () => {
    const { apiRef, sent } = mount({ venue: withCategories(BADMINTON, COFFEE) });

    expect(apiRef.current?.form.getValues('venue_categories').map((row) => row.sub_name)).toEqual(['Badminton', 'Coffee']);
    expect(await save(apiRef, 'details')).toBe(true);

    expect(sent[0].variables.input.venue_categories).toEqual([
      { super_category_id: 'super-2', category_id: 'cat-2', sub_category_id: 'sub-2' },
      { super_category_id: 'super-1', category_id: 'cat-1', sub_category_id: 'sub-1' },
    ]);
    expect(sent[0].variables.input).not.toHaveProperty('venue_category');
  });

  it('holds Venue Details back, and marks it incomplete, while a row repeats a sub category', async () => {
    const { apiRef, sent } = mount({ venue: withCategories(COFFEE, BADMINTON, { ...COFFEE }) });

    expect(apiRef.current?.sectionState.details).toBe('incomplete');
    expect(await save(apiRef, 'details')).toBe(false);
    expect(sent).toEqual([]);
    expect(apiRef.current?.form.getFieldState('venue_categories.2').error?.message).toBe(
      'This sub category is already added above'
    );
    expect(apiRef.current?.form.getFieldState('venue_categories.0').error).toBeUndefined();
  });

  it('holds every later section back while a category row is only half picked', async () => {
    const { apiRef, sent } = mount({ venue: withCategories(COFFEE) });

    await act(async () => {
      apiRef.current?.form.setValue('venue_categories.1', {
        super_id: 'super-2',
        super_name: 'Sports',
        category_id: '',
        category_name: '',
        sub_id: '',
        sub_name: '',
      });
    });

    expect(await save(apiRef, 'type-capacity')).toBe(false);
    expect(apiRef.current?.active).toBe('details');
    expect(apiRef.current?.error).toBe('Complete the Venue Details section first.');
    expect(sent).toEqual([]);
  });

  it('applies the config’s category limit, and no limit until the config gives one', async () => {
    const capped = mount({ venue: withCategories(COFFEE, BADMINTON, YOGA), categoryLimit: 2 });
    expect(capped.apiRef.current?.sectionState.details).toBe('incomplete');
    expect(await save(capped.apiRef, 'details')).toBe(false);
    expect(capped.sent).toEqual([]);
    cleanup();

    const atLimit = mount({ venue: withCategories(COFFEE, BADMINTON, YOGA), categoryLimit: 3 });
    expect(atLimit.apiRef.current?.sectionState.details).toBe('complete');
    cleanup();

    const uncapped = mount({ venue: withCategories(COFFEE, BADMINTON, YOGA) });
    expect(await save(uncapped.apiRef, 'details')).toBe(true);
    expect(uncapped.sent[0].variables.input.venue_categories).toHaveLength(3);
  });

  // Categories render read-only after approval and updateApprovedVenue never
  // carries them, so a list today's rules would refuse must not block the save.
  it('saves an approved venue’s details whatever its locked categories look like', async () => {
    const { apiRef, sent } = mount({
      venue: withCategories(COFFEE, BADMINTON, YOGA),
      mode: 'edit-approved',
      categoryLimit: 2,
    });

    let ok: boolean | undefined;
    await act(async () => {
      apiRef.current?.form.setValue('description', 'Now with a rooftop');
      ok = await apiRef.current?.saveApprovedSection('details');
    });

    expect(ok).toBe(true);
    expect(sent.map((call) => call.name)).toEqual(['UpdateApprovedVenue']);
    expect(sent[0].variables.input).toEqual({
      description: 'Now with a rooftop',
      cover_image_url: 'https://cdn.example.com/cover.jpg',
      gallery: [],
    });
  });
});
