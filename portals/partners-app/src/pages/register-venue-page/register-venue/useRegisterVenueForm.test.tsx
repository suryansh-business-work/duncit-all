import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { Observable } from '@apollo/client/utilities';
import { ApolloProvider } from '@apollo/client/react';
import { useRegisterVenueForm, type EditableSectionKey } from './useRegisterVenueForm';
import type { RegisterVenueMode } from './register-venue.types';

afterEach(cleanup);

const account = { name: 'Owner Name', email: 'owner@example.com' };

/** A stored venue whose values satisfy every section of the schema. */
const savedVenue = {
  id: 'venue-1',
  venue_name: 'Cafe Mocha',
  description: 'A cosy corner cafe',
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
  owner_name: 'Owner Name',
  owner_phone: '+919876543210',
  owner_dob: '1990-05-10T00:00:00.000Z',
  owner_address: '12 Main Street',
};

/** Same venue before its first save — no id, so the hook must create one. */
const draftVenue = { ...savedVenue, id: undefined };

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
  onPersisted: () => Promise<unknown>;
  apiRef: { current: Api | null };
}

const noLocations: any[] = [];

function Harness({ venue, mode, onPersisted, apiRef }: Readonly<HarnessProps>) {
  apiRef.current = useRegisterVenueForm({ venue, locations: noLocations, account, mode, onPersisted });
  return null;
}

interface MountOptions {
  venue?: any;
  mode?: RegisterVenueMode;
  failOn?: string;
}

const mount = ({ venue = null, mode = 'register', failOn }: MountOptions = {}) => {
  const apiRef: { current: Api | null } = { current: null };
  const sent: Sent[] = [];
  const onPersisted = vi.fn().mockResolvedValue(undefined);
  const view = render(
    <ApolloProvider client={makeClient(sent, failOn)}>
      <Harness venue={venue} mode={mode} onPersisted={onPersisted} apiRef={apiRef} />
    </ApolloProvider>
  );
  const rerenderWith = (nextVenue: any) =>
    view.rerender(
      <ApolloProvider client={makeClient(sent, failOn)}>
        <Harness venue={nextVenue} mode={mode} onPersisted={onPersisted} apiRef={apiRef} />
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
  it('marks only the sections with no required fields complete for a blank draft', () => {
    const { apiRef } = mount();
    expect(apiRef.current?.venueId).toBeNull();
    expect(apiRef.current?.active).toBe('details');
    expect(apiRef.current?.sectionState).toEqual({
      details: 'incomplete',
      'type-capacity': 'incomplete',
      amenities: 'complete',
      documents: 'incomplete',
      owner: 'incomplete',
    });
  });

  it('marks every section complete once a stored venue hydrates the form', () => {
    const { apiRef } = mount({ venue: savedVenue });
    expect(apiRef.current?.venueId).toBe('venue-1');
    expect(apiRef.current?.sectionState).toEqual({
      details: 'complete',
      'type-capacity': 'complete',
      amenities: 'complete',
      documents: 'complete',
      owner: 'complete',
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
      venue_category: { super_category_id: 'super-1', category_id: 'cat-1', sub_category_id: 'sub-1' },
      city: 'Bengaluru',
      postal_code: '560038',
    });
    expect(apiRef.current?.venueId).toBe('venue-1');
    expect(apiRef.current?.active).toBe('type-capacity');
    expect(onPersisted).toHaveBeenCalledTimes(1);
  });

  it('saves step 1 first for a documents save so the server step gate is satisfied', async () => {
    const { apiRef, sent } = mount({ venue: draftVenue });

    expect(await save(apiRef, 'documents')).toBe(true);

    expect(sent.map((call) => call.name)).toEqual(['V1', 'V2']);
    expect(sent[1].variables.venue_id).toBe('venue-1');
    expect(sent[1].variables.input).toEqual({
      documents: [{ type: 'PAN Card', url: 'https://cdn.example.com/pan.pdf' }],
      gstin: '',
      pan: '',
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
    });
    expect(apiRef.current?.active).toBe('leaves');
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
      cover_image_url: '',
      gallery: [],
    });
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
