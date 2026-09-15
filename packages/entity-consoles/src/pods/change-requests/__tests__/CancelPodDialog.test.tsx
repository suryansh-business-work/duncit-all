import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { CANCEL_POD_FOR_CHANGE } from '@duncit/pod-change-requests';
import type { PodChangeRow } from '@duncit/utils';
import { renderWithProviders } from '../../../../__tests__/testkit';
import CancelPodDialog from '../CancelPodDialog';
import { gqlRequest, makeRequest } from './fixtures';

const REASON = 'Venue flooded, no replacement found in time';

const cancelMock = (result: MockedResponse['result'], delay = 0): MockedResponse => ({
  request: { query: CANCEL_POD_FOR_CHANGE, variables: { request_id: 'req-doc-1', reason: REASON } },
  result,
  delay,
});

const cancelledRow = gqlRequest(
  makeRequest({ status: 'RESOLVED', resolution: 'POD_CANCELLED', pod_cancelled: true }),
);

const harnessClose = vi.fn();
const harnessCancelled = vi.fn();

/** Lets a test hand the open dialog a different request, the way the queue does. */
function Harness({ first, next }: Readonly<{ first: PodChangeRow; next: PodChangeRow }>) {
  const [request, setRequest] = useState<PodChangeRow>(first);
  return (
    <>
      <button type="button" onClick={() => setRequest(next)}>
        Next request
      </button>
      <CancelPodDialog request={request} onClose={harnessClose} onCancelled={harnessCancelled} />
    </>
  );
}

const renderDialog = (mocks: MockedResponse[] = [], request: PodChangeRow | null = makeRequest()) => {
  const onClose = vi.fn();
  const onCancelled = vi.fn();
  renderWithProviders(<CancelPodDialog request={request} onClose={onClose} onCancelled={onCancelled} />, {
    mocks,
  });
  return { onClose, onCancelled };
};

const reasonField = () => screen.getByRole('textbox', { name: 'Why is Duncit cancelling this pod?' });

describe('CancelPodDialog', () => {
  it('renders nothing without a request', () => {
    renderDialog([], null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('warns what cancelling does and names the pod and its attendees', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'Cancel the pod and refund everyone?' });
    expect(within(dialog).getByText(/This ends the pod\./)).toBeInTheDocument();
    expect(within(dialog).getByText('Sunday board games · Attendees: 9')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Attendees are told a pod was cancelled; this note is for the audit trail.'),
    ).toBeInTheDocument();
  });

  it('refuses a missing reason on submit, and a too-short one once the field is left', () => {
    const { onCancelled } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel pod and refund' }));
    expect(screen.getByText('Say why the pod is being cancelled (at least 5 characters).')).toBeInTheDocument();
    expect(reasonField()).toHaveAttribute('aria-invalid', 'true');
    expect(onCancelled).not.toHaveBeenCalled();

    fireEvent.change(reasonField(), { target: { value: REASON } });
    expect(reasonField()).toHaveAttribute('aria-invalid', 'false');
  });

  it('marks a short reason invalid as soon as the field loses focus', () => {
    renderDialog();
    fireEvent.change(reasonField(), { target: { value: 'bad' } });
    expect(reasonField()).toHaveAttribute('aria-invalid', 'false');
    fireEvent.blur(reasonField());
    expect(reasonField()).toHaveAttribute('aria-invalid', 'true');
  });

  it('cancels with the trimmed reason, reports it and closes', async () => {
    const { onClose, onCancelled } = renderDialog([cancelMock({ data: { cancelPodForChange: cancelledRow } })]);
    fireEvent.change(reasonField(), { target: { value: `  ${REASON}  ` } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel pod and refund' }));

    await waitFor(() =>
      expect(onCancelled).toHaveBeenCalledWith('Pod cancelled. Every attendee’s payment is marked refunded.'),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks the dialog while the cancel is in flight', async () => {
    // The in-flight window must outlast a slow CI render: at 40 ms the response
    // could land while waitFor was still flushing, re-enabling the buttons
    // before the next assertion read them.
    const { onClose, onCancelled } = renderDialog([cancelMock({ data: { cancelPodForChange: cancelledRow } }, 600)]);
    fireEvent.change(reasonField(), { target: { value: REASON } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel pod and refund' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel pod and refund' })).toBeDisabled();
    });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    await waitFor(() => expect(onCancelled).toHaveBeenCalledTimes(1), { timeout: 3000 });
  });

  it('shows the server error and stays open when the cancel fails', async () => {
    const { onClose, onCancelled } = renderDialog([
      cancelMock({ errors: [new GraphQLError('Pod has already started')] }),
    ]);
    fireEvent.change(reasonField(), { target: { value: REASON } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel pod and refund' }));

    expect(await screen.findByText('Pod has already started')).toBeInTheDocument();
    expect(onCancelled).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes from the Close button and from Escape when idle', () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('clears the note and its error when handed a different request', () => {
    renderWithProviders(
      <Harness first={makeRequest()} next={makeRequest({ id: 'req-doc-2', change_request_no: 'DUN-CR-1043' })} />,
    );
    fireEvent.change(reasonField(), { target: { value: 'bad' } });
    fireEvent.blur(reasonField());
    expect(reasonField()).toHaveAttribute('aria-invalid', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Next request', hidden: true }));
    expect(reasonField()).toHaveValue('');
    expect(reasonField()).toHaveAttribute('aria-invalid', 'false');
  });
});
