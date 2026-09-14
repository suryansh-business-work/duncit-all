import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  OFFER_POD_CHANGE,
  POD_CHANGE_CANDIDATES,
  POD_CHANGE_VENUE_SLOTS,
  type PodChangeCandidateRow,
  type PodChangeSlotRow,
} from '@duncit/pod-change-requests';
import type { PodChangeRow } from '@duncit/utils';
import { renderWithProviders } from '../../../../__tests__/testkit';
import AssignDrawer from '../AssignDrawer';
import { gqlCandidate, gqlRequest, gqlSlot, makeCandidate, makeOffer, makeRequest, makeSlot } from './fixtures';

const SENT = 'Request sent. They will get an email, a WhatsApp message and an app notification.';

const candidatesMock = (rows: PodChangeCandidateRow[], requestId = 'req-doc-1', delay = 0): MockedResponse => ({
  request: { query: POD_CHANGE_CANDIDATES, variables: { request_id: requestId } },
  result: { data: { podChangeCandidates: rows.map(gqlCandidate) } },
  delay,
});

const slotsMock = (rows: PodChangeSlotRow[], delay = 0): MockedResponse => ({
  request: { query: POD_CHANGE_VENUE_SLOTS, variables: { request_id: 'req-doc-1', venue_id: 'venue-2' } },
  result: { data: { podChangeVenueSlots: rows.map(gqlSlot) } },
  delay,
});

const offeredRow = gqlRequest(makeRequest({ status: 'OFFERED', offer: makeOffer() }));

const offerMock = (input: Record<string, string>, result: MockedResponse['result']): MockedResponse => ({
  request: { query: OFFER_POD_CHANGE, variables: { input: { request_id: 'req-doc-1', ...input } } },
  result,
});

const renderDrawer = (request: PodChangeRow | null, mocks: MockedResponse[] = []) => {
  const onClose = vi.fn();
  const onOffered = vi.fn();
  renderWithProviders(<AssignDrawer request={request} onClose={onClose} onOffered={onOffered} />, { mocks });
  return { onClose, onOffered };
};

const harnessClose = vi.fn();
const harnessOffered = vi.fn();

/** Hands the open drawer a different request, the way the queue does. */
function Harness({ first, next }: Readonly<{ first: PodChangeRow; next: PodChangeRow }>) {
  const [request, setRequest] = useState<PodChangeRow>(first);
  return (
    <>
      <button type="button" onClick={() => setRequest(next)}>
        Next request
      </button>
      <AssignDrawer request={request} onClose={harnessClose} onOffered={harnessOffered} />
    </>
  );
}

