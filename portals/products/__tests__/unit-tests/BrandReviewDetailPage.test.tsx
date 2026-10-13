import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import type { BrandIntegrationStatus, EcommBrand } from '@duncit/gql-types';
import { Route } from 'react-router';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { notifyError } from '@duncit/dialogs';
import BrandReviewDetailPage from '../../src/pages/ecomm/brand-review-detail';
import { renderWithProviders } from '../testkit';
import { ECOMM_BRAND } from '../../src/pages/ecomm/queries';
import { approveEcommBrandMock, ecommBrandMock, makeEcommBrand } from '../mocks/ecommBrand.mock';

vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
}));
vi.mock('../../src/pages/ecomm/BrandProductsTable', () => ({
  default: () => <div>PRODUCTS TABLE</div>,
}));
vi.mock('../../src/pages/ecomm/BrandPickupPanel', () => ({
  default: () => <div>PICKUP PANEL</div>,
}));
// The analytics and logs panels are shared shell components with their own
// queries and suites; here they only need to be mounted for this brand.
vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  BrandAnalyticsPanel: ({ brandId }: { brandId: string }) => <div>ANALYTICS {brandId}</div>,
  BrandLogsPanel: ({ brandId }: { brandId: string }) => <div>LOGS {brandId}</div>,
}));

const integration = (provider: 'SHIPROCKET' | 'RAZORPAY'): BrandIntegrationStatus => ({
  __typename: 'BrandIntegrationStatus',
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
  sandbox: false,
});

/** The review-only fields `ecommBrand` selects on top of the shared factory. */
const reviewBrand = (over: Partial<EcommBrand> = {}): EcommBrand =>
  makeEcommBrand({
    live: true,
    integration_waived: false,
    established_year: null,
    approved_at: null,
    rejected_at: null,
    completion: {
      __typename: 'BrandCompletion',
      percent: 100,
      next_step: 0,
      steps: [{ __typename: 'BrandStepState', key: 'basics', complete: true, required: true }],
    },
    integrations: {
      __typename: 'BrandIntegrations',
      shiprocket: integration('SHIPROCKET'),
      razorpay: integration('RAZORPAY'),
    },
    consent: {
      __typename: 'BrandConsent',
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

const renderPage = (mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: ['/ecomm/brands/b1'],
    routes: <Route path="/ecomm/brands/:brandId" element={<BrandReviewDetailPage />} />,
  });

describe('BrandReviewDetailPage', () => {
  it('renders the brand card, sections and back navigation', async () => {
    renderPage([ecommBrandMock(reviewBrand())]);
    await waitFor(() => expect(screen.getByText('Acme')).toBeInTheDocument());
    expect(screen.getByText('5 approved products')).toBeInTheDocument();
    expect(screen.getByText('Pune, MH · sales@acme.com')).toBeInTheDocument();
    expect(screen.getByText('PRODUCTS TABLE')).toBeInTheDocument();
    expect(screen.getByText('PICKUP PANEL')).toBeInTheDocument();
    expect(screen.getByText('ANALYTICS b1')).toBeInTheDocument();
    expect(screen.getByText('LOGS b1')).toBeInTheDocument();
    expect(screen.getByText('Not signed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Brands Review/i })).toHaveAttribute('href', '/ecomm/brands');
    // An approved brand has already been reviewed, so no Review action.
    expect(screen.queryByTestId('brand-review-open')).not.toBeInTheDocument();
  });

  it('opens a brand that is still awaiting review', async () => {
    // The whole point of the fix: a SUBMITTED brand is approved-only invisible
    // to the marketplace queries, so this page must not use them.
    renderPage([ecommBrandMock(reviewBrand({ brand_name: 'Pending Co', status: 'SUBMITTED', live: false }))]);
    await waitFor(() => expect(screen.getByText('Pending Co')).toBeInTheDocument());
    expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
    expect(screen.getByTestId('brand-review-open')).toBeInTheDocument();
  });

  it('falls back to dashes and a placeholder avatar when fields are missing', async () => {
    renderPage([
      ecommBrandMock(
        reviewBrand({
          brand_name: '',
          logo_url: 'http://img/l.png',
          city: '',
          state: '',
          contact_email: '',
          contact_phone: '',
        }),
      ),
    ]);
    await waitFor(() => expect(screen.getByText(/— · No contact/)).toBeInTheDocument());
  });

  it('shows a not-found message when the brand does not exist', async () => {
    renderPage([ecommBrandMock(null)]);
    await waitFor(() => expect(screen.getByText(/Brand not found/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Back to Brands Review/i })).toHaveAttribute('href', '/ecomm/brands');
  });

  it('flags a paused brand and an approved brand still waiting on integrations', async () => {
    const first = renderPage([ecommBrandMock(reviewBrand({ is_active: false }))]);
    await waitFor(() => expect(screen.getByText('Acme')).toBeInTheDocument());
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.queryByTestId('brand-live-chip')).not.toBeInTheDocument();
    first.unmount();
    renderPage([ecommBrandMock(reviewBrand({ is_active: true, live: false }))]);
    expect(await screen.findByTestId('brand-live-chip')).toHaveTextContent('Integration pending');
  });

  it('reviews a submitted brand, shows the result and can dismiss it', async () => {
    const submitted = reviewBrand({
      status: 'SUBMITTED',
      live: false,
      consent: {
        __typename: 'BrandConsent',
        accepted: true,
        signed_name: 'Asha',
        signed_at: '2026-10-01T10:00:00.000Z',
        policy_slug: 'brand-consent',
        policy_title: 'Brand Consent',
        content_hash: 'a1b2',
        current: true,
        available: true,
      },
    });
    renderPage([ecommBrandMock(submitted), approveEcommBrandMock()]);
    fireEvent.click(await screen.findByTestId('brand-review-open'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, approve' }));
    const banner = await screen.findByText(/Acme approved/);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Review/ })).not.toBeInTheDocument());
    fireEvent.click(banner.closest('.MuiAlert-root')?.querySelector('button') as HTMLElement);
    await waitFor(() => expect(screen.queryByText(/Acme approved/)).not.toBeInTheDocument());
  });

  it('closes the review dialog without deciding', async () => {
    renderPage([ecommBrandMock(reviewBrand({ status: 'SUBMITTED', live: false }))]);
    fireEvent.click(await screen.findByTestId('brand-review-open'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText(/Acme approved/)).not.toBeInTheDocument();
  });

  it('reports a failed re-read after the brand changes', async () => {
    const submitted = reviewBrand({
      status: 'SUBMITTED',
      live: false,
      consent: {
        __typename: 'BrandConsent',
        accepted: true,
        signed_name: 'Asha',
        signed_at: null,
        policy_slug: 'brand-consent',
        policy_title: 'Brand Consent',
        content_hash: '',
        current: true,
        available: true,
      },
    });
    renderPage([
      { request: { query: ECOMM_BRAND, variables: () => true }, result: { data: { ecommBrand: submitted } } },
      { request: { query: ECOMM_BRAND, variables: () => true }, error: new Error('network down') },
      approveEcommBrandMock(),
    ]);
    fireEvent.click(await screen.findByTestId('brand-review-open'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, approve' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
  });
});
