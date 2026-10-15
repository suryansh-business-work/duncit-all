import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import { RequestEventCard } from '@/components/event-request';
import {
  MobileMyEventRequestStateDocument,
  MobileRequestEventDocument,
} from '@/graphql/event-request';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } },
}));
let mockAuthenticated = true;
jest.mock('@/hooks/useSession', () => ({
  useSession: () => ({ isAuthenticated: mockAuthenticated }),
}));

const mockRequest = graphqlRequest as jest.Mock;
const mockLogError = logs.mobileApp.error as jest.Mock;

const OPEN = { is_owner: false, requested: false, request_id: null, requested_at: null };
const REQUESTED = {
  is_owner: false,
  requested: true,
  request_id: 'r1',
  requested_at: '2026-10-15T10:00:00.000Z',
};

/** Answers the state query with `state` and the mutation with `send()`. */
function serve(state: unknown, send: () => Promise<unknown> = async () => REQUESTED) {
  mockRequest.mockImplementation((doc: unknown) => {
    if (doc === MobileMyEventRequestStateDocument) {
      return Promise.resolve({ myEventRequestState: state });
    }
    if (doc === MobileRequestEventDocument) {
      return send().then((requestEvent) => ({ requestEvent }));
    }
    return Promise.reject(new Error('unexpected document'));
  });
}

const renderVenue = () =>
  renderWithProviders(<RequestEventCard targetType="VENUE" targetId="v1" targetName="Turf One" />);
const renderHost = () =>
  renderWithProviders(<RequestEventCard targetType="HOST" targetId="h1" targetName="Asha" />);

beforeEach(() => {
  mockAuthenticated = true;
  mockRequest.mockReset();
  mockLogError.mockReset();
});

