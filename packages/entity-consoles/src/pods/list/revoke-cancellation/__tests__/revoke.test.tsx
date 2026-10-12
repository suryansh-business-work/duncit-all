import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../../../../../__tests__/testkit';
import RefundLedger from '../RefundLedger';
import RevokeCancellationDialog from '../RevokeCancellationDialog';
import RevokeCancellationAction from '..';
import {
  POD_REVOKE_PREVIEW,
  REVOKE_POD_CANCELLATION,
  type PodRevokePreview,
  type PodRevokeRefund,
} from '../queries';

const refund = (over: Partial<PodRevokeRefund> = {}): PodRevokeRefund => ({
  payment_id: 'pay-1',
  user_id: 'u-1',
  user_name: 'Ananya Iyer',
  user_email: 'ananya@example.com',
  amount: 1250,
  currency_symbol: '₹',
  state: 'PAID',
  ...over,
});

const preview = (over: Partial<PodRevokePreview> = {}): PodRevokePreview => ({
  pod_id: 'pod-1',
  pod_title: 'Sunday Chess',
  pod_date_time: '2099-01-01T10:00:00.000Z',
  is_cancelled: true,
  can_revoke: true,
  blocked_reason: null,
  loss_total: 1250,
  held_total: 400,
  currency_symbol: '₹',
  refunds: [refund(), refund({ payment_id: 'pay-2', user_name: '', user_email: 'ben@example.com', amount: 400, state: 'HELD' })],
  ...over,
});

describe('RefundLedger', () => {
  it('says revoking costs nothing when nobody was refunded', () => {
    render(<RefundLedger refunds={[]} lossTotal={0} heldTotal={0} currencySymbol="₹" />);
    expect(
      screen.getByText('Nobody was refunded for this pod, so revoking costs nothing.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Cancellation refunds')).not.toBeInTheDocument();
  });

  it('lists each payer with the state of their refund and totals loss apart from held', () => {
    const data = preview();
    render(
      <RefundLedger
        refunds={data.refunds}
        lossTotal={data.loss_total}
        heldTotal={data.held_total}
        currencySymbol="₹"
      />,
    );

    expect(screen.getByText('Cancellation refunds')).toBeInTheDocument();
    expect(screen.getByText('Ananya Iyer')).toBeInTheDocument();
    // A payer with no name is still identifiable by their email.
    expect(screen.getAllByText('ben@example.com').length).toBeGreaterThan(0);
    expect(screen.getByText('Paid back')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Loss — already paid back, not recoverable').nextSibling).toHaveTextContent(
      '₹1,250.00',
    );
    expect(screen.getByText('Scheduled — revoking cancels this, at no cost').nextSibling).toHaveTextContent(
      '₹400.00',
    );
  });
});

