import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import EcommMarketplacePage from '../../src/pages/ecomm/EcommMarketplacePage';
import { renderWithProviders } from './testkit';
import { __setTableRows } from './table-mock';

const nav = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => nav.fn,
}));
vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({ useDateFormat: () => ({ formatDate: () => 'D' }) }));
vi.mock('@duncit/ui', () => ({ StatusChip: ({ status }: { status: string }) => <span>{status}</span> }));

describe('EcommMarketplacePage', () => {
  it('lists brands and navigates to a brand on click', async () => {
    __setTableRows([
      {
        id: 'b9',
        brand_name: 'Zeta',
        logo_url: '',
        status: 'APPROVED',
        approved_product_count: 1,
        default_pickup_location_id: null,
        city: 'Delhi',
        state: '',
        contact_email: 'z@x.com',
        contact_phone: '',
        created_at: null,
      },
    ]);
    renderWithProviders(<EcommMarketplacePage />);
    expect(screen.getByText('E-commerce brands')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Zeta').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('Zeta')[0]);
    expect(nav.fn).toHaveBeenCalledWith('/ecomm/brands/b9');
  });
});
