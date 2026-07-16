import { describe, expect, it, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router-dom';
import BackoutRefundPage, { BackoutRefundDetailPage } from '../../src/pages/finance/backout-refund-page';
import { notifySuccess } from './mocks/dialogs';
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
} from '../mocks/backout.mock';

const rowFull = makeBackoutRow();

beforeEach(() => {
  resetTableControls();
  (notifySuccess as unknown as { mockClear: () => void }).mockClear();
});

describe('BackoutRefundPage', () => {
  it('shows an error alert when the settings query fails', async () => {
    renderWithProviders(<BackoutRefundPage />, { path: '/', mocks: [backoutFinanceSettingsErrorMock()] });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('lists rows and processes a refund for a named member', async () => {
    tableControls.rows = [rowFull];
    renderWithProviders(<BackoutRefundPage />, { path: '/', mocks: [backoutFinanceSettingsMock()] });

    await waitFor(() => expect(screen.getByText('Yoga')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /process refund/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Riya')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /refund now/i }));
    expect(notifySuccess).toHaveBeenCalledWith('Refund successful');
  });

  it('shows the "this member" fallback for an anonymous row and cancels', async () => {
    tableControls.rows = [makeAnonymousBackoutRow()];
    renderWithProviders(<BackoutRefundPage />, { path: '/', mocks: [backoutFinanceSettingsMock()] });

    fireEvent.click(await screen.findByRole('button', { name: /process refund/i }));
    expect(await screen.findByText('this member')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
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

  it('renders the full detail and navigates back', async () => {
    mount(backoutDetailMock());
    expect(await screen.findByRole('heading', { name: 'Yoga' })).toBeInTheDocument();
    expect(screen.getByAltText('Yoga')).toBeInTheDocument();
    expect(screen.getByText('Asha, Ravi')).toBeInTheDocument();
    expect(screen.getByText('Yoga Club')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to backout refunds/i }));
    expect(screen.getByTestId('list-probe')).toBeInTheDocument();
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
