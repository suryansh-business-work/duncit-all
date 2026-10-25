import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { VenueChatResubmit } from '@/components/venue-chat/VenueChatResubmit';
import { CategoryMediaType } from '@/generated/graphql/graphql';
import { VenueChatResubmitPodDocument } from '@/graphql/venue-chat';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';
import { offerMove } from '@/utils/venue-offer-fixture';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
const mockWarn = jest.fn();
jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { warn: (...args: unknown[]) => mockWarn(...args), error: jest.fn() } },
}));
// The resubmit sheet is its own suite's subject; here only what it is handed matters.
jest.mock('@/components/host-manage/PodResubmitDialog', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    PodResubmitDialog: (props: {
      pod: { id: string } | null;
      offerPrefill?: { rate: number } | null;
      onSaved: () => void;
    }) => (
      <Text testID="resubmit-stub" onPress={props.onSaved}>
        {props.pod ? `${props.pod.id} @ ${props.offerPrefill?.rate ?? 0}` : 'closed'}
      </Text>
    ),
  };
});

const pod = {
  id: 'pod-1',
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles',
  pod_images_and_videos: [{ url: 'https://cdn/a.jpg', type: CategoryMediaType.Image }],
  venue_id: 'venue-1',
  no_of_spots: 20,
};

const mount = (move = offerMove({ event: 'DECLINED', by: 'VENUE', rate: 320 })) => {
  const spies = { onClose: jest.fn(), onError: jest.fn() };
  const view = renderWithProviders(<VenueChatResubmit podId="pod-1" move={move} {...spies} />);
  return { ...spies, ...view };
};

beforeEach(() => {
  mockRequest.mockReset();
  mockWarn.mockReset();
});

describe('VenueChatResubmit', () => {
  it('reads nothing and opens nothing until a new offer is asked for', () => {
    renderWithProviders(
      <VenueChatResubmit podId="pod-1" move={null} onClose={jest.fn()} onError={jest.fn()} />,
    );
    expect(mockRequest).not.toHaveBeenCalled();
    expect(screen.getByTestId('resubmit-stub')).toHaveTextContent('closed');
  });

  it('reads the pod, then opens the resubmit sheet prefilled from the declined move', async () => {
    mockRequest.mockResolvedValue({ pod });
    const { onClose } = mount();
    await waitFor(() =>
      expect(screen.getByTestId('resubmit-stub')).toHaveTextContent('pod-1 @ 320'),
    );
    expect(mockRequest).toHaveBeenCalledWith(
      VenueChatResubmitPodDocument,
      { podId: 'pod-1' },
      { auth: true },
    );
    // A sent offer closes the sheet; its own OFFER line re-reads the thread's offer.
    fireEvent.press(screen.getByTestId('resubmit-stub'));
    expect(onClose).toHaveBeenCalled();
  });

  it('says so and closes when the pod cannot be read', async () => {
    mockRequest.mockResolvedValue({ pod: null });
    const first = mount();
    await waitFor(() =>
      expect(first.onError).toHaveBeenCalledWith('Could not open a new offer. Please try again.'),
    );
    expect(first.onClose).toHaveBeenCalled();
    first.unmount();

    mockRequest.mockRejectedValue(new Error('Not your pod'));
    const second = mount();
    await waitFor(() => expect(second.onError).toHaveBeenCalledWith('Not your pod'));
    expect(second.onClose).toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalledWith('venueChat', 'resubmitPod', {
      podId: 'pod-1',
      error: expect.any(Error),
    });
  });

  it('drops an answer that lands after the sheet was closed', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    let reject: (error: unknown) => void = () => undefined;
    mockRequest
      .mockImplementationOnce(
        () =>
          new Promise((ok) => {
            resolve = ok;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((_ok, fail) => {
            reject = fail;
          }),
      );
    const move = offerMove({ event: 'DECLINED', by: 'VENUE' });
    const spies = { onClose: jest.fn(), onError: jest.fn() };
    const view = renderWithProviders(<VenueChatResubmit podId="pod-1" move={move} {...spies} />);
    view.rerender(<VenueChatResubmit podId="pod-1" move={{ ...move, round: 2 }} {...spies} />);
    view.rerender(<VenueChatResubmit podId="pod-1" move={null} {...spies} />);
    resolve({ pod });
    reject(new Error('late'));
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
    expect(spies.onError).not.toHaveBeenCalled();
    expect(screen.getByTestId('resubmit-stub')).toHaveTextContent('closed');
  });
});
