import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import {
  adPricingErrorMock,
  adPricingLoadingMock,
  adPricingMock,
  adPricingNumbers,
  makeAdRequestRow,
  reviewAdRequestMock,
  updateAdPricingMock,
} from '../mocks';
import { __setTableRows, fetchRowsFrom } from './table-mock';
import { logs } from '@duncit/logs';

// ---------------------------------------------------------------------------
// Module mocks — the shared table + app-settings + toast host. GraphQL flows
// through the real Apollo `MockedProvider` (renderWithProviders), never a
// hand-rolled `@apollo/client` hook mock.
// ---------------------------------------------------------------------------
vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ formatDateTime: (s: string) => `fmt:${s}` }),
}));
const dialogsMock = vi.hoisted(() => ({ notifySuccess: vi.fn() }));
vi.mock('@duncit/dialogs', () => ({ notifySuccess: dialogsMock.notifySuccess }));

import AdsApprovalsToolbar from '../../src/pages/ads-approvals-page/AdsApprovalsToolbar';
import AdsApprovalsTable from '../../src/pages/ads-approvals-page/AdsApprovalsTable';
import ReviewDetails from '../../src/pages/ads-approvals-page/ReviewDetails';
import ReviewDialog from '../../src/pages/ads-approvals-page/ReviewDialog';
import AdsApprovalsPage from '../../src/pages/ads-approvals-page/AdsApprovalsPage';
import AdsPricingForm, { fromAdPricing } from '../../src/pages/ads-settings-page/ads-pricing-form';
import AdsSettingsPage from '../../src/pages/ads-settings-page/AdsSettingsPage';

const adRow = makeAdRequestRow();
const pricingValues = fromAdPricing(adPricingNumbers);

