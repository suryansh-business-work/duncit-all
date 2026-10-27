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

const makeClient = (sent: Sent[], failOn?: string, results: Record<string, Record<string, unknown>> = RESULTS) =>
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
        observer.next({ data: results[name] });
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
  /** Answers that replace the default ones, by operation name. */
  results?: Record<string, Record<string, unknown>>;
}

const mount = ({ venue = null, mode = 'register', categoryLimit, failOn, results }: MountOptions = {}) => {
  const answers = results ? { ...RESULTS, ...results } : RESULTS;
  const apiRef: { current: Api | null } = { current: null };
  const sent: Sent[] = [];
  const onPersisted = vi.fn().mockResolvedValue(undefined);
  // The active section lives in the URL (?selectedtab=), so the hook needs a router.
  const view = render(
    <ApolloProvider client={makeClient(sent, failOn, answers)}>
      <MemoryRouter>
        <Harness venue={venue} mode={mode} categoryLimit={categoryLimit} onPersisted={onPersisted} apiRef={apiRef} />
      </MemoryRouter>
    </ApolloProvider>
  );
  const rerenderWith = (nextVenue: any) =>
    view.rerender(
      <ApolloProvider client={makeClient(sent, failOn, answers)}>
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
  it('marks the registration sections incomplete for a blank draft', () => {
    const { apiRef } = mount();
    expect(apiRef.current?.venueId).toBeNull();
    expect(apiRef.current?.active).toBe('details');
    expect(apiRef.current?.sectionState).toMatchObject({
      details: 'incomplete',
      documents: 'incomplete',
      owner: 'incomplete',
      payout: 'incomplete',
    });
  });

  it('marks every registration section complete once a stored venue hydrates the form', () => {
    const { apiRef } = mount({ venue: savedVenue });
    expect(apiRef.current?.venueId).toBe('venue-1');
    expect(apiRef.current?.sectionState).toMatchObject({
      details: 'complete',
      documents: 'complete',
      owner: 'complete',
      payout: 'complete',
    });
    expect(apiRef.current?.form.getValues('owner_dob')).toBe('1990-05-10');
  });

  it('does not hold registration back for a venue type, capacity or menu — Venue Options sets those up', () => {
    const { apiRef } = mount({
      venue: { ...foodVenue, venue_type: '', capacity_items: [], food_menu: [namelessDish] },
    });
    expect(apiRef.current?.sectionState).toMatchObject({ details: 'complete', documents: 'complete', owner: 'complete' });
  });

  it('turns a section incomplete as soon as one of its fields breaks', async () => {
    const { apiRef } = mount({ venue: savedVenue });
    await act(async () => {
      apiRef.current?.form.setValue('owner_phone', 'not-a-phone');
    });
    expect(apiRef.current?.sectionState.owner).toBe('incomplete');
    expect(apiRef.current?.sectionState.details).toBe('complete');
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

  it('creates the venue with step 1, its details only, and advances to documents', async () => {
    const { apiRef, sent, onPersisted } = mount({ venue: draftVenue });

    expect(await save(apiRef, 'details')).toBe(true);

    expect(sent.map((call) => call.name)).toEqual(['V1']);
    expect(sent[0].variables.venue_id).toBeNull();
    expect(sent[0].variables.input).toMatchObject({
      venue_name: 'Cafe Mocha',
      // The stored venue answers only the legacy single triple: it goes back as a one-entry list.
      venue_categories: [{ super_category_id: 'super-1', category_id: 'cat-1', sub_category_id: 'sub-1' }],
      city: 'Bengaluru',
      postal_code: '560038',
    });
    // Set up from Venue Options — left out, so the server keeps what it has.
    for (const key of ['venue_type', 'capacity', 'capacity_items', 'offers_food', 'amenities']) {
      expect(sent[0].variables.input).not.toHaveProperty(key);
    }
    expect(apiRef.current?.venueId).toBe('venue-1');
    expect(apiRef.current?.active).toBe('documents');
    expect(onPersisted).toHaveBeenCalledTimes(1);
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

  it('saves the payout method through step 3 and moves on to review', async () => {
    const { apiRef, sent } = mount({ venue: savedVenue });

    expect(await save(apiRef, 'payout')).toBe(true);

    // A stored venue already has its id, so step 1 is not re-sent first.
    expect(sent.map((call) => call.name)).toEqual(['V3']);
    expect(sent[0].variables.venue_id).toBe('venue-1');
    expect(sent[0].variables.input.bank_account).toEqual(upiBankAccount);
    expect(apiRef.current?.active).toBe('review');
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
    const { apiRef, sent } = mount({ venue: { ...savedVenue, owner_phone: 'call me' } });

    let id: string | null | undefined;
    await act(async () => {
      id = await apiRef.current?.submitAll();
    });

    expect(id).toBeNull();
    expect(apiRef.current?.active).toBe('owner');
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

  it('keeps the venue id it already had when the server does not repeat it, and returns it when the final answer has none', async () => {
    const { apiRef, sent } = mount({
      venue: savedVenue,
      results: {
        V1: { submitVenueStep1: { __typename: 'Venue', id: null, step_completed: 1, status: 'DRAFT' } },
        VFinal: { submitVenueFinal: null },
      },
    });

    let id: string | null | undefined;
    await act(async () => {
      id = await apiRef.current?.submitAll();
    });

    expect(sent.map((call) => call.name)).toEqual(['V1', 'V2', 'V3', 'VFinal']);
    expect(sent[1].variables.venue_id).toBe('venue-1');
    expect(sent[3].variables).toEqual({ venue_id: 'venue-1' });
    expect(id).toBe('venue-1');
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
      videos: [],
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
      apiRef.current?.form.setValue('owner_phone', 'call me');
      ok = await apiRef.current?.saveApprovedSection('owner');
    });

    expect(ok).toBe(false);
    expect(sent).toEqual([]);
  });

  it('saves neither capacity nor food here any more — Venue Options does', async () => {
    const { apiRef, sent } = mount({ venue: foodVenue, mode: 'edit-approved' });

    let capacityOk: boolean | undefined;
    let foodOk: boolean | undefined;
    await act(async () => {
      capacityOk = await apiRef.current?.saveApprovedSection('type-capacity');
      foodOk = await apiRef.current?.saveApprovedSection('food');
    });

    expect(capacityOk).toBe(false);
    expect(foodOk).toBe(false);
    expect(sent).toEqual([]);
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

    expect(await save(apiRef, 'documents')).toBe(false);
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
      videos: [],
    });
  });
});
