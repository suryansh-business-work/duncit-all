import {
  HOME_TOUR_ID,
  TOURS,
  findTour,
  isTourCompleted,
  shouldAutoStartHomeTour,
  toursForRoles,
  type TourId,
} from '@duncit/tours';
import { defineDemo, defineDemos } from '../types';

interface ViewerMock {
  roles: string[];
  /** Ids of tours this account has finished, from its stored list. */
  completed: TourId[];
  is_first_signup: boolean;
  open_tour: string;
}

export default defineDemos('tours', [
  defineDemo<ViewerMock>({
    id: 'gating',
    title: 'Which tours this viewer is even offered',
    note:
      'Take HOST out of roles: the host-only tours disappear rather than showing disabled, because they walk through screens this account cannot open.',
    mock: {
      roles: ['USER', 'HOST'],
      completed: ['home'],
      is_first_signup: false,
      open_tour: 'home',
    },
    compute: (mock) => {
      const offered = toursForRoles(mock.roles);
      return {
        'Tours in the registry': TOURS.length,
        'Offered to this viewer': offered.map((tour) => tour.id),
        'Hidden by role': TOURS.filter((tour) => !offered.includes(tour)).map((tour) => tour.id),
        'findTour(open_tour)': findTour(mock.open_tour)?.title ?? 'no such tour',
        'Home tour finished': isTourCompleted(mock.completed, HOME_TOUR_ID),
        'Auto-start the home tour': shouldAutoStartHomeTour(mock.completed, mock.is_first_signup),
      };
    },
  }),
]);
