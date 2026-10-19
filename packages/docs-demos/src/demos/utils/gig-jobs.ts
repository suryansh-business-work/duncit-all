import {
  canRevealGigContact,
  gigBoardFilter,
  gigJobToValues,
  gigPlaceText,
  toGigJobInput,
  type GigJob,
  type GigJobFilter,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';

interface GigPlaceMock {
  /** The header's selected city (a Location id), '' for none. */
  selectedLocationId: string;
  /** What the viewer picked on the board; null until they touch a filter. */
  picked: GigJobFilter | null;
  job: GigJob;
}

export const gigJobsDemos: PackageDemo[] = [
  defineDemo<GigPlaceMock>({
    id: 'gig-jobs-place-and-contact',
    title: 'Where a gig is, which city the board starts on, and who gets "View contact"',
    note:
      'A gig is placed by an admin Location id plus one of its areas; the server fills the city name. Set picked to { "location_id": null } and the board shows every city even with a selected one. Set job.is_mine to true, job.status to CLOSED, or give job.contact a value and "View contact" is no longer offered. Clear job.location_id to see an old free-text gig ask for its city again on edit.',
    mock: {
      selectedLocationId: '66f1c2a9e4b0a1b2c3d4e5f6',
      picked: null,
      job: {
        id: '6710a2c4f1e2d3c4b5a69788',
        title: 'Photographer for a Sunday pottery workshop',
        category_id: '6702b1d3e4f5a6b7c8d9e0f1',
        category_title: 'Photography & Videography',
        roles: ['Photographer'],
        event_type: 'WORKSHOP',
        event_date: '2026-11-02T00:00:00.000Z',
        location_id: '66f1c2a9e4b0a1b2c3d4e5f6',
        locality: 'Gomti Nagar',
        city: 'Lucknow',
        location: 'The Clay Studio, Vipul Khand',
        description: 'Two hours of candid shots while the batch throws its first bowls.',
        budget: 5000,
        openings: 1,
        status: 'OPEN',
        poster_role: 'VENUE_OWNER',
        poster_name: 'Asha Rao',
        interest_count: 3,
        is_mine: false,
        viewer_interested: false,
        contact: null,
        created_at: '2026-10-18T10:00:00.000Z',
      },
    },
    compute: (mock) => {
      const input = toGigJobInput(gigJobToValues(mock.job));
      return {
        'Card and page say': gigPlaceText(mock.job),
        'Board queries': gigBoardFilter(mock.picked, mock.selectedLocationId),
        'Offers "View contact"': canRevealGigContact(mock.job),
        'An edit sends': { location_id: input.location_id, locality: input.locality },
      };
    },
  }),
];
