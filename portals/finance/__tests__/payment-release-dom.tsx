import { fireEvent, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { ConfirmProvider } from '../../../packages/dialogs/src/useConfirm';
import PaymentReleaseDetailPage from '../src/pages/finance/payment-release-page/detail/PaymentReleaseDetailPage';
import { renderWithProviders } from './testkit';
import { podBreakdownMock } from './mocks/pod-finance.mock';
import {
  podPaymentReleaseMock,
  publicFinanceSettingsMock,
  type DetailReleaseMock,
  type ReleaseDetailMock,
} from './mocks/payment-release.mock';

/**
 * DOM helpers for the Payment Release funding suites: mount one request's page
 * and reach its payouts, its venue-bill lines and its two approval dialogs.
 *
 * Each suite still mocks '@duncit/dialogs' with the real useConfirm itself — a
 * vi.mock applies only in the file that declares it — so the ConfirmProvider
 * here is the real one those suites resolve.
 */
export const mountRelease = (mocks: MockedResponse[]) =>
  renderWithProviders(
    <ConfirmProvider>
      <PaymentReleaseDetailPage />
    </ConfirmProvider>,
    {
      path: '/payment-release/:requestId',
      entry: '/payment-release/batch-1',
      mocks: [...mocks, podBreakdownMock(), publicFinanceSettingsMock()],
    },
  );

/** Mounts one request and waits for it to be on screen. */
export const mountReleaseDetail = async (detail: ReleaseDetailMock, extra: MockedResponse[] = []) => {
  const read = podPaymentReleaseMock(detail);
  mountRelease([read.mock, ...extra]);
  await screen.findByRole('heading', { level: 1, name: detail.summary.pod_title });
  return read;
};

export const payout = (kind: DetailReleaseMock['kind']) => screen.getByTestId(`release-payout-${kind}`);

export const billLine = (key: string) => screen.getByTestId(`venue-bill-line-${key}`).textContent;

export const fundingNoteField = (dialog: HTMLElement) =>
  within(dialog).getByRole('textbox', { name: /Funding note/ });

/** "Approve all payouts" on a request with a shortfall opens the funding-note dialog. */
export const openFundingDialog = async () => {
  fireEvent.click(screen.getByTestId('release-approve-all'));
  return screen.findByRole('dialog', { name: 'Who funds the shortfall?' });
};

/** The single-payout review dialog for one payout. */
export const openReview = async (kind: DetailReleaseMock['kind']) => {
  fireEvent.click(within(payout(kind)).getByRole('button', { name: 'Review' }));
  return screen.findByRole('dialog');
};
