import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import BrandCommercePanel from '../../src/pages/catalog-brands/BrandCommercePanel';
import type { CatalogBrandDetail } from '../../src/pages/catalog-brands/queries';

const m = vi.hoisted(() => ({
  setCommission: vi.fn(),
  commissionState: { loading: false },
  setActive: vi.fn(),
  activeState: { loading: false },
}));

vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return {
    ...actual,
    useMutation: (doc: any) => {
      const name = doc?.definitions?.[0]?.name?.value;
      if (name === 'SetBrandCommission') return [m.setCommission, m.commissionState];
      return [m.setActive, m.activeState];
    },
  };
});

vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

const makeBrand = (over: Partial<CatalogBrandDetail> = {}): CatalogBrandDetail => ({
  id: 'b1',
  brand_name: 'Acme Attire',
  status: 'APPROVED',
  is_active: true,
  approved_product_count: 2,
  product_commission_pct: 12,
  ...over,
});

const renderPanel = (brand: CatalogBrandDetail, onChanged = vi.fn()) => {
  render(<BrandCommercePanel brand={brand} onChanged={onChanged} />);
  return onChanged;
};

beforeEach(() => {
  m.setCommission = vi.fn().mockResolvedValue({});
  m.setActive = vi.fn().mockResolvedValue({});
  m.commissionState = { loading: false };
  m.activeState = { loading: false };
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notifyError).mockClear();
});

describe('BrandCommercePanel commission', () => {
  it('seeds the current percentage and saves an edited one', async () => {
    const onChanged = renderPanel(makeBrand());
    const input = screen.getByDisplayValue('12');
    fireEvent.change(input, { target: { value: '7.5' } });
    fireEvent.click(screen.getByRole('button', { name: /save commission/i }));
    await waitFor(() =>
      expect(m.setCommission).toHaveBeenCalledWith({
        variables: { id: 'b1', product_commission_pct: 7.5 },
      }),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Brand commission updated');
    expect(onChanged).toHaveBeenCalled();
  });

  it('blocks an out-of-range percentage before it reaches the server', async () => {
    renderPanel(makeBrand());
    fireEvent.change(screen.getByDisplayValue('12'), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: /save commission/i }));
    await waitFor(() =>
      expect(screen.getByText('Commission cannot exceed 100')).toBeInTheDocument(),
    );
    expect(m.setCommission).not.toHaveBeenCalled();
  });

  it('surfaces the server message when the commission save fails', async () => {
    m.setCommission = vi.fn().mockRejectedValue(new Error('commission must be between 0 and 100'));
    renderPanel(makeBrand());
    fireEvent.click(screen.getByRole('button', { name: /save commission/i }));
    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith('commission must be between 0 and 100'),
    );
  });

  it('shows progress copy while the commission is saving', () => {
    m.commissionState = { loading: true };
    renderPanel(makeBrand());
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});

describe('BrandCommercePanel visibility', () => {
  it('deactivates an active brand after confirmation', async () => {
    const onChanged = renderPanel(makeBrand());
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Deactivate brand')).toBeInTheDocument();
    expect(within(dialog).getByText(/hidden from the marketplace/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() =>
      expect(m.setActive).toHaveBeenCalledWith({ variables: { id: 'b1', active: false } }),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Brand deactivated');
    expect(onChanged).toHaveBeenCalled();
  });

  it('reactivates a deactivated brand after confirmation', async () => {
    renderPanel(makeBrand({ is_active: false }));
    fireEvent.click(screen.getByRole('button', { name: 'Activate' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Activate brand')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Activate' }));
    await waitFor(() =>
      expect(m.setActive).toHaveBeenCalledWith({ variables: { id: 'b1', active: true } }),
    );
    expect(notifySuccess).toHaveBeenCalledWith('Brand activated');
  });

  it('surfaces the server message when the toggle fails', async () => {
    m.setActive = vi.fn().mockRejectedValue(new Error('brand is locked'));
    renderPanel(makeBrand());
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('brand is locked'));
  });

  it('closes the confirmation without touching the brand', async () => {
    renderPanel(makeBrand());
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(m.setActive).not.toHaveBeenCalled();
  });

  it('disables the confirmation while the toggle is in flight', () => {
    m.activeState = { loading: true };
    renderPanel(makeBrand());
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(screen.getByRole('button', { name: 'Working…' })).toBeDisabled();
  });
});
