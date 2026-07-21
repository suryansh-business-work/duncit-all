import { describe, expect, it, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router-dom';
import BackoutRefundPage, { BackoutRefundDetailPage } from '../../src/pages/finance/backout-refund-page';
import RefundBreakupDialog from '../../src/pages/finance/backout-refund-page/RefundBreakupDialog';
import { notifyError, notifySuccess } from './mocks/dialogs';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import {
  backoutDetailLoadingMock,
  backoutDetailMock,
  backoutFinanceSettingsErrorMock,
  backoutFinanceSettingsMock,
  makeAnonymousBackoutRow,
  makeBackoutDetail,
  makeBackoutRow,
  makeDetailPod,
  processBackoutRefundMock,
  processBackoutRefundErrorMock,
} from '../mocks/backout.mock';

const rowFull = makeBackoutRow();

beforeEach(() => {
  resetTableControls();
  (notifySuccess as unknown as { mockClear: () => void }).mockClear();
  (notifyError as unknown as { mockClear: () => void }).mockClear();
});

describe('BackoutRefundPage', () => {
  it('shows an error alert when the settings query fails', async () => {
    renderWithProviders(<BackoutRefundPage />, { path: '/', mocks: [backoutFinanceSettingsErrorMock()] });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('lists Backout ID + Status and processes a refund for a Spot Filled row', async () => {
    tableControls.rows = [rowFull];
    renderWithProviders(<BackoutRefundPage />, {
      path: '/',
      mocks: [backoutFinanceSettingsMock(), processBackoutRefundMock()],
    });

    await waitFor(() => expect(screen.getByText('Yoga')).toBeInTheDocument());
    expect(screen.getByText('DUN-BKO-000001')).toBeInTheDocument();
    expect(screen.getByText('Spot Filled')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /process refund/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Riya')).toBeInTheDocument();
    expect(within(dialog).getByText('DUN-BKO-000001')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /refund now/i }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Refund processed'));
  });

  it('surfaces a mutation failure inside an error toast', async () => {
    tableControls.rows = [rowFull];
    renderWithProviders(<BackoutRefundPage />, {
      path: '/',
      mocks: [backoutFinanceSettingsMock(), processBackoutRefundErrorMock()],
    });

    fireEvent.click(await screen.findByRole('button', { name: /process refund/i }));
    fireEvent.click(await screen.findByRole('button', { name: /refund now/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('hides the Refund action for in-process/cancelled/processed rows', async () => {
    tableControls.rows = [
      makeAnonymousBackoutRow(), // IN_PROCESS, free
      makeBackoutRow({
        id: 'b3',
        backout_no: 'DUN-BKO-000003',
        backout_status: 'CANCELLED',
        replacement_confirmed: false,
        refund_status: 'NONE',
      }),
      makeBackoutRow({
        id: 'b4',
        backout_no: 'DUN-BKO-000004',
        refund_processed_at: '2024-01-04T10:00:00Z',
        refund_status: 'PROCESSED',
      }),
    ];
    renderWithProviders(<BackoutRefundPage />, { path: '/', mocks: [backoutFinanceSettingsMock()] });

    await waitFor(() => expect(screen.getByText('Backout In Process')).toBeInTheDocument());
    expect(screen.getByText('Backout Cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /process refund/i })).not.toBeInTheDocument();
  });

  it('shows the "this member" fallback for an anonymous eligible row and cancels', async () => {
    tableControls.rows = [makeBackoutRow({ user_name: null })];
    renderWithProviders(<BackoutRefundPage />, { path: '/', mocks: [backoutFinanceSettingsMock()] });

    fireEvent.click(await screen.findByRole('button', { name: /process refund/i }));
    expect(await screen.findByText('this member')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
  });

  it('disables the dialog actions while the refund is processing', () => {
    renderWithProviders(
      <RefundBreakupDialog
        refundFor={rowFull}
        sym="₹"
        deductionPct={10}
        busy
        onClose={() => undefined}
        onConfirm={() => undefined}
      />,
      { path: '/', mocks: [] },
    );
    expect(screen.getByRole('button', { name: /processing…/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('navigates to a row detail', async () => {
    tableControls.rows = [rowFull];
    renderWithProviders(<BackoutRefundPage />, {
      path: '/',
      mocks: [backoutFinanceSettingsMock()],
      extra: <Route path="/backout-refunds/:id" element={<div data-testid="detail-probe">detail</div>} />,
    });
    await waitFor(() => expect(screen.getByText('Yoga')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('row-open'));
    expect(screen.getByTestId('detail-probe')).toBeInTheDocument();
  });
});

describe('BackoutRefundDetailPage', () => {
  const mount = (mock: ReturnType<typeof backoutDetailMock>) =>
    renderWithProviders(<BackoutRefundDetailPage />, {
      path: '/backout-refunds/:id',
      entry: '/backout-refunds/b1',
      mocks: [mock],
      extra: <Route path="/backout-refunds" element={<div data-testid="list-probe">list</div>} />,
    });

  it('shows the loading guard', () => {
    mount(backoutDetailLoadingMock());
    expect(screen.getByTestId('qg-loading')).toBeInTheDocument();
  });

  it('renders the detail with timeline, attempts and replacement cards', async () => {
    mount(backoutDetailMock());
    expect(await screen.findByRole('heading', { name: 'Yoga' })).toBeInTheDocument();
    expect(screen.getByAltText('Yoga')).toBeInTheDocument();
    expect(screen.getByText('Asha, Ravi')).toBeInTheDocument();
    expect(screen.getByText('Yoga Club')).toBeInTheDocument();

    // Backout Attempts x / n + Replacement Confirmed? cards.
    expect(screen.getByTestId('backout-attempts-metric')).toHaveTextContent('1 / 3');
    expect(screen.getByTestId('replacement-confirmed-metric')).toHaveTextContent('Yes');

    // Horizontal timeline: chronological, immutable events with count + time.
    expect(screen.getByTestId('backout-event-0')).toHaveTextContent('Backout In Process');
    expect(screen.getByTestId('backout-event-1')).toHaveTextContent('Spot Filled');
    expect(screen.getByTestId('backout-event-0')).toHaveTextContent('Backout Count: 1');

    fireEvent.click(screen.getByRole('button', { name: /back to backout refunds/i }));
    expect(screen.getByTestId('list-probe')).toBeInTheDocument();
  });

  it('shows No replacement + an empty timeline for an in-process request', async () => {
    mount(
      backoutDetailMock(
        makeBackoutDetail({
          backout_status: 'IN_PROCESS',
          replacement_confirmed: false,
          refund_amount: null,
          events: [],
        }),
      ),
    );
    expect(await screen.findByTestId('replacement-confirmed-metric')).toHaveTextContent('No');
    expect(screen.getByText('No lifecycle events recorded for this request.')).toBeInTheDocument();
  });

  it('renders a pod with an image but all other fields null', async () => {
    mount(
      backoutDetailMock(
        makeBackoutDetail({
          user_name: null,
          user_email: null,
          payment_amount: null,
          payment_currency: null,
          payment_status: null,
          payment_id: null,
          pod: makeDetailPod({
            pod_title: null,
            club_slug: null,
            host_names: [],
            venue_id: null,
            club: null,
            pod_images_and_videos: [{ __typename: 'PodMedia', url: 'https://img/x.jpg', type: 'IMAGE' }],
          }),
        }),
      ),
    );
    expect(await screen.findByAltText('Pod')).toBeInTheDocument();
  });

  it('renders the detail when the pod is missing entirely', async () => {
    mount(backoutDetailMock(makeBackoutDetail({ user_email: null, pod: null })));
    expect(await screen.findByText('Backout refund')).toBeInTheDocument();
  });

  it('renders nothing when the request is not found', async () => {
    mount(backoutDetailMock(null));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /back to backout refunds/i })).not.toBeInTheDocument(),
    );
  });
});
