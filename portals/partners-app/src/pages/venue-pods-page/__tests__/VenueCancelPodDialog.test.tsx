import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import VenueCancelPodDialog from '../VenueCancelPodDialog';
import { VENUE_CANCEL_PENALTY, VENUE_CANCEL_POD, type VenuePodRow } from '../queries';
import { makeVenuePodRow } from './fixtures';

// Apollo + MUI transitions are slow on a loaded CI box.
configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);

const REASON = 'Kitchen flooded overnight';

const penaltyMock = (penalty: number, delay?: number): MockedResponse => ({
  request: { query: VENUE_CANCEL_PENALTY },
  delay,
  result: {
    data: {
      publicAppSettings: {
        __typename: 'PublicAppSettings',
        venue_cancel_health_penalty: penalty,
      },
    },
  },
});

const cancelMock = (reason = REASON): MockedResponse => ({
  request: { query: VENUE_CANCEL_POD, variables: { pod_id: '1', reason } },
  result: {
    data: {
      venueCancelPod: {
        __typename: 'VenueCancelPodResult',
        pod_id: '1',
        health_penalty: 7,
        venue_health_score: 82,
        refunded_count: 3,
      },
    },
  },
});

const cancelErrorMock = (): MockedResponse => ({
  request: { query: VENUE_CANCEL_POD, variables: { pod_id: '1', reason: REASON } },
  result: { errors: [new GraphQLError('Only an upcoming pod can be cancelled')] },
});

const renderDialog = (mocks: MockedResponse[], row: VenuePodRow | null = makeVenuePodRow()) => {
  const onCancelled = vi.fn();
  const onClose = vi.fn();
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <VenueCancelPodDialog row={row} onClose={onClose} onCancelled={onCancelled} />
    </MockedProvider>,
  );
  return { onCancelled, onClose };
};

const reasonField = () => screen.getByLabelText(/Why are you cancelling/);
const submitButton = () => screen.getByRole('button', { name: 'Cancel this pod' });

describe('VenueCancelPodDialog', () => {
  it('names the pod and warns with the live penalty from the server', async () => {
    renderDialog([penaltyMock(7)]);

    expect(
      await screen.findByText("Cancelling this pod will reduce this venue's Account Health by 7 points."),
    ).toBeTruthy();
    expect(screen.getByText('Yoga')).toBeTruthy();
    expect(screen.getByText(/Hall A/)).toBeTruthy();
    expect(screen.getByText(/Every attendee who paid for this pod is refunded/)).toBeTruthy();
  });

  it('says "point" when the admin configured a penalty of one', async () => {
    renderDialog([penaltyMock(1)]);
    expect(
      await screen.findByText("Cancelling this pod will reduce this venue's Account Health by 1 point."),
    ).toBeTruthy();
  });

  it('promises no Account Health hit when an admin has disabled the penalty', async () => {
    renderDialog([penaltyMock(0)]);

    expect(await screen.findByText('Cancelling this pod cannot be undone.')).toBeTruthy();
    expect(screen.queryByText(/Account Health/)).toBeNull();
  });

  it('omits the number rather than guessing one before the penalty query resolves', () => {
    renderDialog([penaltyMock(7, 50_000)]);

    expect(
      screen.getByText("Cancelling this pod will reduce this venue's Account Health."),
    ).toBeTruthy();
    expect(screen.queryByText(/Account Health by/)).toBeNull();
  });

  it('renders nothing while no pod is selected', () => {
    renderDialog([penaltyMock(7)], null);
    expect(screen.queryByText('Cancel this pod?')).toBeNull();
  });

  it('blocks an empty reason and never calls the mutation', async () => {
    const { onCancelled } = renderDialog([penaltyMock(7)]);

    fireEvent.click(submitButton());

    expect(await screen.findByText('Reason must be at least 5 characters')).toBeTruthy();
    expect(onCancelled).not.toHaveBeenCalled();
  });

  it('blocks a reason shorter than five characters', async () => {
    const { onCancelled } = renderDialog([penaltyMock(7)]);

    fireEvent.change(reasonField(), { target: { value: 'hey' } });
    fireEvent.click(submitButton());

    expect(await screen.findByText('Reason must be at least 5 characters')).toBeTruthy();
    expect(onCancelled).not.toHaveBeenCalled();
  });

  it('sends the pod id with the trimmed reason and hands the outcome back', async () => {
    // The mock only matches { pod_id: '1', reason: 'Kitchen flooded overnight' }, so
    // an untrimmed or mis-keyed variable set fails this test.
    const { onCancelled } = renderDialog([penaltyMock(7), cancelMock()]);

    fireEvent.change(reasonField(), { target: { value: `  ${REASON}  ` } });
    fireEvent.click(submitButton());

    await waitFor(() => expect(onCancelled).toHaveBeenCalledTimes(1));
    expect(onCancelled).toHaveBeenCalledWith(
      expect.objectContaining({
        pod_id: '1',
        health_penalty: 7,
        venue_health_score: 82,
        refunded_count: 3,
      }),
    );
  });

  it('keeps the dialog open and shows the server error when the cancel is refused', async () => {
    const { onCancelled } = renderDialog([penaltyMock(7), cancelErrorMock()]);

    fireEvent.change(reasonField(), { target: { value: REASON } });
    fireEvent.click(submitButton());

    expect(await screen.findByText('Only an upcoming pod can be cancelled')).toBeTruthy();
    expect(onCancelled).not.toHaveBeenCalled();
    expect(screen.getByText('Cancel this pod?')).toBeTruthy();
  });

  it('closes without cancelling when the owner keeps the pod', async () => {
    const { onClose, onCancelled } = renderDialog([penaltyMock(7)]);

    fireEvent.click(await screen.findByRole('button', { name: 'Keep the pod' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCancelled).not.toHaveBeenCalled();
  });
});
