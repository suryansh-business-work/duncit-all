import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logs } from '@duncit/logs';
import { RequestEventCard, type EventRequestTarget } from '..';
import { MY_EVENT_REQUEST_STATE, REQUEST_EVENT, type MyEventRequestState } from '../queries';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => mockNavigate,
}));
const h = vi.hoisted(() => ({ notifySuccess: vi.fn() }));
vi.mock('../../notify', () => ({ notifySuccess: h.notifySuccess }));

const state = (over: Partial<MyEventRequestState> = {}): MyEventRequestState => ({
  is_owner: false,
  requested: false,
  request_id: null,
  requested_at: null,
  ...over,
});

const stateMock = (answer: MyEventRequestState | Error, targetType: EventRequestTarget = 'VENUE'): MockedResponse => ({
  request: { query: MY_EVENT_REQUEST_STATE, variables: { target_type: targetType, target_id: 't1' } },
  ...(answer instanceof Error ? { error: answer } : { result: { data: { myEventRequestState: answer } } }),
});

const requestMock = (note: string, answer: MyEventRequestState | Error): MockedResponse => ({
  request: { query: REQUEST_EVENT, variables: { input: { target_type: 'VENUE', target_id: 't1', note } } },
  ...(answer instanceof Error ? { error: answer } : { result: { data: { requestEvent: answer } } }),
});

function renderCard(mocks: MockedResponse[], targetType: EventRequestTarget = 'VENUE', url = '/venue/t1?tab=events') {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter initialEntries={[url]}>
        <RequestEventCard targetType={targetType} targetId="t1" targetName="Grand Hall" />
      </MemoryRouter>
    </MockedProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'member-token');
  mockNavigate.mockReset();
  h.notifySuccess.mockReset();
});
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('RequestEventCard — who sees what', () => {
  it('asks a signed-out visitor to sign in, coming back to this page after — and asks the server nothing', () => {
    localStorage.removeItem('token');
    const asked = vi.fn(() => true);
    renderCard([{ request: { query: MY_EVENT_REQUEST_STATE, variables: asked }, result: { data: { myEventRequestState: state() } } }]);
    const card = screen.getByTestId('request-event-venue');
    expect(card).toHaveTextContent(
      'Would you go to an event at Grand Hall? Ask for one and we will let you know when it is live.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to request an event' }));
    expect(mockNavigate).toHaveBeenCalledWith('/login?redirect=%2Fvenue%2Ft1%3Ftab%3Devents');
    expect(asked).not.toHaveBeenCalled();
  });

  it('shows a loading placeholder while it checks for an earlier request', () => {
    renderCard([stateMock(state())]);
    expect(screen.getByTestId('request-event-venue-loading')).toHaveAttribute('aria-label', 'Loading…');
    expect(screen.queryByTestId('request-event-venue-cta')).not.toBeInTheDocument();
  });

  it('offers "Request an event" with the venue’s own hint when nothing was asked yet', async () => {
    renderCard([stateMock(state())]);
    const card = await screen.findByTestId('request-event-venue');
    expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent('Nothing coming up yet');
    expect(card).toHaveTextContent('Would you go to an event at Grand Hall?');
    expect(within(card).getByTestId('request-event-venue-cta')).toHaveTextContent('Request an event');
  });

  it('words a host’s card for joining their pod', async () => {
    renderCard([stateMock(state(), 'HOST')], 'HOST');
    const card = await screen.findByTestId('request-event-host');
    expect(card).toHaveTextContent(
      'Would you join a pod by Grand Hall? Ask for one and we will let you know when it is live.',
    );
  });

  it('says the member already asked instead of offering a second request', async () => {
    renderCard([stateMock(state({ requested: true, request_id: 'er1', requested_at: '2026-10-10T10:00:00.000Z' }))]);
    const card = await screen.findByTestId('request-event-venue-requested');
    expect(card).toHaveTextContent('You have already requested an event');
    expect(card).toHaveTextContent('We will let you know as soon as there is one to join.');
    expect(screen.queryByRole('button', { name: 'Request an event' })).not.toBeInTheDocument();
  });

  it('is not shown on the member’s own venue or host page', async () => {
    const asked = vi.fn(() => true);
    renderCard([{ request: { query: MY_EVENT_REQUEST_STATE, variables: asked }, result: { data: { myEventRequestState: state({ is_owner: true }) } } }]);
    await waitFor(() => expect(asked).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByTestId('request-event-venue-loading')).not.toBeInTheDocument());
    expect(screen.queryByTestId(/^request-event-venue/)).not.toBeInTheDocument();
  });

  it('says the check failed and retries it', async () => {
    renderCard([stateMock(new Error('Network down')), stateMock(state())]);
    const error = await screen.findByTestId('request-event-venue-error');
    expect(error).toHaveTextContent("We couldn't check your request. Please try again.");
    fireEvent.click(within(error).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByTestId('request-event-venue-cta')).toBeInTheDocument();
  });
});

describe('RequestEventCard — sending a request', () => {
  const openDialog = async () => {
    fireEvent.click(await screen.findByTestId('request-event-venue-cta'));
    return screen.findByRole('dialog', { name: 'Request an event' });
  };

  it('opens the dialog addressed to the venue, and Cancel closes it without sending', async () => {
    renderCard([stateMock(state())]);
    const dialog = await openDialog();
    expect(dialog).toHaveTextContent('Tell Grand Hall you would come to an event here.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(h.notifySuccess).not.toHaveBeenCalled();
  });

  it('sends the note, confirms, closes, and flips the card to "already requested" without a re-read', async () => {
    renderCard([
      stateMock(state()),
      requestMock('Saturday evening', state({ requested: true, request_id: 'er1', requested_at: '2026-10-15T10:00:00.000Z' })),
    ]);
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Anything they should know? (optional)' }), {
      target: { value: 'Saturday evening' },
    });
    fireEvent.click(within(dialog).getByTestId('request-event-send'));

    await waitFor(() =>
      expect(h.notifySuccess).toHaveBeenCalledWith('Request sent. We will let you know when there is an event.'),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByTestId('request-event-venue-requested')).toBeInTheDocument();
  });

  it('keeps the dialog open with the reason when the send fails, and logs it', async () => {
    const error = vi.spyOn(logs.mWeb, 'error').mockImplementation(() => undefined);
    renderCard([stateMock(state()), requestMock('', new Error('Network down'))]);
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByTestId('request-event-send'));

    expect(await within(dialog).findByTestId('request-event-form-error')).toHaveTextContent(
      "We couldn't send your request. Please try again.",
    );
    expect(error).toHaveBeenCalledWith(
      'RequestEventDialog',
      'request',
      expect.objectContaining({ target_type: 'VENUE', target_id: 't1' }),
    );
    expect(h.notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