describe('AssignDrawer / frame', () => {
  it('renders nothing without a request', () => {
    renderDrawer(null);
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    expect(screen.queryByText('Find a replacement')).not.toBeInTheDocument();
  });

  it('heads the drawer with the request, the tab’s hint and the partner’s reason', async () => {
    renderDrawer(makeRequest(), [candidatesMock([makeCandidate()])]);
    expect(screen.getByText('Find a replacement')).toBeInTheDocument();
    expect(screen.getByText('DUN-CR-1042 · Sunday board games')).toBeInTheDocument();
    expect(screen.getByText(/Approved venues that host this pod’s category/)).toBeInTheDocument();
    expect(screen.getByText('Our terrace is being renovated that weekend.')).toBeInTheDocument();
    expect(screen.getByText('Reason:')).toBeInTheDocument();
    expect(await screen.findByText('Dialogues Cafe, Koramangala')).toBeInTheDocument();
  });

  it('leaves out the reason when the partner gave none, and closes from the cross', async () => {
    const { onClose } = renderDrawer(makeRequest({ role: 'CLUB_ADMIN', reason: '' }), [candidatesMock([])]);
    expect(screen.getByText(/Club admins running a club in this pod’s category and city/)).toBeInTheDocument();
    expect(screen.queryByText('Reason:')).not.toBeInTheDocument();
    expect(await screen.findByText(/Nobody matches this pod’s category and city yet/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows placeholders while the candidates load', async () => {
    renderDrawer(makeRequest(), [candidatesMock([makeCandidate()], 'req-doc-1', 40)]);
    expect(document.querySelectorAll('.MuiSkeleton-root')).toHaveLength(2);
    expect(await screen.findByText('Dialogues Cafe, Koramangala')).toBeInTheDocument();
    expect(document.querySelectorAll('.MuiSkeleton-root')).toHaveLength(0);
  });
});

describe('AssignDrawer / host and club admin', () => {
  it('sends a host the offer straight from the list, reports it and closes', async () => {
    const host = makeCandidate({ id: 'cand-h', user_id: 'user-host-7', label: 'Meera Iyer', venue_id: null });
    const { onClose, onOffered } = renderDrawer(makeRequest({ role: 'HOST' }), [
      candidatesMock([host]),
      offerMock({ user_id: 'user-host-7' }, { data: { offerPodChange: offeredRow } }),
    ]);
    expect(screen.getByText(/Approved hosts onboarded into this pod’s category/)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(onOffered).toHaveBeenCalledWith(SENT));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the server’s refusal and keeps the drawer open', async () => {
    const host = makeCandidate({ id: 'cand-h', user_id: 'user-host-7', label: 'Meera Iyer', venue_id: null });
    const { onClose, onOffered } = renderDrawer(makeRequest({ role: 'HOST' }), [
      candidatesMock([host]),
      offerMock({ user_id: 'user-host-7' }, { errors: [new GraphQLError('Meera already hosts a pod then')] }),
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Send request' }));
    expect(await screen.findByText('Meera already hosts a pod then')).toBeInTheDocument();
    expect(onOffered).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('AssignDrawer / venue', () => {
  it('moves from the venue to its slots and sends the slot picked', async () => {
    const { onClose, onOffered } = renderDrawer(makeRequest(), [
      candidatesMock([makeCandidate()]),
      slotsMock([makeSlot()], 40),
      offerMock(
        { user_id: 'user-venue-2', venue_id: 'venue-2', venue_slot_id: 'slot-1' },
        { data: { offerPodChange: offeredRow } },
      ),
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Slot' }));
    expect(screen.getByText('Pick a slot at Dialogues Cafe, Koramangala')).toBeInTheDocument();
    expect(document.querySelectorAll('.MuiSkeleton-root')).toHaveLength(2);

    fireEvent.click(await screen.findByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(onOffered).toHaveBeenCalledWith(SENT));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('goes back to the venues from the slot step', async () => {
    renderDrawer(makeRequest(), [candidatesMock([makeCandidate()]), slotsMock([])]);

    fireEvent.click(await screen.findByRole('button', { name: 'Slot' }));
    expect(await screen.findByText('This venue has no free slots. Pick a different venue.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to the list' }));
    expect(screen.queryByText('Pick a slot at Dialogues Cafe, Koramangala')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Slot' })).toBeInTheDocument();
  });

  it('does not ask for slots at a venue candidate with no venue behind it', async () => {
    const orphan = makeCandidate({ id: 'cand-x', label: 'Unlisted venue', venue_id: null });
    renderDrawer(makeRequest(), [candidatesMock([orphan])]);

    fireEvent.click(await screen.findByRole('button', { name: 'Slot' }));
    expect(screen.getByText('Pick a slot at Unlisted venue')).toBeInTheDocument();
    expect(screen.getByText('This venue has no free slots. Pick a different venue.')).toBeInTheDocument();
  });

  it('forgets the venue picked when handed a different request', async () => {
    renderWithProviders(
      <Harness first={makeRequest()} next={makeRequest({ id: 'req-doc-2', change_request_no: 'DUN-CR-1043' })} />,
      { mocks: [candidatesMock([makeCandidate()]), slotsMock([]), candidatesMock([], 'req-doc-2')] },
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Slot' }));
    expect(screen.getByText('Pick a slot at Dialogues Cafe, Koramangala')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next request', hidden: true }));
    expect(screen.getByText('DUN-CR-1043 · Sunday board games')).toBeInTheDocument();
    expect(screen.queryByText(/Pick a slot at/)).not.toBeInTheDocument();
    expect(await screen.findByText(/Nobody matches this pod’s category and city yet/)).toBeInTheDocument();
  });
});
