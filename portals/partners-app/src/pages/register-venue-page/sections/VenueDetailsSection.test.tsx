import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ADMIN_CATEGORIES } from '@duncit/category';
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

interface HarnessProps {
  mode: RegisterVenueMode;
  defaults?: Partial<RegisterVenueValues>;
  formRef: { current: UseFormReturn<RegisterVenueValues> | null };
}

function Harness({ mode, defaults, formRef }: Readonly<HarnessProps>) {
  const form = useForm<RegisterVenueValues, any, RegisterVenueValues>({
    resolver: zodResolver(registerVenueSchema),
    defaultValues: { ...blankRegisterVenueValues, ...defaults },
    mode: 'onBlur',
  });
  formRef.current = form;
  return <VenueDetailsSection form={form} mode={mode} />;
}

const mount = (props: Omit<HarnessProps, 'formRef'>) => {
  const formRef: HarnessProps['formRef'] = { current: null };
  render(
    <MockedProvider mocks={mocks}>
      <Harness {...props} formRef={formRef} />
    </MockedProvider>
  );
  return formRef;
};

describe('VenueDetailsSection — editable identity fields', () => {
  it('writes the typed name and description into the form and shows the register hints', async () => {
    const formRef = mount({ mode: 'register' });

    fireEvent.change(screen.getByLabelText(/Venue name/), { target: { value: 'Cafe Mocha' } });
    fireEvent.change(screen.getByLabelText('Venue description'), { target: { value: 'A cosy corner cafe' } });

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
    expect(screen.getByLabelText('Venue description')).toHaveProperty('disabled', false);
    expect(screen.getAllByText('Locked after approval')).toHaveLength(3);
    expect(screen.queryByText('Public name shown to hosts and guests')).toBeNull();
  });
});

describe('VenueDetailsSection — validation surfaced to the shared pickers', () => {
  it('shows one category message once the category triple fails validation', async () => {
    const formRef = mount({ mode: 'register' });
    expect(screen.queryByText('Select the super category, category and sub category.')).toBeNull();

    await act(async () => {
      await formRef.current?.trigger(['super_category_id', 'category_id', 'sub_category_id']);
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
      defaults: { super_category_id: 'old-super', category_id: 'cat-1', sub_category_id: 'sub-1' },
    });

    const superSelect = screen.getByRole('combobox', { name: /Super Category/ });
    fireEvent.keyDown(superSelect, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('Food'));

    await waitFor(() => expect(formRef.current?.getValues('super_category_id')).toBe('sup-1'));
    expect(formRef.current?.getValues('category_id')).toBe('');
    expect(formRef.current?.getValues('sub_category_id')).toBe('');
  });

  it('keeps the super category when a sub category is picked', async () => {
    const formRef = mount({ mode: 'register', defaults: { super_category_id: 'sup-1', category_id: 'cat-1' } });

    const subSelect = screen.getByRole('combobox', { name: /Sub Category/ });
    fireEvent.keyDown(subSelect, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('Coffee'));

    await waitFor(() => expect(formRef.current?.getValues('sub_category_id')).toBe('sub-1'));
    expect(formRef.current?.getValues('super_category_id')).toBe('sup-1');
    expect(formRef.current?.getValues('category_id')).toBe('cat-1');
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
