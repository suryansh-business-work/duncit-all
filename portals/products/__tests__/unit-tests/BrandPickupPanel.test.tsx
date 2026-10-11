import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, screen, fireEvent, waitFor } from '@testing-library/react';
import BrandPickupPanel from '../../src/pages/ecomm/BrandPickupPanel';
import { renderWithProviders } from '../testkit';
import {
  brandPickupLocationsMock,
  deleteBrandPickupMock,
  makeBrandPickupLocation,
  registerBrandPickupMock,
  saveBrandPickupMock,
  setBrandPickupActiveMock,
  setDefaultBrandPickupMock,
} from '../mocks/pickup.mock';

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

const location = makeBrandPickupLocation();

beforeEach(() => {
  dialogs.success.mockReset();
  dialogs.error.mockReset();
  form.props = null;
});

describe('BrandPickupPanel', () => {
  it('shows the empty state when there are no locations', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, { mocks: [brandPickupLocationsMock([])] });
    await waitFor(() =>
      expect(screen.getByText(/No pickup locations yet/i)).toBeInTheDocument(),
    );
  });

  it('opens and closes the create dialog', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, { mocks: [brandPickupLocationsMock([])] });
    await waitFor(() => expect(screen.getByText(/No pickup locations yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Add pickup address' }));
    expect(screen.getByTestId('pickup-form')).toHaveTextContent('Add pickup address');
    // Closing the form runs the panel's onClose handler.
    act(() => form.props?.onClose());
    await waitFor(() => expect(screen.queryByTestId('pickup-form')).not.toBeInTheDocument());
  });

  it('lists locations and edits one', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, { mocks: [brandPickupLocationsMock([location])] });
    await waitFor(() => expect(screen.getByText('Main WH')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByTestId('pickup-form')).toHaveTextContent('Edit pickup address');
  });

  it('saves a submitted location and notifies success', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, {
      mocks: [brandPickupLocationsMock([location]), saveBrandPickupMock()],
    });
    await waitFor(() => expect(screen.getByText('Main WH')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Add pickup address' }));
    await form.props?.onSubmit({ nickname: 'Main WH' });
    await waitFor(() => expect(dialogs.success).toHaveBeenCalledWith('Pickup location saved'));
  });

  it('saves an edited location using its existing id', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, {
      mocks: [brandPickupLocationsMock([location]), saveBrandPickupMock()],
    });
    await waitFor(() => expect(screen.getByText('Main WH')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await form.props?.onSubmit({ nickname: 'Main WH Edited' });
    await waitFor(() => expect(dialogs.success).toHaveBeenCalledWith('Pickup location saved'));
  });

  it('registers a location via runAction and notifies success', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, {
      mocks: [brandPickupLocationsMock([location]), registerBrandPickupMock()],
    });
    await waitFor(() => expect(screen.getByText('Main WH')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Register with ShipRocket/i }));
    await waitFor(() =>
      expect(dialogs.success).toHaveBeenCalledWith('Registered with ShipRocket'),
    );
  });

  it('reports a failed action via notifyError', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, {
      mocks: [brandPickupLocationsMock([location]), deleteBrandPickupMock({ fail: true })],
    });
    await waitFor(() => expect(screen.getByText('Main WH')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialogs.error).toHaveBeenCalled());
  });

  it('sets a default location', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, {
      mocks: [brandPickupLocationsMock([location]), setDefaultBrandPickupMock()],
    });
    await waitFor(() => expect(screen.getByText('Main WH')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('StarBorderIcon').closest('button') as HTMLElement);
    await waitFor(() =>
      expect(dialogs.success).toHaveBeenCalledWith('Primary pickup address updated'),
    );
  });

  it('switches an address off through its Active switch and says it can no longer be chosen', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, {
      mocks: [brandPickupLocationsMock([location]), setBrandPickupActiveMock(false)],
    });
    await waitFor(() => expect(screen.getByText('Main WH')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('switch', { name: 'Active — switch off to disable this pickup address' }));
    await waitFor(() =>
      expect(dialogs.success).toHaveBeenCalledWith(
        'Pickup address is now inactive — it can no longer be chosen for a product',
      ),
    );
    expect(dialogs.error).not.toHaveBeenCalled();
  });

  it('switches an inactive address back on', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, {
      mocks: [
        brandPickupLocationsMock([makeBrandPickupLocation({ is_active: false })]),
        setBrandPickupActiveMock(true),
      ],
    });
    await waitFor(() => expect(screen.getByText('Main WH')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('switch', { name: 'Inactive — switch on to enable this pickup address' }));
    await waitFor(() => expect(dialogs.success).toHaveBeenCalledWith('Pickup address is active again'));
  });

  it('shows the server’s reason when an address still in use cannot be switched off', async () => {
    const refusal =
      'This pickup address cannot be disabled — 1 product(s) ship from it. Move them to another pickup address first: Masala Chai.';
    renderWithProviders(<BrandPickupPanel brandId="b1" />, {
      mocks: [brandPickupLocationsMock([location]), setBrandPickupActiveMock(false, { refusal })],
    });
    await waitFor(() => expect(screen.getByText('Main WH')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('switch', { name: 'Active — switch off to disable this pickup address' }));
    await waitFor(() => expect(dialogs.error).toHaveBeenCalledWith(refusal));
    expect(dialogs.success).not.toHaveBeenCalled();
  });

  it('surfaces a query error', async () => {
    renderWithProviders(<BrandPickupPanel brandId="b1" />, {
      mocks: [brandPickupLocationsMock([], { error: true })],
    });
    await waitFor(() => expect(screen.getByText('load failed')).toBeInTheDocument());
  });
});
