import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BrandsReviewTable from '../../src/pages/ecomm/BrandsReviewTable';
import type {
  BrandIntegrationProvider,
  BrandIntegrationStatus,
  EcommBrandRow,
} from '../../src/pages/ecomm/queries';
import { makeEcommBrandRow } from '../mocks/ecommBrand.mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDate: (v: unknown) => (v ? 'D' : '') }),
}));
vi.mock('@duncit/ui', () => ({
  StatusChip: ({ status }: { status: string }) => <span>{status}</span>,
}));

const integration = (provider: BrandIntegrationProvider, connected = false): BrandIntegrationStatus => ({
  provider,
  configured: connected,
  connected,
  checked_at: null,
  message: '',
  details: [],
  identifier: '',
  has_secret: connected,
  pickup_location: '',
  live_mode: false,
  has_webhook_secret: false,
});

/** A row as `ecommBrandsTable` returns it: wizard progress, integrations and consent included. */
const reviewRow = (over: Partial<EcommBrandRow> = {}): EcommBrandRow =>
  makeEcommBrandRow({
    completion: { percent: 60, next_step: 3, steps: [] },
    integrations: { shiprocket: integration('SHIPROCKET'), razorpay: integration('RAZORPAY') },
    consent: {
      accepted: false,
      signed_name: '',
      signed_at: null,
      policy_slug: '',
      policy_title: '',
      content_hash: '',
      current: false,
      available: true,
    },
    ...over,
  });

describe('BrandsReviewTable', () => {
  it('renders brand, contact, location and pickup-registered cells', async () => {
    render(
      <BrandsReviewTable
        fetchRows={async () => ({
          rows: [
            reviewRow(),
            reviewRow({ id: 'b3', logo_url: 'http://img/l.png', brand_name: '' }),
          ],
          total: 2,
        })}
        refetchRef={{ current: null }}
        onView={vi.fn()}
        onReview={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));
    expect(screen.getAllByText('sales@acme.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pune, MH').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Registered').length).toBeGreaterThan(0);
  });

  it('shows the "No default" pickup and a location dash when unset', async () => {
    render(
      <BrandsReviewTable
        fetchRows={async () => ({
          rows: [
            reviewRow({
              id: 'b2',
              default_pickup_location_id: null,
              city: '',
              state: '',
              contact_email: '',
              contact_phone: '',
              submitted_at: null,
              created_at: null,
            }),
          ],
          total: 1,
        })}
        refetchRef={{ current: null }}
        onView={vi.fn()}
        onReview={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('No default').length).toBeGreaterThan(0));
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('shows wizard completion and which integrations are connected', async () => {
    render(
      <BrandsReviewTable
        fetchRows={async () => ({
          rows: [
            reviewRow({ id: 'b1' }),
            reviewRow({
              id: 'b2',
              brand_name: 'Beta',
              completion: { percent: 100, next_step: 10, steps: [] },
              integrations: {
                shiprocket: integration('SHIPROCKET', true),
                razorpay: integration('RAZORPAY'),
              },
            }),
          ],
          total: 2,
        })}
        refetchRef={{ current: null }}
        onView={vi.fn()}
        onReview={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    const [first, second] = screen.getAllByTestId('cell-completion');
    expect(first).toHaveTextContent('60%');
    expect(second).toHaveTextContent('100%');
    const [none, shiprocketOnly] = screen.getAllByTestId('cell-integrations');
    expect(none).toHaveTextContent('Not connected');
    expect(shiprocketOnly).toHaveTextContent('ShipRocket');
    expect(shiprocketOnly).not.toHaveTextContent('Razorpay');
  });

  it('opens a brand on row click', async () => {
    const onView = vi.fn();
    render(
      <BrandsReviewTable
        fetchRows={async () => ({ rows: [reviewRow()], total: 1 })}
        refetchRef={{ current: null }}
        onView={onView}
        onReview={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('Acme')[0]);
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
  });

  it('reviews from the row action without opening the brand', async () => {
    const onView = vi.fn();
    const onReview = vi.fn();
    render(
      <BrandsReviewTable
        fetchRows={async () => ({ rows: [reviewRow()], total: 1 })}
        refetchRef={{ current: null }}
        onView={onView}
        onReview={onReview}
      />,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Options for Acme' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Options for Acme' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Review' }));
    expect(onReview).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
    expect(onView).not.toHaveBeenCalled();
  });

  it('opens the brand details from the row menu', async () => {
    const onView = vi.fn();
    render(
      <BrandsReviewTable
        fetchRows={async () => ({ rows: [reviewRow()], total: 1 })}
        refetchRef={{ current: null }}
        onView={onView}
        onReview={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Options for Acme' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Options for Acme' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Brand details, analytics & logs' }));
    expect(onView).toHaveBeenCalledTimes(1);
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
  });
});