describe('RevokeCancellationDialog', () => {
  const baseProps = {
    open: true,
    podTitle: 'Sunday Chess',
    saving: false,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
  };

  it('names the pod and warns that refunds already paid are not reversed', () => {
    render(<RevokeCancellationDialog {...baseProps} preview={preview()} />);
    expect(screen.getByText(/"Sunday Chess" becomes visible again/)).toBeInTheDocument();
    expect(screen.getByText(/are NOT reversed/)).toBeInTheDocument();
    expect(screen.getByText('Cancellation refunds')).toBeInTheDocument();
  });

  it('prices an unloaded preview as no refunds rather than crashing', () => {
    render(<RevokeCancellationDialog {...baseProps} preview={null} />);
    expect(screen.getByText(/costs nothing/)).toBeInTheDocument();
  });

  it('keeps the pod cancelled on Keep it cancelled and confirms on Revoke', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <RevokeCancellationDialog {...baseProps} preview={preview()} onClose={onClose} onConfirm={onConfirm} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Keep it cancelled' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Revoke cancellation' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('locks Keep it cancelled while the revoke is in flight', () => {
    render(<RevokeCancellationDialog {...baseProps} preview={preview()} saving />);
    expect(screen.getByRole('button', { name: 'Keep it cancelled' })).toBeDisabled();
  });
});

describe('RevokeCancellationAction', () => {
  const previewMock = (data: PodRevokePreview): MockedResponse => ({
    request: { query: POD_REVOKE_PREVIEW, variables: { id: 'pod-1' } },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: {
      data: {
        podRevokePreview: {
          __typename: 'PodRevokePreview',
          ...data,
          refunds: data.refunds.map((r) => ({ __typename: 'PodRevokeRefund', ...r })),
        },
      },
    },
  });

  const revokeMock = (error?: Error): MockedResponse => ({
    request: { query: REVOKE_POD_CANCELLATION, variables: { id: 'pod-1' } },
    ...(error
      ? { error }
      : {
          result: {
            data: {
              revokePodCancellation: {
                __typename: 'Pod',
                id: 'pod-1',
                is_active: true,
                is_deleted: false,
                deleted_at: null,
                venue_approval_status: 'APPROVED',
              },
            },
          },
        }),
  });

  const mount = (mocks: MockedResponse[]) =>
    renderWithProviders(<RevokeCancellationAction podId="pod-1" podTitle="Sunday Chess" />, { mocks });

  const trigger = () => screen.getByRole('button', { name: 'Revoke cancellation' });

  it('stays disabled until the server says the cancellation can be revoked', async () => {
    mount([previewMock(preview({ can_revoke: false, blocked_reason: 'NOT_CANCELLED' }))]);
    expect(trigger()).toBeDisabled();
    // The hover explanation is carried by the wrapping span.
    await waitFor(() =>
      expect(trigger().parentElement).toHaveAttribute(
        'aria-label',
        'This pod is not cancelled — there is nothing to revoke.',
      ),
    );
  });

  it('explains a blocked revoke after the pod date with the pod start in the hint', async () => {
    mount([previewMock(preview({ can_revoke: false, blocked_reason: 'POD_DATE_PASSED' }))]);
    await waitFor(() =>
      expect(trigger().parentElement?.getAttribute('aria-label')).toMatch(/^This pod started on .+\./),
    );
  });

  it('copes with a blocked preview that carries no pod date', async () => {
    mount([
      previewMock(preview({ can_revoke: false, blocked_reason: 'POD_DATE_PASSED', pod_date_time: null })),
    ]);
    await waitFor(() =>
      expect(trigger().parentElement?.getAttribute('aria-label')).toMatch(/^This pod started on \./),
    );
  });

  it('revokes after confirmation, closes the dialog and reports success', async () => {
    mount([previewMock(preview()), revokeMock()]);
    await waitFor(() => expect(trigger()).toBeEnabled());

    fireEvent.click(trigger());
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Revoke this cancellation?');
    const confirm = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === 'Revoke cancellation',
    ) as HTMLButtonElement;
    fireEvent.click(confirm);

    expect(await screen.findByText('Cancellation revoked — the pod is visible again.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Revoke this cancellation?')).not.toBeInTheDocument());
  });

  it('keeps the dialog open and shows the server error when the revoke fails', async () => {
    mount([previewMock(preview()), revokeMock(new GraphQLError('Pod already started'))]);
    await waitFor(() => expect(trigger()).toBeEnabled());

    fireEvent.click(trigger());
    const dialog = await screen.findByRole('dialog');
    const confirm = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === 'Revoke cancellation',
    ) as HTMLButtonElement;
    fireEvent.click(confirm);

    expect(await screen.findByText('Pod already started')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('RevokeCancellationAction / dismissing', () => {
  it('closes the dialog without revoking when the admin keeps it cancelled', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: POD_REVOKE_PREVIEW, variables: { id: 'pod-1' } },
        maxUsageCount: Number.POSITIVE_INFINITY,
        result: {
          data: {
            podRevokePreview: {
              __typename: 'PodRevokePreview',
              ...preview({ refunds: [] }),
            },
          },
        },
      },
    ];
    renderWithProviders(<RevokeCancellationAction podId="pod-1" podTitle="Sunday Chess" />, { mocks });
    const open = screen.getByRole('button', { name: 'Revoke cancellation' });
    await waitFor(() => expect(open).toBeEnabled());

    fireEvent.click(open);
    fireEvent.click(await screen.findByRole('button', { name: 'Keep it cancelled' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Cancellation revoked — the pod is visible again.')).not.toBeInTheDocument();
  });
});
