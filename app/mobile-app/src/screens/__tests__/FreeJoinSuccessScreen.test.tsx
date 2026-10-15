import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import { MobileCheckoutPodDocument } from '@/graphql/checkout';
import { FreeJoinSuccessScreen } from '@/screens/FreeJoinSuccessScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockDownloadTicket = jest.fn();
jest.mock('@/hooks/usePodHistory', () => ({
  usePodTicket: () => ({ download: mockDownloadTicket, busy: false }),
}));
const mockNavigate = jest.fn();
let mockRouteParams: { podId: string } | undefined = { podId: 'p1' };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const mockRequest = graphqlRequest as jest.Mock;

const pod = {
  id: 'p1',
  pod_id: 'pod-1',
  pod_title: 'Sunrise Run',
  pod_date_time: null,
  pod_type: 'FREE',
  pod_amount: 0,
  place_charges: [],
  pod_images_and_videos: [],
};

/** Answers the pod query with `answer`; every other request (coins, settings) with nothing. */
const answerPodWith = (answer: () => Promise<unknown>) =>
  mockRequest.mockImplementation((document: unknown) =>
    document === MobileCheckoutPodDocument ? answer() : Promise.resolve({}),
  );

beforeEach(() => {
  mockRequest.mockReset();
  mockNavigate.mockClear();
  mockDownloadTicket.mockReset().mockResolvedValue(undefined);
  mockRouteParams = { podId: 'p1' };
});

describe('FreeJoinSuccessScreen', () => {
  it('reads the joined pod and confirms the spot with no receipt or invoice', async () => {
    answerPodWith(() => Promise.resolve({ pod }));
    renderWithProviders(<FreeJoinSuccessScreen />);
    expect(screen.getByTestId('free-join-success-loading')).toBeOnTheScreen();
    expect(await screen.findByTestId('checkout-success')).toBeOnTheScreen();
    expect(mockRequest).toHaveBeenCalledWith(
      MobileCheckoutPodDocument,
      { id: 'p1' },
      { auth: true },
    );
    expect(screen.queryByTestId('free-join-success-loading')).toBeNull();
    expect(screen.getByText('Sunrise Run')).toBeOnTheScreen();
    expect(screen.getByText(/This pod is free, so there is nothing to pay\./)).toBeOnTheScreen();
    expect(screen.queryByText('Amount paid')).toBeNull();
    expect(screen.queryByTestId('download-invoice')).toBeNull();
  });

  it('downloads the ticket for this pod and routes Home and to Pod History', async () => {
    answerPodWith(() => Promise.resolve({ pod }));
    renderWithProviders(<FreeJoinSuccessScreen />);
    fireEvent.press(await screen.findByTestId('download-ticket'));
    await waitFor(() => expect(mockDownloadTicket).toHaveBeenCalledWith('p1'));
    fireEvent.press(screen.getByTestId('success-home'));
    expect(mockNavigate).toHaveBeenCalledWith('Home');
    fireEvent.press(screen.getByTestId('success-profile'));
    expect(mockNavigate).toHaveBeenCalledWith('PodHistory');
  });

  it('says the pod could not be found when the query answers with none', async () => {
    answerPodWith(() => Promise.resolve({ pod: null }));
    renderWithProviders(<FreeJoinSuccessScreen />);
    expect(await screen.findByTestId('free-join-success-error')).toHaveTextContent(
      'Pod history record not found.',
    );
    expect(screen.queryByTestId('checkout-success')).toBeNull();
  });

  it('shows and logs a failed read', async () => {
    const logError = jest.spyOn(logs.mobileApp, 'error').mockImplementation(() => undefined);
    const failure = new Error('Network down');
    answerPodWith(() => Promise.reject(failure));
    renderWithProviders(<FreeJoinSuccessScreen />);
    expect(await screen.findByTestId('free-join-success-error')).toHaveTextContent('Network down');
    expect(logError).toHaveBeenCalledWith('FreeJoinSuccessScreen', 'loadPod', {
      error: failure,
      podId: 'p1',
    });
    expect(screen.queryByTestId('free-join-success-loading')).toBeNull();
    logError.mockRestore();
  });

  it('asks for a blank pod id when the route carries none', async () => {
    mockRouteParams = undefined;
    answerPodWith(() => Promise.resolve({ pod: null }));
    renderWithProviders(<FreeJoinSuccessScreen />);
    await screen.findByTestId('free-join-success-error');
    expect(mockRequest).toHaveBeenCalledWith(MobileCheckoutPodDocument, { id: '' }, { auth: true });
  });

  // Leaving before the read lands must not write into an unmounted screen.
  it('drops an answer that lands after the screen is gone', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    answerPodWith(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const view = renderWithProviders(<FreeJoinSuccessScreen />);
    view.unmount();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await act(async () => {
      resolve({ pod });
    });
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('still logs a failure that lands after the screen is gone', async () => {
    const logError = jest.spyOn(logs.mobileApp, 'error').mockImplementation(() => undefined);
    let reject: (reason: unknown) => void = () => undefined;
    answerPodWith(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    const view = renderWithProviders(<FreeJoinSuccessScreen />);
    view.unmount();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const late = new Error('late');
    await act(async () => {
      reject(late);
    });
    expect(logError).toHaveBeenCalledWith('FreeJoinSuccessScreen', 'loadPod', {
      error: late,
      podId: 'p1',
    });
    expect(consoleError).not.toHaveBeenCalled();
    logError.mockRestore();
    consoleError.mockRestore();
  });
});
