import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { Observable } from '@apollo/client/utilities';
import { ApolloProvider } from '@apollo/client/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router';
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
  gstin_doc_type: '',
  pan_doc_type: '',
  capacity_item_limit: 5,
  amenities: ['AC'],
  facilities: ['Parking'],
  security: ['CCTV Surveillance'],
  food_diets: ['VEG', 'NON_VEG'],
  food_spice_levels: ['NONE', 'MILD'],
  food_menu_limit: 5,
  food_image_limit: 2,
  food_price_max: 10000,
  food_discount_max_pct: 50,
  food_video_limit: 2,
  food_table_limit: 10,
};

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
  settings: { holidays: ['2026-08-15'] },
};

const theme = createTheme();

const RESULTS: Record<string, Record<string, unknown>> = {
  AdminCategories: { categories: [] },
  AdminLocations: { locations: [] },
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
        observer.next({ data: RESULTS[name] ?? {} });
        observer.complete();
      });
    }),
  });

interface MountOptions {
  venue?: any;
  mode?: RegisterVenueMode;
  failOn?: string;
  /** `venueRegistrationConfig.category_limit`; left out, the config has not said yet. */
  categoryLimit?: number;
}

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
/** The stored venue once the server answers its whole category list. */
const twoCategoryVenue = { ...savedVenue, venue_category: COFFEE, venue_categories: [COFFEE, BADMINTON] };

const mount = ({ venue = null, mode = 'register', failOn, categoryLimit }: MountOptions = {}) => {
  const sent: Sent[] = [];
  const onSubmitted = vi.fn();
  const onPersisted = vi.fn().mockResolvedValue(undefined);
  // The open section lives in ?selectedtab=, so the form needs a router.
  render(
    <ApolloProvider client={makeClient(sent, failOn)}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <MemoryRouter>
            <RegisterVenueForm
              venue={venue}
              locations={[]}
              account={account}
              config={{ ...config, category_limit: categoryLimit }}
              mode={mode}
              onPersisted={onPersisted}
              onSubmitted={onSubmitted}
            />
          </MemoryRouter>
        </LocalizationProvider>
      </ThemeProvider>
    </ApolloProvider>
  );
  return { sent, onSubmitted, onPersisted };
};

const openSection = (label: string) => fireEvent.click(screen.getByRole('tab', { name: label }));