describe('RequestEventCard', () => {
  it('is hidden and asks nothing when the member is signed out', () => {
    mockAuthenticated = false;
    serve(OPEN);
    renderVenue();
    expect(screen.queryByTestId('request-event-venue')).toBeNull();
    expect(screen.queryByTestId('request-event-venue-error')).toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('shows nothing while the request state is still loading', () => {
    mockRequest.mockReturnValue(new Promise(() => undefined));
    renderVenue();
    expect(screen.queryByTestId('request-event-venue')).toBeNull();
    expect(mockRequest).toHaveBeenCalledWith(
      MobileMyEventRequestStateDocument,
      { target_type: 'VENUE', target_id: 'v1' },
      { auth: true },
    );
  });

  it('is hidden on the member’s own venue or host page', async () => {
    serve({ ...OPEN, is_owner: true });
    renderHost();
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('request-event-host')).toBeNull();
    expect(screen.queryByTestId('request-event-host-requested')).toBeNull();
    expect(screen.queryByTestId('request-event-host-error')).toBeNull();
  });

  it('says so instead of offering a second request once asked', async () => {
    serve(REQUESTED);
    renderHost();
    expect(await screen.findByTestId('request-event-host-requested')).toBeOnTheScreen();
    expect(screen.getByText('You have already requested an event')).toBeOnTheScreen();
    expect(screen.queryByTestId('request-event-host-cta')).toBeNull();
  });

  it('offers a venue request, sends the note and then shows it as requested', async () => {
    serve(OPEN);
    renderVenue();
    expect(await screen.findByTestId('request-event-venue')).toBeOnTheScreen();
    expect(screen.getByText('Nothing coming up yet')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Would you go to an event at Turf One? Ask for one and we will let you know when it is live.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('request-event-form')).toBeNull();

    fireEvent.press(screen.getByTestId('request-event-venue-cta'));
    expect(screen.getByTestId('request-event-form')).toBeOnTheScreen();
    expect(screen.getByText('Tell Turf One you would come to an event here.')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('field-note'), '  Weekend evenings  ');
    fireEvent.press(screen.getByTestId('request-event-send'));

    expect(await screen.findByTestId('request-event-venue-requested')).toBeOnTheScreen();
    expect(mockRequest).toHaveBeenCalledWith(
      MobileRequestEventDocument,
      { input: { target_type: 'VENUE', target_id: 'v1', note: 'Weekend evenings' } },
      { auth: true },
    );
    expect(screen.queryByTestId('request-event-form')).toBeNull();
    expect(screen.queryByTestId('request-event-venue-cta')).toBeNull();
  });

  it('words the card and the sheet for a host', async () => {
    serve(OPEN);
    renderHost();
    expect(
      await screen.findByText(
        'Would you join a pod by Asha? Ask for one and we will let you know when it is live.',
      ),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('request-event-host-cta'));
    expect(screen.getByText('Tell Asha you would join a pod they host.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('request-event-send'));
    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith(
        MobileRequestEventDocument,
        { input: { target_type: 'HOST', target_id: 'h1', note: '' } },
        { auth: true },
      ),
    );
  });

  it('closes the sheet without sending when cancelled', async () => {
    serve(OPEN);
    renderVenue();
    fireEvent.press(await screen.findByTestId('request-event-venue-cta'));
    fireEvent.press(screen.getByTestId('request-event-sheet-close'));
    expect(screen.queryByTestId('request-event-form')).toBeNull();
    expect(screen.getByTestId('request-event-venue-cta')).toBeOnTheScreen();
    expect(mockRequest).not.toHaveBeenCalledWith(
      MobileRequestEventDocument,
      expect.anything(),
      expect.anything(),
    );
  });

  it('locks Send while the request is going out', async () => {
    let finish!: (value: unknown) => void;
    serve(
      OPEN,
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    renderVenue();
    fireEvent.press(await screen.findByTestId('request-event-venue-cta'));
    fireEvent.press(screen.getByTestId('request-event-send'));
    await waitFor(() =>
      expect(screen.getByTestId('request-event-send')).toHaveAccessibleName('Sending…'),
    );
    expect(screen.getByTestId('request-event-send').props['aria-disabled']).toBe(true);
    await act(async () => {
      finish(REQUESTED);
    });
    expect(await screen.findByTestId('request-event-venue-requested')).toBeOnTheScreen();
  });

  it('keeps the sheet open with the note and explains when sending fails', async () => {
    serve(OPEN, () => Promise.reject(new Error('network down')));
    renderHost();
    fireEvent.press(await screen.findByTestId('request-event-host-cta'));
    fireEvent.changeText(screen.getByTestId('field-note'), 'Sunday runs');
    fireEvent.press(screen.getByTestId('request-event-send'));

    expect(await screen.findByTestId('request-event-error')).toHaveTextContent(
      "We couldn't send your request. Please try again.",
    );
    expect(screen.getByTestId('request-event-form')).toBeOnTheScreen();
    expect(screen.getByTestId('field-note').props.value).toBe('Sunday runs');
    expect(screen.getByTestId('request-event-send')).toHaveAccessibleName('Send request');
    expect(screen.queryByTestId('request-event-host-requested')).toBeNull();
    expect(mockLogError).toHaveBeenCalledWith('RequestEventCard', 'send', {
      error: expect.any(Error),
      target_type: 'HOST',
      target_id: 'h1',
    });
  });

  it('shows a retry when the state cannot be loaded, and recovers on retry', async () => {
    mockRequest.mockRejectedValueOnce(new Error('offline'));
    renderVenue();
    expect(await screen.findByTestId('request-event-venue-error')).toBeOnTheScreen();
    expect(screen.getByText("We couldn't check your request. Please try again.")).toBeOnTheScreen();
    expect(mockLogError).toHaveBeenCalledWith('RequestEventCard', 'load', {
      error: expect.any(Error),
      target_type: 'VENUE',
      target_id: 'v1',
    });

    serve(OPEN);
    fireEvent.press(screen.getByText('Retry'));
    expect(await screen.findByTestId('request-event-venue')).toBeOnTheScreen();
    expect(screen.queryByTestId('request-event-venue-error')).toBeNull();
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });
});
