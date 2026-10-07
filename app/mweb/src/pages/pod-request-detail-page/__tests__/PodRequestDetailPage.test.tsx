import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { MemoryRouter, Route, Routes } from 'react-router';

import PodRequestDetailPage from '..';
import { POD_PARTNER_REQUEST, type PodRequestDetail } from '../../pod-requests/queries';
import { VENUE_AVAILABLE_SLOTS } from '../../create-pod-page/create-pod/venueSlots';
import { interpolatedCopy } from '../../pod-requests/__tests__/interpolatedCopy';

/*
  The four writes have their own suite (usePodRequestActions). This page owns
  WHICH of them the viewer is offered and with what — so the hook is a stand-in
  whose calls are read back.
*/
const actions = vi.hoisted(() => ({
  error: '',
  clearError: vi.fn(),
  busy: false,
  respond: vi.fn(async () => true),
  withdraw: vi.fn(async () => true),
  requestSlot: vi.fn(async () => true),
  respondSlot: vi.fn(async () => true),
}));
vi.mock('../../pod-requests/usePodRequestActions', () => ({ usePodRequestActions: () => actions }));

vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({
    formatDate: (d: string) => `date:${d}`,
    formatDateTime: (d: string) => `dt:${d}`,
    formatTime: (d: string) => `time:${d}`,
  }),
}));

vi.mock('../../create-pod-page/create-pod/SlotPicker', () => ({
  default: ({ slots, onPick }: { slots: { id: string }[]; onPick: (s: { id: string }) => void }) => (
    <div data-testid="slot-picker">
      {slots.map((slot) => (
        <button key={slot.id} type="button" onClick={() => onPick(slot)} data-testid={`slot-${slot.id}`}>
          {slot.id}
        </button>
      ))}
    </div>
  ),
}));

/** ContactBlock's own lookup of the pod's public address (the document is private to it). */
const POD_LINK = gql`
  query PodRequestPodLink($pod_doc_id: ID!) {
    pod(pod_doc_id: $pod_doc_id) {
      id
      pod_id
      club_slug
    }
  }
`;

const VENUE: NonNullable<PodRequestDetail['venue']> = {
  id: 'venue-1',
  venue_name: 'Gomti Arena',
  category: 'Sports',
  venue_type: 'Turf',
  capacity: 40,
  locality: 'Gomti Nagar',
  city: 'Lucknow',
  cover_image_url: '',
};

const request = (over: Partial<PodRequestDetail> = {}): PodRequestDetail => ({
  id: 'req-1',
  direction: 'VENUE_TO_HOST',
  status: 'REQUESTED',
  viewer_side: 'HOST',
  note: 'Morning run, 20 people',
  distance_km: 2.345,
  venue: VENUE,
  host: { user_id: 'host-1', name: 'Asha', photo_url: '', categories: ['Running', 'Cycling'] },
  slot: null,
  pod_id: null,
  contact: null,
  created_at: '2026-10-01T10:00:00.000Z',
  ...over,
});

const typed = (req: PodRequestDetail) => ({
  __typename: 'PodPartnerRequest',
  ...req,
  venue: req.venue && { __typename: 'PartnerVenueSummary', ...req.venue },
  host: req.host && { __typename: 'PartnerHostSummary', ...req.host },
  slot: req.slot && { __typename: 'PartnerRequestSlot', ...req.slot },
  contact: req.contact && { __typename: 'PartnerContact', ...req.contact },
});

const detailMock = (req: PodRequestDetail | null): MockedResponse => ({
  request: { query: POD_PARTNER_REQUEST, variables: { id: 'req-1' } },
  result: { data: { podPartnerRequest: req && typed(req) } },
});

function renderPage(mocks: MockedResponse[]) {
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter initialEntries={['/pod-requests/req-1']}>
        <Routes>
          <Route path="/pod-requests/:id" element={<PodRequestDetailPage />} />
          <Route path="/host/manage" element={<p>host studio</p>} />
          <Route path="/venues/manage" element={<p>venue studio</p>} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );
}

