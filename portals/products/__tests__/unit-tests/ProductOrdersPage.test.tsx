import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ProductOrdersPage from '../../src/pages/orders/ProductOrdersPage';
import { renderWithProviders } from './testkit';
import { __setTableRows } from './table-mock';

const nav = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => nav.fn,
}));
vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ formatDateTime: (v: unknown) => (v ? 'DT' : '') }),
}));
vi.mock('@duncit/ui', () => ({
  StatusChip: ({ label }: { label: string }) => <span>{label}</span>,
}));

describe('ProductOrdersPage', () => {
  it('renders the heading and navigates to a clicked order', async () => {
    __setTableRows([
      {
        id: 'o1',
        order_no: 'PO-42',
        buyer_name: 'Asha',
        buyer_email: 'a@x.com',
        pod: null,
        currency_symbol: '₹',
        total: 100,
        fulfilment_method: 'PICKUP',
        fulfilment_status: 'PENDING',
        shiprocket: null,
        created_at: null,
      },
    ]);
    renderWithProviders(<ProductOrdersPage />);
    expect(screen.getByText('Product orders')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('PO-42').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('PO-42')[0]);
    expect(nav.fn).toHaveBeenCalledWith('/orders/o1');
  });
});
