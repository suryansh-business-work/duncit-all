import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import BrandsReviewPage from '../../src/pages/ecomm/BrandsReviewPage';
import { renderWithProviders } from '../testkit';
import {
  approveEcommBrandMock,
  makeEcommBrandRow,
  rejectEcommBrandMock,
} from '../mocks/ecommBrand.mock';
import { __setTableRows } from './table-mock';

const nav = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => nav.fn,
}));
vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()), useDateFormat: () => ({ formatDate: () => 'D' }) }));

const integration = (provider: 'SHIPROCKET' | 'RAZORPAY') => ({
  provider,
  configured: false,
  connected: false,
  checked_at: null,
  message: '',
  details: [],
  identifier: '',
  has_secret: false,
  pickup_location: '',
  live_mode: false,
  has_webhook_secret: false,
});

/** A brand a partner just submitted — the row that never used to reach this page.
 * The wizard is complete and the consent signed, so Approve is allowed. */
const submittedRow = () =>
  makeEcommBrandRow({
    id: 'b9',
    brand_name: 'Zeta',
    status: 'SUBMITTED',
    reviewer_notes: '',
    tags: [],
    approved_product_count: 0,
    default_pickup_location_id: null,
    created_at: null,
    submitted_at: null,
    completion: {
      percent: 100,
      next_step: 10,
      steps: [{ key: 'details', required: true, complete: true }],
    },
    integrations: { shiprocket: integration('SHIPROCKET'), razorpay: integration('RAZORPAY') },
    consent: {
      accepted: true,
      signed_name: 'Asha',
      signed_at: '2026-10-01T10:00:00.000Z',
      policy_slug: 'brand-partner-consent',
      policy_title: 'Brand Consent',
      content_hash: 'a1b2',
      current: true,
      available: true,
    },
  });

const openReviewDialog = async () => {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Options for Zeta' })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Options for Zeta' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Review' }));
  await screen.findByLabelText('Reviewer notes');
};

describe('BrandsReviewPage', () => {
  it('opens on the SUBMITTED tab so partner submissions are the default view', async () => {
    __setTableRows([submittedRow()]);
    renderWithProviders(<BrandsReviewPage />);
    expect(screen.getByText('Brands Review')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SUBMITTED' })).toHaveClass('Mui-selected');
    await waitFor(() => expect(screen.getAllByText('Zeta').length).toBeGreaterThan(0));
  });

  it('opens a brand on row click and reviews without navigating', async () => {
    __setTableRows([submittedRow()]);
    renderWithProviders(<BrandsReviewPage />);
    await waitFor(() => expect(screen.getAllByText('Zeta').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('Zeta')[0]);
    expect(nav.fn).toHaveBeenCalledWith('/ecomm/brands/b9');

    nav.fn.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Options for Zeta' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Review' }));
    await screen.findByLabelText('Reviewer notes');
    // The row menu stops the row click from also opening the brand.
    expect(nav.fn).not.toHaveBeenCalled();
  });

  it('approves a submitted brand and reports it', async () => {
    __setTableRows([submittedRow()]);
    renderWithProviders(<BrandsReviewPage />, { mocks: [approveEcommBrandMock()] });
    await openReviewDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, approve' }));
    const success = await screen.findByText(/Zeta approved\./i);
    // The success Alert's close button lives in the alert's action slot.
    const closeBtn = success.closest('.MuiAlert-root')?.querySelector('button');
    fireEvent.click(closeBtn as HTMLElement);
    await waitFor(() => expect(screen.queryByText(/Zeta approved\./i)).not.toBeInTheDocument());
  });

  it('blocks a reject until notes are written, then rejects', async () => {
    __setTableRows([submittedRow()]);
    renderWithProviders(<BrandsReviewPage />, { mocks: [rejectEcommBrandMock()] });
    await openReviewDialog();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reviewer notes'), {
      target: { value: 'missing GSTIN' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, reject' }));
    expect(await screen.findByText(/Zeta rejected\./i)).toBeInTheDocument();
  });

  it('switches the status tabs, including ALL', async () => {
    __setTableRows([]);
    renderWithProviders(<BrandsReviewPage />);
    fireEvent.click(screen.getByRole('button', { name: 'REJECTED' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'REJECTED' })).toHaveClass('Mui-selected'),
    );
    // The ALL tab exercises the empty extra-filters branch.
    fireEvent.click(screen.getByRole('button', { name: 'ALL' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'ALL' })).toHaveClass('Mui-selected'),
    );
  });

  it('closes the review dialog on cancel', async () => {
    __setTableRows([submittedRow()]);
    renderWithProviders(<BrandsReviewPage />);
    await openReviewDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