describe('RegisterVenueForm — navigation', () => {
  it('opens on Venue Details and swaps the panel when another section is picked', async () => {
    mount();
    expect(screen.getByLabelText(/Venue name/)).toBeTruthy();
    expect(screen.queryByLabelText(/This venue has a GSTIN/)).toBeNull();

    openSection('Venue Documents');

    // A fresh draft opens with the tax-id switches off — GSTIN is optional.
    expect(await screen.findByLabelText(/This venue has a GSTIN/)).toBeTruthy();
    expect(screen.queryByLabelText(/Venue name/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Save & continue' })).toBeTruthy();
  });

  it('gives food a section of its own, out of Type & Capacity', async () => {
    mount();

    openSection('Type & Capacity');
    expect(await screen.findByRole('combobox', { name: /Venue type/ })).toBeTruthy();
    expect(screen.queryByTestId('register-venue-offers-food')).toBeNull();

    openSection('Food Menu');
    expect(await screen.findByRole('heading', { name: 'Food Menu' })).toBeTruthy();
    expect(screen.getByLabelText(/Does this venue offer food?/)).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: /Venue type/ })).toBeNull();
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
    // The section switch is a router navigation (a transition), so it can
    // commit after the error alert does.
    expect(await screen.findByLabelText(/Owner phone/)).toBeTruthy();
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

describe('RegisterVenueForm — several categories', () => {
  it('shows a row per stored category and saves them all through step 1, primary first', async () => {
    const { sent, onPersisted } = mount({ venue: { ...twoCategoryVenue, id: undefined } });

    expect(screen.getByRole('group', { name: 'Category 1' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Category 2' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));

    await waitFor(() => expect(onPersisted).toHaveBeenCalledTimes(1));
    const step1 = sent.find((call) => call.name === 'V1');
    expect(step1?.variables.input.venue_categories).toEqual([
      { super_category_id: 'super-1', category_id: 'cat-1', sub_category_id: 'sub-1' },
      { super_category_id: 'super-2', category_id: 'cat-2', sub_category_id: 'sub-2' },
    ]);
  });

  it('refuses to save a blank extra row, naming the problem on that row', async () => {
    const { sent } = mount({ venue: { ...twoCategoryVenue, id: undefined } });

    fireEvent.click(screen.getByRole('button', { name: 'Add category' }));
    const third = await screen.findByRole('group', { name: 'Category 3' });
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));

    expect(await within(third).findByText('Select the super category, category and sub category.')).toBeTruthy();
    expect(sent.some((call) => call.name === 'V1')).toBe(false);
  });

  it('stops adding at the limit the registration config gives', () => {
    mount({ venue: twoCategoryVenue, categoryLimit: 2 });

    expect(screen.getByRole('button', { name: 'Add category' })).toHaveProperty('disabled', true);
    expect(screen.getByText('A venue can have at most 2 categories.')).toBeTruthy();
  });

  it('lets a venue below the limit add another', () => {
    mount({ venue: twoCategoryVenue, categoryLimit: 3 });

    expect(screen.getByRole('button', { name: 'Add category' })).toHaveProperty('disabled', false);
  });

  it('shows an approved venue its categories read-only', () => {
    mount({ venue: twoCategoryVenue, mode: 'edit-approved' });

    const rows = within(screen.getByTestId('venue-categories'));
    expect(rows.getAllByRole('combobox')).toHaveLength(6);
    expect(rows.getAllByRole('combobox').every((input) => (input as HTMLInputElement).disabled)).toBe(true);
    expect(screen.queryByRole('button', { name: 'Add category' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Remove category/ })).toBeNull();
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

    fireEvent.change(screen.getByLabelText(/Venue description/), { target: { value: 'Now with a rooftop' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Changes saved.')).toBeTruthy();
    const update = sent.find((call) => call.name === 'UpdateApprovedVenue');
    expect(update?.variables).toEqual({
      venue_id: 'venue-1',
      input: {
        description: 'Now with a rooftop',
        cover_image_url: 'https://cdn.example.com/cover.jpg',
        gallery: [],
        videos: [],
      },
    });
    expect(onPersisted).toHaveBeenCalledTimes(1);
    // A spot edit never walks the wizard forward.
    expect(screen.getByLabelText(/Venue description/)).toBeTruthy();
  });

  it('saves the Food Menu section of an approved venue with the food input only', async () => {
    const { sent } = mount({ venue: savedVenue, mode: 'edit-approved' });

    openSection('Food Menu');
    fireEvent.click(await screen.findByLabelText(/Does this venue offer food?/));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Changes saved.')).toBeTruthy();
    const update = sent.find((call) => call.name === 'UpdateApprovedVenue');
    expect(update?.variables).toEqual({
      venue_id: 'venue-1',
      input: {
        offers_food: true,
        food_menu: [],
        food_ordering: { enabled: false, razorpay_integration_id: null, discount_pct: 0, tax_override: false },
        // A venue that never gave licences or tables sends them blank.
        food_licences: { fssai_number: '', fssai_document_url: '', liquor_licence_number: '', liquor_document_url: '' },
        food_tables: [],
      },
    });
  });

  it('lets an approved venue with saved tables print its QR stickers', async () => {
    mount({ venue: { ...savedVenue, offers_food: true, food_tables: ['1', '2', 'Patio'] }, mode: 'edit-approved' });

    openSection('Food Menu');

    expect(((await screen.findByTestId('register-venue-food-tables-input')) as HTMLTextAreaElement).value).toBe(
      '1, 2, Patio'
    );
    expect(screen.getByTestId('register-venue-food-table-stickers')).toHaveProperty('disabled', false);
  });

  it('keeps the stickers off until the venue has tables saved', async () => {
    mount({ venue: { ...savedVenue, offers_food: true }, mode: 'edit-approved' });

    openSection('Food Menu');

    // Typed but unsaved tables are not on the server yet, so there is nothing to print.
    fireEvent.change(await screen.findByTestId('register-venue-food-tables-input'), { target: { value: '1, 2' } });
    expect(screen.getByTestId('register-venue-food-table-stickers')).toHaveProperty('disabled', true);
  });

  it('sends the typed tables and licences with an approved Food save', async () => {
    const { sent } = mount({ venue: { ...savedVenue, offers_food: true }, mode: 'edit-approved' });

    openSection('Food Menu');
    fireEvent.change(await screen.findByTestId('register-venue-food-tables-input'), {
      target: { value: '1, 2, Patio' },
    });
    fireEvent.change(screen.getByLabelText(/FSSAI licence number/), { target: { value: '12345678901234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Changes saved.')).toBeTruthy();
    const update = sent.find((call) => call.name === 'UpdateApprovedVenue');
    expect(update?.variables.input).toMatchObject({
      offers_food: true,
      food_tables: ['1', '2', 'Patio'],
      food_licences: { fssai_number: '12345678901234', liquor_licence_number: '' },
    });
  });

  it('holds an approved Food save back for a malformed FSSAI number and says why', async () => {
    const { sent } = mount({ venue: { ...savedVenue, offers_food: true }, mode: 'edit-approved' });

    openSection('Food Menu');
    fireEvent.change(await screen.findByLabelText(/FSSAI licence number/), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('The FSSAI number must be 14 digits')).toBeTruthy();
    expect(sent.some((call) => call.name === 'UpdateApprovedVenue')).toBe(false);
  });

  it('hides the save bar on the amenities section, which approval locks', async () => {
    mount({ venue: savedVenue, mode: 'edit-approved' });

    openSection('Amenities & Security');

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull());
  });
});
