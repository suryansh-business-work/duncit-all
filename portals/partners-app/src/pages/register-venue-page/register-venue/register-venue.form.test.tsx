import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from '@apollo/client';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import RegisterVenueForm from './register-venue.form';
import type { RegisterVenueMode, VenueRegistrationConfig } from './register-venue.types';

vi.mock('../../../components/MediaPickerDialog', () => ({
  default: () => null,
}));

afterEach(cleanup);

const account = { name: 'Owner Name', email: 'owner@example.com' };

const config: VenueRegistrationConfig = {
  venue_types: ['Cafe', 'Banquet'],
  doc_types: ['PAN Card', 'Trade License'],
  capacity_item_limit: 5,
  amenities: ['AC'],
  facilities: ['Parking'],
  security: ['CCTV Surveillance'],
};

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
  settings: { holidays: ['2026-08-15'] },
};

const RESULTS: Record<string, Record<string, unknown>> = {
  AdminCategories: { categories: [] },
  AdminLocations: { locations: [] },
  VenueCategoryNames: { categories: [] },
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
      sent.push({ name: operation.operationName, variables: operation.variables });
      return new Observable((observer) => {
        if (operation.operationName === failOn) {
          observer.error(new Error('Venue name already taken'));
          return;
        }
        observer.next({ data: RESULTS[operation.operationName] ?? {} });
        observer.complete();
      });
    }),
  });

interface MountOptions {
  venue?: any;
  mode?: RegisterVenueMode;
  failOn?: string;
}

const mount = ({ venue = null, mode = 'register', failOn }: MountOptions = {}) => {
  const sent: Sent[] = [];
  const onSubmitted = vi.fn();
  const onPersisted = vi.fn().mockResolvedValue(undefined);
  render(
    <ApolloProvider client={makeClient(sent, failOn)}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <RegisterVenueForm
          venue={venue}
          locations={[]}
          account={account}
          config={config}
          mode={mode}
          onPersisted={onPersisted}
          onSubmitted={onSubmitted}
        />
      </LocalizationProvider>
    </ApolloProvider>
  );
  return { sent, onSubmitted, onPersisted };
};

const openSection = (label: string) => fireEvent.click(screen.getByRole('tab', { name: label }));

describe('RegisterVenueForm — navigation', () => {
  it('opens on Venue Details and swaps the panel when another section is picked', async () => {
    mount();
    expect(screen.getByLabelText(/Venue name/)).toBeTruthy();
    expect(screen.queryByLabelText('GSTIN (optional)')).toBeNull();

    openSection('Venue Documents');

    expect(await screen.findByLabelText('GSTIN (optional)')).toBeTruthy();
    expect(screen.queryByLabelText(/Venue name/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Save & continue' })).toBeTruthy();
  });

  it('hides the save bar on Leaves & Holidays, which saves itself', async () => {
    mount({ venue: savedVenue });

    openSection('Leaves & Holidays');

    expect(await screen.findByRole('button', { name: 'Save leaves & holidays' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save & continue' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Submit for review' })).toBeNull();
  });

  it('offers Submit for review on the review section only', async () => {
    mount({ venue: savedVenue });
    expect(screen.queryByRole('button', { name: 'Submit for review' })).toBeNull();

    openSection('Review & Submit');

    expect(await screen.findByRole('button', { name: 'Submit for review' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save & continue' })).toBeNull();
  });
});

describe('RegisterVenueForm — register mode', () => {
  it('blocks a save of an empty details section and sends nothing', async () => {
    const { sent, onPersisted } = mount();

    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));

    expect(await screen.findByText('Venue name must be at least 2 characters')).toBeTruthy();
    expect(sent.some((call) => call.name.startsWith('V'))).toBe(false);
    expect(onPersisted).not.toHaveBeenCalled();
  });

  it('saves a complete details section and moves on to Type & Capacity', async () => {
    const { sent, onPersisted } = mount({ venue: { ...savedVenue, id: undefined } });

    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));

    await waitFor(() => expect(onPersisted).toHaveBeenCalledTimes(1));
    expect(sent.filter((call) => call.name === 'V1')).toHaveLength(1);
    expect(await screen.findByLabelText(/Venue type/)).toBeTruthy();
  });

  it('shows the server error in an alert when the save fails', async () => {
    mount({ venue: savedVenue, failOn: 'V1' });

    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));

    expect(await screen.findByText('Venue name already taken')).toBeTruthy();
    expect(screen.getByLabelText(/Venue name/)).toBeTruthy();
  });

  it('sends the owner back to the failing section instead of submitting', async () => {
    const { onSubmitted, sent } = mount({ venue: { ...savedVenue, owner_phone: '' } });

    openSection('Review & Submit');
    fireEvent.click(await screen.findByRole('button', { name: 'Submit for review' }));

    expect(await screen.findByText('Fix the highlighted fields before submitting.')).toBeTruthy();
    expect(screen.getByLabelText(/Owner phone/)).toBeTruthy();
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(sent.some((call) => call.name === 'VFinal')).toBe(false);
  });

  it('submits a complete venue and hands the submitted id back to the page', async () => {
    const { onSubmitted, sent } = mount({ venue: savedVenue });

    openSection('Review & Submit');
    fireEvent.click(await screen.findByRole('button', { name: 'Submit for review' }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith('venue-9'));
    expect(sent.filter((call) => ['V1', 'V2', 'V3', 'VFinal'].includes(call.name)).map((call) => call.name)).toEqual([
      'V1',
      'V2',
      'V3',
      'VFinal',
    ]);
  });
});

describe('RegisterVenueForm — view mode', () => {
  it('wraps the sections in a disabled fieldset and offers no save or submit action', () => {
    mount({ venue: savedVenue, mode: 'view' });

    // A disabled <fieldset> disables every control inside it, including MUI's
    // div-based Selects (which also get pointer-events: none).
    const fieldset = screen.getByLabelText(/Venue name/).closest('fieldset[disabled]');
    expect(fieldset).not.toBeNull();
    expect(fieldset?.getAttribute('aria-disabled')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Save & continue' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  });

  it('leaves the section fieldset enabled while registering', () => {
    mount({ venue: savedVenue, mode: 'register' });

    expect(screen.getByLabelText(/Venue name/).closest('fieldset[disabled]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save & continue' })).toBeTruthy();
  });
});

describe('RegisterVenueForm — edit-approved mode', () => {
  it('drops the review section and swaps the action for Save changes', () => {
    mount({ venue: savedVenue, mode: 'edit-approved' });

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Review & Submit' })).toBeNull();
    expect(screen.getByRole('tab', { name: 'Venue Details' })).toBeTruthy();
  });

  it('persists the active section through updateApprovedVenue and confirms it', async () => {
    const { sent, onPersisted } = mount({ venue: savedVenue, mode: 'edit-approved' });

    fireEvent.change(screen.getByLabelText('Venue description'), { target: { value: 'Now with a rooftop' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Changes saved.')).toBeTruthy();
    const update = sent.find((call) => call.name === 'UpdateApprovedVenue');
    expect(update?.variables).toEqual({
      venue_id: 'venue-1',
      input: { description: 'Now with a rooftop', cover_image_url: '', gallery: [] },
    });
    expect(onPersisted).toHaveBeenCalledTimes(1);
    // A spot edit never walks the wizard forward.
    expect(screen.getByLabelText('Venue description')).toBeTruthy();
  });

  it('hides the save bar on the amenities section, which approval locks', async () => {
    mount({ venue: savedVenue, mode: 'edit-approved' });

    openSection('Amenities & Security');

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull());
  });
});