beforeEach(() => {
  __setTableRows([]);
});
afterEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
describe('AdsApprovalsToolbar', () => {
  it('selects a new status but ignores deselecting the current one', () => {
    const onChange = vi.fn();
    renderWithProviders(<AdsApprovalsToolbar status="PENDING" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approved' }));
    expect(onChange).toHaveBeenCalledWith('APPROVED');
    // clicking the already-selected value yields null and must be ignored
    fireEvent.click(screen.getByRole('button', { name: 'Pending' }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
describe('AdsApprovalsTable + columns', () => {
  it('renders every column cell and reviews via button and row click', async () => {
    const onReview = vi.fn();
    const rows = [
      adRow,
      makeAdRequestRow({ id: 'a2', submitted_by_name: '', ad_type: 'VIDEO', status: 'APPROVED' }),
    ];
    renderWithProviders(
      <AdsApprovalsTable
        fetchRows={fetchRowsFrom(rows)}
        refetchRef={{ current: null }}
        onReview={onReview}
      />,
    );
    expect(await screen.findAllByText('₹1,400')).not.toHaveLength(0);
    expect(screen.getAllByText('Home Bottom').length).toBeGreaterThan(0);
    // submitted_by fallback dash for the empty name
    expect(screen.getByText('—')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Review' })[0]);
    expect(onReview).toHaveBeenCalledWith(adRow);
    fireEvent.click(screen.getByText('rowclick-1'));
    expect(onReview).toHaveBeenCalledTimes(2);
  });
});

// ===========================================================================
describe('ReviewDetails', () => {
  it('renders an image ad with a redirect link and single-day budget', () => {
    renderWithProviders(
      <ReviewDetails
        request={makeAdRequestRow({ duration_days: 1, estimated_cost: 200, approved_cost: 200 })}
        formatDateTime={(s) => s}
      />,
    );
    expect(screen.getByAltText('Big Sale')).toBeInTheDocument();
    expect(screen.getByText(/\/ day × 1 day/)).toBeInTheDocument();
    expect(screen.getByText(/Approved cost:/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://cdn/go' })).toBeInTheDocument();
  });

  it('renders a video ad with dashes and marketing remarks', () => {
    const { container } = renderWithProviders(
      <ReviewDetails
        request={makeAdRequestRow({
          ad_type: 'VIDEO',
          submitted_by_name: '',
          redirect_url: null,
          target_audience: null,
          reviewed_at: '2026-02-01T00:00:00.000Z',
          marketing_remarks: 'Looks good',
        })}
        formatDateTime={(s) => s}
      />,
    );
    expect(container.querySelector('video')).toBeTruthy();
    expect(screen.getByText('Looks good')).toBeInTheDocument();
    expect(screen.getByText(/× 7 days/)).toBeInTheDocument();
  });
});

// ===========================================================================
describe('ReviewDialog', () => {
  it('renders nothing without a request', () => {
    const { container } = renderWithProviders(
      <ReviewDialog
        request={null}
        saving={false}
        error={null}
        formatDateTime={(s) => s}
        onClose={vi.fn()}
        onReview={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('approves and rejects a pending request with remarks', () => {
    const onReview = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <ReviewDialog
        request={adRow}
        saving={false}
        error={null}
        formatDateTime={(s) => s}
        onClose={vi.fn()}
        onReview={onReview}
      />,
    );
    fireEvent.change(screen.getByLabelText('Remarks'), { target: { value: '  looks ok  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onReview).toHaveBeenCalledWith('a1', true, 'looks ok');
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(onReview).toHaveBeenCalledWith('a1', false, 'looks ok');
  });

  it('logs when the review promise rejects', async () => {
    const errorSpy = vi.spyOn(logs.portal.marketing, 'error').mockImplementation(() => {});
    const onReview = vi.fn().mockRejectedValue(new Error('boom'));
    renderWithProviders(
      <ReviewDialog
        request={adRow}
        saving={false}
        error={null}
        formatDateTime={(s) => s}
        onClose={vi.fn()}
        onReview={onReview}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    errorSpy.mockRestore();
  });

  it('shows a read-only dialog for a reviewed request and an error alert', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <ReviewDialog
        request={makeAdRequestRow({ status: 'APPROVED' })}
        saving={false}
        error="Something failed"
        formatDateTime={(s) => s}
        onClose={onClose}
        onReview={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Remarks')).not.toBeInTheDocument();
    expect(screen.getByText('Something failed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('disables the pending actions while saving', () => {
    renderWithProviders(
      <ReviewDialog
        request={adRow}
        saving
        error={null}
        formatDateTime={(s) => s}
        onClose={vi.fn()}
        onReview={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
  });
});

// ===========================================================================
describe('AdsApprovalsPage', () => {
  it('switches to the All filter (no pinned status) and back', async () => {
    __setTableRows([adRow]);
    renderWithProviders(<AdsApprovalsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'All' })).toHaveClass('Mui-selected'));
    fireEvent.click(screen.getByRole('button', { name: 'Approved' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Approved' })).toHaveClass('Mui-selected'),
    );
  });

  it('opens the review dialog and approves with remarks', async () => {
    __setTableRows([adRow]);
    renderWithProviders(<AdsApprovalsPage />, { mocks: [reviewAdRequestMock()] });
    fireEvent.click(await screen.findByText('rowclick-0'));
    fireEvent.change(await screen.findByLabelText('Remarks'), { target: { value: 'All good' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Ad request approved'),
    );
  });

  it('rejects a pending request successfully', async () => {
    __setTableRows([adRow]);
    renderWithProviders(<AdsApprovalsPage />, { mocks: [reviewAdRequestMock()] });
    fireEvent.click(await screen.findByText('rowclick-0'));
    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Ad request rejected'),
    );
  });

  it('closes the review dialog without acting', async () => {
    __setTableRows([adRow]);
    renderWithProviders(<AdsApprovalsPage />);
    fireEvent.click(await screen.findByText('rowclick-0'));
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows an Error message inside the dialog when the review fails', async () => {
    __setTableRows([adRow]);
    renderWithProviders(<AdsApprovalsPage />, {
      mocks: [reviewAdRequestMock({ fail: true, message: 'Review broke' })],
    });
    fireEvent.click(await screen.findByText('rowclick-0'));
    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(screen.getByText('Review broke')).toBeInTheDocument());
  });
});

// ===========================================================================
describe('AdsPricingForm + live example', () => {
  it('computes the example, reacts to inputs and submits', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <AdsPricingForm initialValues={pricingValues} busy={false} errorMessage={null} onSubmit={onSubmit} />,
    );
    expect(screen.getByText(/Home Bottom × 7 days =/)).toBeInTheDocument();
    const positionSelect = screen.getByRole('combobox', { name: 'Position' });
    fireEvent.mouseDown(positionSelect);
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Sidebar'));
    expect(screen.getByText(/Sidebar × 7 days =/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Days'), { target: { value: '' } });
    expect(screen.getByText(/Enter a valid price and day count/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Days'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Currency symbol'), { target: { value: '' } });
    expect(screen.getByText(/Sidebar × 3 days = ₹/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Currency symbol'), { target: { value: '₹' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Pricing' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Save Pricing' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('shows an error message and a busy button label', () => {
    renderWithProviders(
      <AdsPricingForm initialValues={pricingValues} busy errorMessage="Save failed" onSubmit={vi.fn()} />,
    );
    expect(screen.getByText('Save failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});

// ===========================================================================
describe('AdsSettingsPage', () => {
  it('shows an error alert when the query fails', async () => {
    renderWithProviders(<AdsSettingsPage />, { mocks: [adPricingErrorMock('Pricing unavailable')] });
    await waitFor(() => expect(screen.getByText('Pricing unavailable')).toBeInTheDocument());
  });

  it('shows a spinner while loading', () => {
    renderWithProviders(<AdsSettingsPage />, { mocks: [adPricingLoadingMock()] });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('saves pricing and toasts on success', async () => {
    renderWithProviders(<AdsSettingsPage />, { mocks: [adPricingMock(), updateAdPricingMock()] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Pricing' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Save Pricing' }));
    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Ad pricing updated'));
  });

  it('surfaces a save failure', async () => {
    renderWithProviders(<AdsSettingsPage />, {
      mocks: [adPricingMock(), updateAdPricingMock({ fail: true, message: 'Update failed' })],
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Pricing' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Save Pricing' }));
    await waitFor(() => expect(screen.getByText('Update failed')).toBeInTheDocument());
  });
});
