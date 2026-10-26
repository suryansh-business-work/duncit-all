import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import CounterpartCard from '../CounterpartCard';
import PodRequestDetailPage from '../PodRequestDetailPage';
import type { PodRequestDetail } from '../../queries';
import { renderWithProviders } from '../../../../__tests__/render';
import { scriptedLink } from '../../../../__tests__/groupC-link';
import { breakdown } from '../../../../__tests__/venue-chat-fixtures';
import { requestDetail, requestSlot } from '../../__tests__/fixtures';

afterEach(cleanup);

const card = (over: Record<string, unknown>) =>
  renderWithProviders(<CounterpartCard request={requestDetail(over) as unknown as PodRequestDetail} />);

describe('CounterpartCard with one side missing', () => {
  it('shows a host who is gone as an empty card with only the distance, for a venue owner', () => {
    card({ viewer_side: 'VENUE', host: null });
    expect(screen.getByText('Host')).toBeTruthy();
    expect(screen.getByText(/2\.5/)).toBeTruthy();
  });

  it('shows a host with no photo or name, for a venue owner', () => {
    card({ viewer_side: 'VENUE', host: { __typename: 'PartnerHostSummary', user_id: 'h1', name: null, photo_url: null, categories: [] } });
    expect(screen.getByText('Host')).toBeTruthy();
  });

  it('shows a venue that is gone as an empty card, for a host', () => {
    card({ viewer_side: 'HOST', venue: null });
    expect(screen.getByText('Venue')).toBeTruthy();
  });

  it('shows a venue with no photo or name, for a host', () => {
    card({
      viewer_side: 'HOST',
      venue: {
        __typename: 'PartnerVenueSummary',
        id: 'v1',
        venue_name: null,
        category: null,
        categories: [],
        venue_type: null,
        capacity: 0,
        locality: null,
        city: null,
        cover_image_url: null,
      },
    });
    expect(screen.getByText('Venue')).toBeTruthy();
  });
});

describe('PodRequestDetailPage with terms proposed for the slot', () => {
  it('shows the proposed terms under the slot the sender asked for', async () => {
    renderWithProviders(<PodRequestDetailPage side="HOST" />, {
      route: '/host/pod-requests/req-1',
      path: '/host/pod-requests/:id',
      link: scriptedLink({
        PartnersPodRequest: {
          podPartnerRequest: requestDetail({
            status: 'SLOT_REQUESTED',
            slot: requestSlot({
              offer: { __typename: 'PodRequestProposedOffer', model: 'FLAT', rate: 5000, pax: 10, quote: breakdown(5000, 5500, 10) },
            }),
          }),
        },
      }),
    });
    expect(await screen.findByTestId('pod-request-proposed-terms')).toBeTruthy();
  });
});
