import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { useForm, type UseFormReturn, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ADMIN_CATEGORIES, EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';
import { ADMIN_LOCATIONS } from '@duncit/location';
import VenueDetailsSection from './VenueDetailsSection';
import { registerVenueSchema } from '../register-venue/register-venue.schema';
import {
  blankRegisterVenueValues,
  type RegisterVenueMode,
  type RegisterVenueValues,
} from '../register-venue/register-venue.types';

const PICKED_IMAGE = 'https://cdn.example.com/cover.jpg';

vi.mock('../../../components/MediaPickerDialog', () => ({
  default: ({ open, onPicked, title }: Readonly<{ open: boolean; onPicked: (url: string) => void; title: string }>) =>
    open ? (
      <button type="button" onClick={() => onPicked(PICKED_IMAGE)}>
        {`pick from ${title}`}
      </button>
    ) : null,
}));

afterEach(cleanup);

const mocks: MockedResponse[] = [
  {
    request: { query: ADMIN_CATEGORIES },
    result: {
      data: {
        categories: [
          // `min_pax` is part of ADMIN_CATEGORIES' selection — omitting it makes
          // Apollo refuse to write the result to the cache, so the cascade
          // renders empty and these assertions pass or fail on timing.
          { __typename: 'Category', id: 'sup-1', name: 'Food', slug: 'food', level: 'SUPER', parent_id: null, min_pax: null },
          { __typename: 'Category', id: 'cat-1', name: 'Cafe', slug: 'cafe', level: 'CATEGORY', parent_id: 'sup-1', min_pax: null },
          { __typename: 'Category', id: 'sub-1', name: 'Coffee', slug: 'coffee', level: 'SUB', parent_id: 'cat-1', min_pax: 4 },
          { __typename: 'Category', id: 'sub-2', name: 'Tea', slug: 'tea', level: 'SUB', parent_id: 'cat-1', min_pax: null },
        ],
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
  {
    request: { query: ADMIN_LOCATIONS },
    result: {
      data: {
        locations: [
          {
            __typename: 'Location',
            id: 'loc-1',
            location_name: 'Bengaluru',
            country: 'India',
            country_code: 'IN',
            state: 'Karnataka',
            state_code: 'KA',
            city: 'Bengaluru',
            location_pincode: '560001',
            location_zones: [
              { __typename: 'LocationZone', zone_name: 'Indiranagar', zone_code: 'IND', pincode: '560038' },
            ],
          },
          {
            __typename: 'Location',
            id: 'loc-2',
            location_name: 'Dubai',
            country: 'United Arab Emirates',
            country_code: 'AE',
            state: 'Dubai',
            state_code: 'DU',
            city: 'Dubai',
            location_pincode: '00000',
            location_zones: [],
          },
        ],
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
];

const COFFEE: AdminCategoryValue = {
  super_id: 'sup-1',
  super_name: 'Food',
  category_id: 'cat-1',
  category_name: 'Cafe',
  sub_id: 'sub-1',
  sub_name: 'Coffee',
};
const TEA: AdminCategoryValue = { ...COFFEE, sub_id: 'sub-2', sub_name: 'Tea' };
/** Super and Category picked, Sub still to choose. */
const HALF_PICKED: AdminCategoryValue = { ...COFFEE, sub_id: '', sub_name: '' };

interface HarnessProps {
  mode: RegisterVenueMode;
  categoryLimit?: number;
  videoLimit?: number;
  venueId?: string;
  defaults?: Partial<RegisterVenueValues>;
  formRef: { current: UseFormReturn<RegisterVenueValues> | null };
}

function Harness({ mode, categoryLimit, videoLimit, venueId, defaults, formRef }: Readonly<HarnessProps>) {
  const form = useForm<RegisterVenueValues, any, RegisterVenueValues>({
    resolver: zodResolver(registerVenueSchema()) as unknown as Resolver<RegisterVenueValues, any, RegisterVenueValues>,
    defaultValues: { ...blankRegisterVenueValues, ...defaults },
    mode: 'onBlur',
  });
  formRef.current = form;
  return (
    <VenueDetailsSection
      form={form}
      mode={mode}
      categoryLimit={categoryLimit}
      videoLimit={videoLimit}
      venueId={venueId}
    />
  );
}

const mount = (props: Omit<HarnessProps, 'formRef'>) => {
  const formRef: HarnessProps['formRef'] = { current: null };
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <Harness {...props} formRef={formRef} />
    </MockedProvider>
  );
  return formRef;
};

describe('VenueDetailsSection — editable identity fields', () => {
  it('writes the typed name and description into the form and shows the register hints', async () => {
    const formRef = mount({ mode: 'register' });

    fireEvent.change(screen.getByLabelText(/Venue name/), { target: { value: 'Cafe Mocha' } });
    fireEvent.change(screen.getByLabelText(/Venue description/), { target: { value: 'A cosy corner cafe' } });

    await waitFor(() => expect(formRef.current?.getValues('venue_name')).toBe('Cafe Mocha'));
    expect(formRef.current?.getValues('description')).toBe('A cosy corner cafe');
    expect(screen.getByText('Public name shown to hosts and guests')).toBeTruthy();
    expect(screen.getByText('Building / street — shown on the venue page')).toBeTruthy();
  });

  it('reports a too-short venue name on blur', async () => {
    mount({ mode: 'register' });

    const input = screen.getByLabelText(/Venue name/);
    fireEvent.change(input, { target: { value: 'A' } });
    fireEvent.blur(input);

    expect(await screen.findByText('Venue name must be at least 2 characters')).toBeTruthy();
  });
});

describe('VenueDetailsSection — edit-approved mode', () => {
  it('locks name and address but keeps description and images editable', () => {
    mount({ mode: 'edit-approved', defaults: { venue_name: 'Cafe Mocha' } });

    expect(screen.getByLabelText(/Venue name/)).toHaveProperty('disabled', true);
    expect(screen.getByLabelText(/Address line 1/)).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('Address line 2')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText(/Venue description/)).toHaveProperty('disabled', false);
    expect(screen.getAllByText('Locked after approval')).toHaveLength(3);
    expect(screen.queryByText('Public name shown to hosts and guests')).toBeNull();
  });

  it('shows every category read-only: no adding, no removing, every dropdown locked', async () => {
    mount({ mode: 'edit-approved', defaults: { venue_categories: [COFFEE, TEA] } });

    const rows = within(screen.getByTestId('venue-categories'));
    await waitFor(() =>
      expect(
        rows.getAllByRole('combobox', { name: /Sub Category/ }).map((input) => (input as HTMLInputElement).value)
      ).toEqual(['Coffee', 'Tea'])
    );
    expect(rows.getAllByRole('combobox').every((input) => (input as HTMLInputElement).disabled)).toBe(true);
    expect(screen.queryByRole('button', { name: 'Add category' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Remove category/ })).toBeNull();
  });
});

describe('VenueDetailsSection — validation surfaced to the shared pickers', () => {
  it('shows one category message once the category triple fails validation', async () => {
    const formRef = mount({ mode: 'register' });
    expect(screen.queryByText('Select the super category, category and sub category.')).toBeNull();

    await act(async () => {
      await formRef.current?.trigger(['venue_categories']);
    });

    expect(
      await screen.findByText('Select the super category, category and sub category.')
    ).toBeTruthy();
  });

  it('feeds each location error to its own cascading dropdown', async () => {
    const formRef = mount({ mode: 'register', defaults: { country: '', country_code: '' } });

    await act(async () => {
      await formRef.current?.trigger(['country', 'state', 'city', 'locality']);
    });

    expect(await screen.findByText('Country is required')).toBeTruthy();
    expect(screen.getByText('State is required')).toBeTruthy();
    expect(screen.getByText('City is required')).toBeTruthy();
    expect(screen.getByText('Locality / area is required')).toBeTruthy();
  });
});

describe('VenueDetailsSection — category cascade', () => {
  it('writes the picked super category and clears the levels below it', async () => {
    const formRef = mount({
      mode: 'register',
      defaults: { venue_categories: [{ ...COFFEE, super_id: 'old-super', super_name: 'Old' }] },
    });

    const superSelect = screen.getByRole('combobox', { name: /Super Category/ });
    fireEvent.keyDown(superSelect, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('Food'));

    await waitFor(() => expect(formRef.current?.getValues('venue_categories.0.super_id')).toBe('sup-1'));
    expect(formRef.current?.getValues('venue_categories.0')).toEqual({ ...EMPTY_CATEGORY, super_id: 'sup-1', super_name: 'Food' });
  });

  it('keeps the super category when a sub category is picked', async () => {
    const formRef = mount({ mode: 'register', defaults: { venue_categories: [HALF_PICKED] } });

    const subSelect = screen.getByRole('combobox', { name: /Sub Category/ });
    fireEvent.keyDown(subSelect, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('Coffee'));

    await waitFor(() => expect(formRef.current?.getValues('venue_categories.0.sub_id')).toBe('sub-1'));
    expect(formRef.current?.getValues('venue_categories')).toEqual([COFFEE]);
  });
});

describe('VenueDetailsSection — several categories', () => {
  it('titles the group for several categories and marks the first row as the primary', () => {
    mount({ mode: 'register', defaults: { venue_categories: [COFFEE, TEA] } });

    expect(screen.getByRole('group', { name: 'Venue categories' })).toBeTruthy();
    expect(within(screen.getByRole('group', { name: 'Category 1' })).getByText('Primary')).toBeTruthy();
    expect(within(screen.getByRole('group', { name: 'Category 2' })).queryByText('Primary')).toBeNull();
  });

  it('adds a blank row and removes the row it is asked to, never the last one', async () => {
    const formRef = mount({ mode: 'register', defaults: { venue_categories: [COFFEE] } });
    expect(screen.getByRole('button', { name: 'Remove category 1' })).toHaveProperty('disabled', true);

    fireEvent.click(screen.getByRole('button', { name: 'Add category' }));
    await waitFor(() => expect(formRef.current?.getValues('venue_categories')).toEqual([COFFEE, EMPTY_CATEGORY]));

    fireEvent.click(screen.getByRole('button', { name: 'Remove category 1' }));
    await waitFor(() => expect(formRef.current?.getValues('venue_categories')).toEqual([EMPTY_CATEGORY]));
    expect(screen.getByRole('button', { name: 'Remove category 1' })).toHaveProperty('disabled', true);
  });

  it('stops adding at the category limit from the config and says what the limit is', () => {
    mount({ mode: 'register', categoryLimit: 2, defaults: { venue_categories: [COFFEE, TEA] } });

    expect(screen.getByRole('button', { name: 'Add category' })).toHaveProperty('disabled', true);
    expect(screen.getByText('A venue can have at most 2 categories.')).toBeTruthy();
  });

  it('keeps adding open, with no limit note, until the config gives a limit', () => {
    mount({ mode: 'register', defaults: { venue_categories: [COFFEE, TEA] } });

    expect(screen.getByRole('button', { name: 'Add category' })).toHaveProperty('disabled', false);
    expect(screen.queryByText(/A venue can have/)).toBeNull();
  });

  it('flags a repeated sub category on the later row as soon as it is picked', async () => {
    mount({ mode: 'register', defaults: { venue_categories: [COFFEE, HALF_PICKED] } });
    expect(screen.queryByText('This sub category is already added above')).toBeNull();

    const second = within(screen.getByRole('group', { name: 'Category 2' }));
    fireEvent.keyDown(second.getByRole('combobox', { name: /Sub Category/ }), { key: 'ArrowDown' });
    fireEvent.click(await screen.findByRole('option', { name: 'Coffee' }));

    expect(await second.findByText('This sub category is already added above')).toBeTruthy();
    expect(
      within(screen.getByRole('group', { name: 'Category 1' })).queryByText('This sub category is already added above')
    ).toBeNull();
  });
});

describe('VenueDetailsSection — location cascade', () => {
  it('replaces the whole address block when a different country is picked', async () => {
    const formRef = mount({
      mode: 'register',
      defaults: {
        location_id: 'loc-1',
        state: 'Karnataka',
        state_code: 'KA',
        city: 'Bengaluru',
        locality: 'Indiranagar',
        postal_code: '560038',
      },
    });

    const country = screen.getByRole('combobox', { name: /Country/ });
    fireEvent.keyDown(country, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('United Arab Emirates'));

    await waitFor(() => expect(formRef.current?.getValues('country_code')).toBe('AE'));
    expect(formRef.current?.getValues()).toMatchObject({
      country: 'United Arab Emirates',
      state: '',
      state_code: '',
      city: '',
      location_id: '',
      locality: '',
      postal_code: '',
    });
  });
});

describe('VenueDetailsSection — images', () => {
  it('stores the picked cover image and flips the button to "Change cover image"', async () => {
    const formRef = mount({ mode: 'register' });

    fireEvent.click(screen.getByRole('button', { name: 'Upload cover image' }));
    fireEvent.click(screen.getByRole('button', { name: 'pick from Upload cover image' }));

    await waitFor(() => expect(formRef.current?.getValues('cover_image_url')).toBe(PICKED_IMAGE));
    expect(screen.getByRole('button', { name: 'Change cover image' })).toBeTruthy();
  });

  it('appends a picked gallery image to the existing gallery', async () => {
    const existing = 'https://cdn.example.com/g1.jpg';
    const formRef = mount({ mode: 'register', defaults: { gallery: [existing] } });

    fireEvent.click(screen.getByRole('button', { name: 'Add image' }));
    fireEvent.click(screen.getByRole('button', { name: 'pick from Add venue image' }));

    await waitFor(() => expect(formRef.current?.getValues('gallery')).toEqual([existing, PICKED_IMAGE]));
  });
});

describe('VenueDetailsSection — videos', () => {
  const LINK = 'https://youtu.be/dQw4w9WgXcQ';
  const CLIP = 'https://ik.imagekit.io/duncit/staging/venues/venue-1/videos/tour.mp4';

  it('adds a pasted YouTube link to the venue’s videos', async () => {
    const formRef = mount({ mode: 'register', videoLimit: 3 });

    expect(screen.getByText('Videos (0 of 3)')).toBeTruthy();
    fireEvent.change(screen.getByTestId('register-venue-videos-youtube'), { target: { value: LINK } });
    fireEvent.click(screen.getByTestId('register-venue-videos-youtube-add'));

    await waitFor(() => expect(formRef.current?.getValues('videos')).toEqual([LINK]));
    expect(screen.getByText('Videos (1 of 3)')).toBeTruthy();
  });

  it('refuses a link that is not a YouTube video, and keeps the list as it was', async () => {
    const formRef = mount({ mode: 'register', videoLimit: 3 });

    fireEvent.change(screen.getByTestId('register-venue-videos-youtube'), { target: { value: 'https://example.com/a' } });
    fireEvent.click(screen.getByTestId('register-venue-videos-youtube-add'));

    expect(await screen.findByText('Enter a YouTube video link (watch, shorts or youtu.be)')).toBeTruthy();
    expect(formRef.current?.getValues('videos')).toEqual([]);
  });

  it('lists the stored videos and removes the one asked to', async () => {
    const formRef = mount({ mode: 'register', videoLimit: 3, defaults: { videos: [LINK, CLIP] } });

    expect(screen.getByText('YouTube video 1')).toBeTruthy();
    expect(screen.getByText('Uploaded video 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove video 1' }));

    await waitFor(() => expect(formRef.current?.getValues('videos')).toEqual([CLIP]));
  });

  it('stops adding at the video limit from the config', () => {
    mount({ mode: 'register', videoLimit: 2, defaults: { venue_name: 'Cafe Mocha', videos: [LINK, CLIP] } });

    expect(screen.getByRole('button', { name: 'Upload a video of Cafe Mocha' })).toHaveProperty('disabled', true);
    expect(screen.queryByTestId('register-venue-videos-youtube')).toBeNull();
  });

  it('keeps videos editable on an approved venue, like its images', () => {
    mount({ mode: 'edit-approved', videoLimit: 3, venueId: 'venue-1', defaults: { venue_name: 'Cafe Mocha' } });

    expect(screen.getByRole('button', { name: 'Upload a video of Cafe Mocha' })).toHaveProperty('disabled', false);
    expect(screen.getByTestId('register-venue-videos-youtube')).toHaveProperty('disabled', false);
  });
});

describe('VenueDetailsSection — field messages replace the hints', () => {
  it('shows the description and address errors once the section is validated', async () => {
    const formRef = mount({ mode: 'register', defaults: { address_line2: 'x'.repeat(201) } });

    await act(async () => {
      await formRef.current?.trigger(['description', 'address_line1', 'address_line2', 'cover_image_url']);
    });

    expect(await screen.findByText('Venue description is required')).toBeTruthy();
    expect(screen.getByText('Address line 1 must be at least 3 characters')).toBeTruthy();
    expect(screen.getByText('Upload a cover image')).toBeTruthy();
    expect(screen.queryByText('Tell hosts what makes your space great (max 2000 characters)')).toBeNull();
    expect(screen.queryByText('Building / street — shown on the venue page')).toBeNull();
    expect(screen.queryByText('Landmark or floor (optional)')).toBeNull();
  });

  it('re-validates the category triple as it is picked once it has failed', async () => {
    const formRef = mount({ mode: 'register', defaults: { venue_categories: [HALF_PICKED] } });

    await act(async () => {
      await formRef.current?.trigger(['venue_categories']);
    });
    expect(await screen.findByText('Select the super category, category and sub category.')).toBeTruthy();

    fireEvent.keyDown(screen.getByRole('combobox', { name: /Sub Category/ }), { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('Coffee'));

    await waitFor(() =>
      expect(screen.queryByText('Select the super category, category and sub category.')).toBeNull()
    );
  });
});
