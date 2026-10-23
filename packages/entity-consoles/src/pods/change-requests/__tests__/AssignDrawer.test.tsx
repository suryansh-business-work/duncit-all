import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  OFFER_POD_CHANGE,
  POD_CHANGE_CANDIDATES,
  type PodChangeCandidateRow,
} from '@duncit/pod-change-requests';
import type { PodChangeRow } from '@duncit/utils';
import { renderWithProviders } from '../../../../__tests__/testkit';
import AssignDrawer from '../AssignDrawer';
import { gqlCandidate, gqlRequest, makeCandidate, makeOffer, makeRequest } from './fixtures';

const SENT = 'Request sent. They will get an email, a WhatsApp message and an app notification.';

const candidatesMock = (rows: PodChangeCandidateRow[], requestId = 'req-doc-1', delay = 0): MockedResponse => ({
  request: { query: POD_CHANGE_CANDIDATES, variables: { request_id: requestId } },
  result: { data: { podChangeCandidates: rows.map(gqlCandidate) } },
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
  it('offers a venue straight from the list — it answers with its own time and price', async () => {
    const { onClose, onOffered } = renderDrawer(makeRequest(), [
      candidatesMock([makeCandidate()]),
      offerMock({ user_id: 'user-venue-2', venue_id: 'venue-2' }, { data: { offerPodChange: offeredRow } }),
    ]);
    expect(screen.getByText(/it answers with the time and price it can run the pod at/)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(onOffered).toHaveBeenCalledWith(SENT));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