const showPage = async (req: PodRequestDetail, extra: MockedResponse[] = []) => {
  renderPage([detailMock(req), ...extra]);
  return screen.findByTestId('pod-request-counterpart');
};

beforeEach(() => {
  vi.clearAllMocks();
  actions.error = '';
  actions.busy = false;
});

describe('PodRequestDetailPage — states', () => {
  it('shows a placeholder while the request loads', () => {
    renderPage([detailMock(request())]);

    expect(screen.getByTestId('pod-request-detail-title')).toHaveTextContent('Pod Request');
    expect(screen.queryByTestId('pod-request-counterpart')).not.toBeInTheDocument();
  });

  it("shows the server's refusal when the request cannot be read", async () => {
    renderPage([
      {
        request: { query: POD_PARTNER_REQUEST, variables: { id: 'req-1' } },
        result: { errors: [new GraphQLError('You are not part of this Pod Request.')] },
      },
    ]);

    expect(await screen.findByText('You are not part of this Pod Request.')).toBeInTheDocument();
  });

  it('says the request could not be found when none comes back', async () => {
    renderPage([detailMock(null)]);

    expect(await screen.findByText('This Pod Request could not be found.')).toBeInTheDocument();
  });

  it('shows a failed write above the actions and dismisses it', async () => {
    actions.error = 'This request was already answered.';
    await showPage(request());

    const alert = screen.getByTestId('pod-request-action-error');
    expect(alert).toHaveTextContent('This request was already answered.');
    fireEvent.click(within(alert).getByRole('button'));
    expect(actions.clearError).toHaveBeenCalled();
  });
});

describe('PodRequestDetailPage — who it is with', () => {
  it('shows a host the venue: name, category · type, capacity, place, distance and the note', async () => {
    const card = await showPage(request());

    expect(within(card).getByText('Venue')).toBeInTheDocument();
    expect(within(card).getByRole('heading', { name: 'Gomti Arena' })).toBeInTheDocument();
    expect(within(card).getByText('Sports · Turf')).toBeInTheDocument();
    expect(within(card).getByText(interpolatedCopy('Capacity', 40))).toBeInTheDocument();
    expect(within(card).getByText('Gomti Nagar, Lucknow')).toBeInTheDocument();
    // Rounded to one decimal.
    expect(within(card).getByText(interpolatedCopy('', '2.3', 'km away'))).toBeInTheDocument();
    expect(within(card).getByText('Morning run, 20 people')).toBeInTheDocument();
    expect(screen.getByTestId('pod-request-status')).toHaveTextContent('Requested');
  });

  it('shows a venue owner the host, and leaves out an unknown distance, a zero capacity and an empty note', async () => {
    const card = await showPage(
      request({ viewer_side: 'VENUE', distance_km: null, note: '', venue: { ...VENUE, capacity: 0 } }),
    );

    expect(within(card).getByText('Host')).toBeInTheDocument();
    expect(within(card).getByRole('heading', { name: 'Asha' })).toBeInTheDocument();
    expect(within(card).getByText('Running · Cycling')).toBeInTheDocument();
    expect(within(card).queryByText(/km away/)).not.toBeInTheDocument();
    expect(within(card).queryByText(/Capacity/)).not.toBeInTheDocument();
    expect(within(card).queryByText('Note')).not.toBeInTheDocument();
  });

  it('shows a timed slot as its start and end, on its space', async () => {
    await showPage(
      request({
        status: 'SLOT_REQUESTED',
        slot: { id: 's1', start_at: 'S', end_at: 'E', whole_day: false, price: 500, space_label: 'Court A' },
      }),
    );

    const slot = screen.getByTestId('pod-request-slot');
    expect(within(slot).getByText('dt:S – time:E')).toBeInTheDocument();
    expect(within(slot).getByText('Court A')).toBeInTheDocument();
  });

  it('shows a whole-day slot as its day, on the whole venue', async () => {
    await showPage(
      request({
        status: 'SLOT_REQUESTED',
        slot: { id: 's1', start_at: 'S', end_at: 'E', whole_day: true, price: 0, space_label: '' },
      }),
    );

    const slot = screen.getByTestId('pod-request-slot');
    expect(within(slot).getByText('date:S · Whole day')).toBeInTheDocument();
    expect(within(slot).getByText('Whole venue')).toBeInTheDocument();
  });

  it.each([
    ['HOST', 'host studio'],
    ['VENUE', 'venue studio'],
  ] as const)('Back takes a %s viewer to their studio', async (side, studio) => {
    await showPage(request({ viewer_side: side }));

    fireEvent.click(screen.getByTestId('pod-request-detail-back'));

    expect(await screen.findByText(studio)).toBeInTheDocument();
  });
});

