import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import BrandPickupPanel from '../../src/pages/ecomm/BrandPickupPanel';
import {
  BRAND_PICKUP_LOCATIONS,
  DELETE_BRAND_PICKUP_LOCATION,
  REGISTER_BRAND_PICKUP_WITH_SHIPROCKET,
  SAVE_BRAND_PICKUP_LOCATION,
  SET_DEFAULT_BRAND_PICKUP_LOCATION,
} from '../../src/pages/ecomm/queries';
import { renderWithProviders } from './testkit';

const dialogs = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@duncit/dialogs', () => ({
  notifySuccess: (...a: unknown[]) => dialogs.success(...a),
  notifyError: (...a: unknown[]) => dialogs.error(...a),
}));

const form = vi.hoisted(() => ({ props: null as null | Record<string, any> }));
vi.mock('../../src/pages/ecomm/pickup-location-form', () => ({
  PickupLocationForm: (props: Record<string, any>) => {
    form.props = props;
    return props.open ? <div data-testid="pickup-form">{props.title}</div> : null;
  },
  toFormValues: (x: unknown) => x ?? {},
  toSubmitInput: (values: unknown) => ({ ...(values as object) }),
}));

const location = {
  id: 'l1',
  nickname: 'Main WH',
  is_default: false,
  shiprocket_registered: false,
  contact_name: 'Asha',
  phone: '9999',
  address_line1: '12 MG Rd',
  city: 'Pune',
  state: 'MH',
  pincode: '411001',
};

const locationsMock = (rows: unknown[]): MockedResponse => ({
  request: { query: BRAND_PICKUP_LOCATIONS, variables: { owner_kind: 'BRAND', brand_doc_id: 'b1' } },
  result: { data: { brandPickupLocations: rows } },
  maxUsageCount: 20,
});
const okMutation = (query: any, data: Record<string, unknown>): MockedResponse => ({
  request: { query },
  variableMatcher: () => true,
  result: { data },
  maxUsageCount: 20,
});

beforeEach(() => {
  dialogs.success.mockReset();
  dialogs.error.mockReset();
  form.props = null;
});

describe('BrandPickupPanel', () => {
  it('shows the empty state when there are no locations', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, { mocks: [locationsMock([])] });
    await waitFor(() =>
      expect(screen.getByText(/No pickup locations yet/i)).toBeInTheDocument(),
    );
  });

  it('opens the create dialog from the Add button', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, { mocks: [locationsMock([])] });
    await waitFor(() => expect(screen.getByText(/No pickup locations yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Add location/i }));
    expect(screen.getByText('Add pickup location')).toBeInTheDocument();
  });

  it('lists locations and edits one', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, { mocks: [locationsMock([location])] });
    await waitFor(() => expect(screen.getByText('Main WH')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText('Edit pickup location')).toBeInTheDocument();
  });

  it('saves a submitted location and notifies success', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, {
      mocks: [
        locationsMock([location]),
        okMutation(SAVE_BRAND_PICKUP_LOCATION, { saveBrandPickupLocation: { id: 'l1' } }),
      ],
    });
    await waitFor(() => expect(screen.getByText('Main WH')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Add location/i }));
    await form.props?.onSubmit({ nickname: 'Main WH' });
    await waitFor(() => expect(dialogs.success).toHaveBeenCalledWith('Pickup location saved'));
  });

  it('saves an edited location using its existing id', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, {
      mocks: [
        locationsMock([location]),
        okMutation(SAVE_BRAND_PICKUP_LOCATION, { saveBrandPickupLocation: { id: 'l1' } }),
      ],
    });
    await waitFor(() => expect(screen.getByText('Main WH')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await form.props?.onSubmit({ nickname: 'Main WH Edited' });
    await waitFor(() => expect(dialogs.success).toHaveBeenCalledWith('Pickup location saved'));
  });

  it('registers a location via runAction and notifies success', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, {
      mocks: [
        locationsMock([location]),
        okMutation(REGISTER_BRAND_PICKUP_WITH_SHIPROCKET, {
          registerBrandPickupWithShiprocket: { id: 'l1' },
        }),
      ],
    });
    await waitFor(() => expect(screen.getByText('Main WH')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Register with ShipRocket/i }));
    await waitFor(() =>
      expect(dialogs.success).toHaveBeenCalledWith('Registered with ShipRocket'),
    );
  });

  it('reports a failed action via notifyError', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, {
      mocks: [
        locationsMock([location]),
        {
          request: { query: DELETE_BRAND_PICKUP_LOCATION },
          variableMatcher: () => true,
          result: { errors: [{ message: 'delete failed' }] },
          maxUsageCount: 20,
        },
      ],
    });
    await waitFor(() => expect(screen.getByText('Main WH')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialogs.error).toHaveBeenCalled());
  });

  it('sets a default location', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, {
      mocks: [
        locationsMock([location]),
        okMutation(SET_DEFAULT_BRAND_PICKUP_LOCATION, {
          setDefaultBrandPickupLocation: { id: 'l1' },
        }),
      ],
    });
    await waitFor(() => expect(screen.getByText('Main WH')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('StarBorderIcon').closest('button') as HTMLElement);
    await waitFor(() =>
      expect(dialogs.success).toHaveBeenCalledWith('Default pickup location updated'),
    );
  });

  it('surfaces a query error', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, {
      mocks: [
        {
          request: {
            query: BRAND_PICKUP_LOCATIONS,
            variables: { owner_kind: 'BRAND', brand_doc_id: 'b1' },
          },
          result: { errors: [{ message: 'load failed' }] },
        },
      ],
    });
    await waitFor(() => expect(screen.getByText('load failed')).toBeInTheDocument());
  });
});
