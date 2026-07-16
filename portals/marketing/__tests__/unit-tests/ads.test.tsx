import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const tableMock = vi.hoisted(() => ({ rows: [] as any[] }));
vi.mock('@duncit/table', () => ({
  useApolloTableFetch: () => vi.fn(),
  dateColumn: (opts: any = {}) => ({ field: opts.field ?? 'created_at', headerName: opts.headerName ?? 'Date', ...opts }),
  DuncitTable: ({ columns, onRowClick, refetchRef }: any) => {
    if (refetchRef) refetchRef.current = vi.fn();
    return (
      <div data-testid="duncit-table">
        {tableMock.rows.map((row, ri) => (
          <div key={ri} data-testid="table-row">
            {columns.map((c: any, ci: number) => (
              <span key={ci}>
                {c.valueGetter ? String(c.valueGetter(row)) : ''}
                {c.cellRenderer ? c.cellRenderer(row) : null}
              </span>
            ))}
            {onRowClick ? (
              <button type="button" onClick={() => onRowClick(row)}>{`rowclick-${ri}`}</button>
            ) : null}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ formatDateTime: (s: string) => `fmt:${s}` }),
}));

const dialogsMock = vi.hoisted(() => ({ notifySuccess: vi.fn() }));
vi.mock('@duncit/dialogs', () => ({ notifySuccess: dialogsMock.notifySuccess }));

const apolloMock = vi.hoisted(() => ({
  queryData: {} as Record<string, any>,
  loading: false,
  error: undefined as any,
  refetch: vi.fn(),
  mutations: {} as Record<string, any>,
}));
const opName = (doc: any) =>
  doc?.definitions?.find((d: any) => d.kind === 'OperationDefinition')?.name?.value ?? '';
vi.mock('@apollo/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client')>();
  return {
    ...actual,
    useApolloClient: () => ({}),
    useQuery: (doc: any) => ({
      data: apolloMock.queryData[opName(doc)],
      loading: apolloMock.loading,
      error: apolloMock.error,
      refetch: apolloMock.refetch,
    }),
    useMutation: (doc: any) => {
      const name = opName(doc);
      apolloMock.mutations[name] ??= vi.fn().mockResolvedValue({ data: {} });
      return [apolloMock.mutations[name], { loading: false }];
    },
  };
});

import AdsApprovalsToolbar from '../../src/pages/ads-approvals-page/AdsApprovalsToolbar';
import AdsApprovalsTable from '../../src/pages/ads-approvals-page/AdsApprovalsTable';
import ReviewDetails from '../../src/pages/ads-approvals-page/ReviewDetails';
import ReviewDialog from '../../src/pages/ads-approvals-page/ReviewDialog';
import AdsApprovalsPage from '../../src/pages/ads-approvals-page/AdsApprovalsPage';
import AdsPricingForm from '../../src/pages/ads-settings-page/ads-pricing-form';
import { fromAdPricing } from '../../src/pages/ads-settings-page/ads-pricing-form';
import AdsSettingsPage from '../../src/pages/ads-settings-page/AdsSettingsPage';
import type { AdRequestRow } from '../../src/pages/ads-approvals-page/helpers';

const adRow: AdRequestRow = {
  id: 'a1',
  trace_id: 'AD-1',
  ad_title: 'Big Sale',
  ad_description: 'A great deal',
  ad_type: 'IMAGE',
  media_url: 'https://cdn/i.png',
  position: 'HOME_BOTTOM',
  start_at: '2026-01-01T00:00:00.000Z',
  duration_days: 7,
  end_at: '2026-01-08T00:00:00.000Z',
  redirect_url: 'https://cdn/go',
  target_audience: 'All',
  status: 'PENDING',
  marketing_remarks: null,
  estimated_cost: 1400,
  approved_cost: null,
  currency_symbol: '₹',
  submitted_by: 'u1',
  submitted_by_name: 'Advertiser',
  reviewed_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
};

const pricing = {
  auto_per_day: 500,
  home_bottom_per_day: 750,
  sidebar_per_day: 400,
  explore_scroll_per_day: 350,
  status_per_day: 300,
  venue_list_per_day: 250,
  club_list_per_day: 250,
  pod_list_per_day: 200,
  pod_details_per_day: 200,
  currency_symbol: '₹',
};

beforeEach(() => {
  tableMock.rows = [];
  apolloMock.queryData = {};
  apolloMock.loading = false;
  apolloMock.error = undefined;
  apolloMock.refetch = vi.fn().mockResolvedValue({});
  apolloMock.mutations = {};
});
afterEach(() => vi.clearAllMocks());

// ===========================================================================
describe('AdsApprovalsToolbar', () => {
  it('selects a new status but ignores deselecting the current one', () => {
    const onChange = vi.fn();
    render(<AdsApprovalsToolbar status="PENDING" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approved' }));
    expect(onChange).toHaveBeenCalledWith('APPROVED');
    // clicking the already-selected value yields null and must be ignored
    fireEvent.click(screen.getByRole('button', { name: 'Pending' }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
describe('AdsApprovalsTable + columns', () => {
  it('renders every column cell and reviews via button and row click', () => {
    const onReview = vi.fn();
    tableMock.rows = [adRow, { ...adRow, id: 'a2', submitted_by_name: '', ad_type: 'VIDEO', status: 'APPROVED' }];
    render(<AdsApprovalsTable fetchRows={vi.fn() as any} refetchRef={{ current: null } as any} onReview={onReview} />);
    expect(screen.getAllByText('₹1,400').length).toBeGreaterThan(0);
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
    render(
      <ReviewDetails
        request={{ ...adRow, duration_days: 1, estimated_cost: 200, approved_cost: 200 }}
        formatDateTime={(s) => s}
      />,
    );
    expect(screen.getByAltText('Big Sale')).toBeInTheDocument();
    expect(screen.getByText(/\/ day × 1 day/)).toBeInTheDocument();
    expect(screen.getByText(/Approved cost:/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://cdn/go' })).toBeInTheDocument();
  });

  it('renders a video ad with dashes and marketing remarks', () => {
    const { container } = render(
      <ReviewDetails
        request={{
          ...adRow,
          ad_type: 'VIDEO',
          submitted_by_name: '',
          redirect_url: null,
          target_audience: null,
          reviewed_at: '2026-02-01T00:00:00.000Z',
          marketing_remarks: 'Looks good',
        }}
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
    const { container } = render(
      <ReviewDialog request={null} saving={false} error={null} formatDateTime={(s) => s} onClose={vi.fn()} onReview={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('approves and rejects a pending request with remarks', async () => {
    const onReview = vi.fn().mockResolvedValue(undefined);
    render(
      <ReviewDialog request={adRow} saving={false} error={null} formatDateTime={(s) => s} onClose={vi.fn()} onReview={onReview} />,
    );
    fireEvent.change(screen.getByLabelText('Remarks'), { target: { value: '  looks ok  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onReview).toHaveBeenCalledWith('a1', true, 'looks ok');
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(onReview).toHaveBeenCalledWith('a1', false, 'looks ok');
  });

  it('logs when the review promise rejects', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onReview = vi.fn().mockRejectedValue(new Error('boom'));
    render(
      <ReviewDialog request={adRow} saving={false} error={null} formatDateTime={(s) => s} onClose={vi.fn()} onReview={onReview} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    errorSpy.mockRestore();
  });

  it('shows a read-only dialog for a reviewed request and an error alert', () => {
    const onClose = vi.fn();
    render(
      <ReviewDialog
        request={{ ...adRow, status: 'APPROVED' }}
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
    render(
      <ReviewDialog request={adRow} saving error={null} formatDateTime={(s) => s} onClose={vi.fn()} onReview={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
  });
});

// ===========================================================================
describe('AdsApprovalsPage', () => {
  it('refetches when the status filter changes', async () => {
    tableMock.rows = [adRow];
    render(<AdsApprovalsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Approved' }));
    // status effect fires refetch after the change
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approved' })).toHaveClass('Mui-selected'));
  });

  it('opens the review dialog and approves a request', async () => {
    tableMock.rows = [adRow];
    apolloMock.mutations.ReviewAdRequest = vi.fn().mockResolvedValue({ data: {} });
    render(<AdsApprovalsPage />);
    fireEvent.click(screen.getByText('rowclick-0'));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Ad request approved'));
    expect(apolloMock.mutations.ReviewAdRequest).toHaveBeenCalled();
  });

  it('shows an error inside the dialog when the review fails', async () => {
    tableMock.rows = [adRow];
    apolloMock.mutations.ReviewAdRequest = vi.fn().mockRejectedValue(new Error('Review broke'));
    render(<AdsApprovalsPage />);
    fireEvent.click(screen.getByText('rowclick-0'));
    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(screen.getByText('Review broke')).toBeInTheDocument());
  });
});

// ===========================================================================
describe('AdsPricingForm + live example', () => {
  it('computes the example, reacts to inputs and submits', async () => {
    const onSubmit = vi.fn();
    render(<AdsPricingForm initialValues={fromAdPricing(pricing)} busy={false} errorMessage={null} onSubmit={onSubmit} />);
    // default HOME_BOTTOM × 7 days example
    expect(screen.getByText(/Home Bottom × 7 days =/)).toBeInTheDocument();
    // switch position
    const positionSelect = screen.getByRole('combobox', { name: 'Position' });
    fireEvent.mouseDown(positionSelect);
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Sidebar'));
    expect(screen.getByText(/Sidebar × 7 days =/)).toBeInTheDocument();
    // invalid day count -> guidance text
    fireEvent.change(screen.getByLabelText('Days'), { target: { value: '' } });
    expect(screen.getByText(/Enter a valid price and day count/)).toBeInTheDocument();
    // clearing the currency symbol falls back to the ₹ example default
    fireEvent.change(screen.getByLabelText('Days'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Currency symbol'), { target: { value: '' } });
    expect(screen.getByText(/Sidebar × 3 days = ₹/)).toBeInTheDocument();
    // restore currency so the form is valid, then submit
    fireEvent.change(screen.getByLabelText('Currency symbol'), { target: { value: '₹' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Pricing' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Save Pricing' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('shows an error message and a busy button label', () => {
    render(<AdsPricingForm initialValues={fromAdPricing(pricing)} busy errorMessage="Save failed" onSubmit={vi.fn()} />);
    expect(screen.getByText('Save failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});

// ===========================================================================
describe('AdsSettingsPage', () => {
  it('shows an error alert when the query fails', () => {
    apolloMock.error = { message: 'Pricing unavailable' };
    render(<AdsSettingsPage />);
    expect(screen.getByText('Pricing unavailable')).toBeInTheDocument();
  });

  it('shows a spinner while loading', () => {
    apolloMock.loading = true;
    render(<AdsSettingsPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('saves pricing and toasts on success', async () => {
    apolloMock.queryData = { AdPricing: { adPricing: pricing } };
    apolloMock.mutations.UpdateAdPricing = vi.fn().mockResolvedValue({ data: {} });
    render(<AdsSettingsPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Pricing' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Save Pricing' }));
    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Ad pricing updated'));
    expect(apolloMock.refetch).toHaveBeenCalled();
  });

  it('surfaces a save failure', async () => {
    apolloMock.queryData = { AdPricing: { adPricing: pricing } };
    apolloMock.mutations.UpdateAdPricing = vi.fn().mockRejectedValue(new Error('Update failed'));
    render(<AdsSettingsPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Pricing' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Save Pricing' }));
    await waitFor(() => expect(screen.getByText('Update failed')).toBeInTheDocument());
  });
});