describe('PodRequestDetailPage — the next move', () => {
  it('RESPOND: the receiver accepts or declines the request', async () => {
    await showPage(request());

    fireEvent.click(screen.getByTestId('pod-request-respond-accept'));
    fireEvent.click(screen.getByTestId('pod-request-respond-decline'));

    expect(actions.respond).toHaveBeenNthCalledWith(1, 'req-1', true);
    expect(actions.respond).toHaveBeenNthCalledWith(2, 'req-1', false);
    expect(screen.getByTestId('pod-request-contact-hidden')).toHaveTextContent(
      'Contact details are shared once the pod is created.',
    );
  });

  it('WITHDRAW: the sender waits for an answer and may withdraw', async () => {
    await showPage(request({ direction: 'HOST_TO_VENUE' }));

    expect(screen.getByText('Waiting for the other side to answer.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pod-request-withdraw'));

    expect(actions.withdraw).toHaveBeenCalledWith('req-1');
    expect(screen.queryByTestId('pod-request-respond')).not.toBeInTheDocument();
  });

  it('WITHDRAW is unavailable while a write is in flight', async () => {
    actions.busy = true;
    await showPage(request({ direction: 'HOST_TO_VENUE' }));

    expect(screen.getByTestId('pod-request-withdraw')).toBeDisabled();
  });

  it("PICK_SLOT: the receiver picks one of the venue's open slots and sends it", async () => {
    await showPage(request({ status: 'ACCEPTED' }), [
      {
        request: { query: VENUE_AVAILABLE_SLOTS, variables: { venue_id: 'venue-1' } },
        result: {
          data: {
            venueAvailableSlots: [
              {
                __typename: 'VenueSlot',
                id: 'slot-9',
                start_at: '2026-10-10T10:00:00.000Z',
                end_at: '2026-10-10T12:00:00.000Z',
                whole_day: false,
                price: 0,
                space_label: '',
                capacity: 20,
                status: 'OPEN',
              },
            ],
          },
        },
      },
    ]);

    expect(screen.getByTestId('pod-request-pick-slot')).toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('slot-slot-9'));
    fireEvent.click(screen.getByTestId('pod-request-send-slot'));

    expect(actions.requestSlot).toHaveBeenCalledWith('req-1', 'slot-9');
  });

  it('PICK_SLOT without a venue on the request offers nothing to pick', async () => {
    await showPage(request({ status: 'ACCEPTED', venue: null }));

    expect(screen.queryByTestId('pod-request-pick-slot')).not.toBeInTheDocument();
  });

  it.each([
    ['WAIT_SLOT', { direction: 'HOST_TO_VENUE', status: 'ACCEPTED' }, 'Waiting for the other side to pick a slot.'],
    ['WAIT_CONFIRM', { status: 'SLOT_REQUESTED' }, 'Waiting for the other side to confirm the slot.'],
    [
      'HOST_CREATES',
      { status: 'SLOT_CONFIRMED', viewer_side: 'VENUE' },
      'The slot is confirmed. The host creates the pod next.',
    ],
  ] as const)('%s: says whose move it is', async (_action, over, text) => {
    await showPage(request(over));

    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByTestId('pod-request-create-pod')).not.toBeInTheDocument();
    expect(screen.getByTestId('pod-request-contact-hidden')).toBeInTheDocument();
  });

  it('CONFIRM_SLOT: the sender confirms or declines the picked slot', async () => {
    await showPage(request({ direction: 'HOST_TO_VENUE', status: 'SLOT_REQUESTED' }));

    expect(screen.getByTestId('pod-request-slot-answer-accept')).toHaveTextContent('Confirm slot');
    fireEvent.click(screen.getByTestId('pod-request-slot-answer-accept'));
    fireEvent.click(screen.getByTestId('pod-request-slot-answer-decline'));

    expect(actions.respondSlot).toHaveBeenNthCalledWith(1, 'req-1', true);
    expect(actions.respondSlot).toHaveBeenNthCalledWith(2, 'req-1', false);
  });

  it('CREATE_POD: the host opens Create Pod carrying the request id', async () => {
    await showPage(request({ status: 'SLOT_CONFIRMED' }));

    const create = screen.getByTestId('pod-request-create-pod');
    expect(create).toHaveTextContent('Create Pod');
    expect(create).toHaveAttribute('href', '/create-pod?partner_request_id=req-1');
  });

  it('DONE: shares the contact and links to the pod once it exists', async () => {
    await showPage(
      request({
        status: 'POD_CREATED',
        pod_id: 'pod-doc-1',
        contact: { phone: '+919999999999', email: 'venue@example.com', address: '12 Park Road' },
      }),
      [
        {
          request: { query: POD_LINK, variables: { pod_doc_id: 'pod-doc-1' } },
          result: { data: { pod: { __typename: 'Pod', id: 'pod-doc-1', pod_id: 'sunrise-run', club_slug: 'runners' } } },
        },
      ],
    );

    const contact = screen.getByTestId('pod-request-contact');
    expect(within(contact).getByText('+919999999999')).toHaveAttribute('href', 'tel:+919999999999');
    expect(within(contact).getByText('venue@example.com')).toHaveAttribute('href', 'mailto:venue@example.com');
    expect(within(contact).getByText('12 Park Road')).toBeInTheDocument();
    expect(screen.queryByTestId('pod-request-contact-hidden')).not.toBeInTheDocument();
    expect(await screen.findByTestId('pod-request-view-pod')).toHaveAttribute('href', '/club/runners/pod/sunrise-run');
  });

  it('DONE without an address shares only phone and email', async () => {
    await showPage(
      request({ status: 'POD_CREATED', contact: { phone: '+919999999999', email: 'venue@example.com', address: null } }),
    );

    const contact = screen.getByTestId('pod-request-contact');
    expect(within(contact).queryByText('Address')).not.toBeInTheDocument();
    expect(within(contact).getByText('Phone')).toBeInTheDocument();
  });

  it('shows a failed pod lookup as an error next to the contact', async () => {
    await showPage(
      request({
        status: 'POD_CREATED',
        pod_id: 'pod-doc-1',
        contact: { phone: '+919999999999', email: 'venue@example.com', address: null },
      }),
      [{ request: { query: POD_LINK, variables: { pod_doc_id: 'pod-doc-1' } }, error: new Error('Pod lookup failed') }],
    );

    expect(await screen.findByText('Pod lookup failed')).toBeInTheDocument();
    expect(screen.queryByTestId('pod-request-view-pod')).not.toBeInTheDocument();
  });

  it.each(['REJECTED', 'CANCELLED', 'EXPIRED'] as const)('%s: a closed request offers no move and keeps contact hidden', async (status) => {
    await showPage(request({ status }));

    expect(screen.queryByTestId('pod-request-respond')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pod-request-withdraw')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('pod-request-contact-hidden')).toBeInTheDocument();
  });
});
