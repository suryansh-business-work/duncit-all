import {
  formatTutorialDuration,
  hasTutorialFilters,
  hasWatchedEnough,
  parseTutorialFilters,
  tutorialFeedVariables,
  tutorialFilterParams,
  tutorialShareUrl,
  withFocusedFirst,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';

interface TutorialsMock {
  /** The query string a Tutorials link carried. */
  query: string;
  /** Seconds played, and the video's length. */
  position: number;
  duration: number;
  /** The ids on the page the feed returned, in server order. */
  pageIds: string[];
}

export const tutorialsDemos: PackageDemo[] = [
  defineDemo<TutorialsMock>({
    id: 'tutorials',
    title: 'tutorials — the Learnings feed filters, the watched rule and the share link',
    note:
      'query is the URL both apps read the filters from: change lang to "fr" and it is ignored, add v=<id> and that tutorial moves to the front of the page. position/duration is the watched rule — it flips to true at 90% of the video, and a zero duration never counts (the player\'s ended event covers it).',
    mock: {
      query: 'q=pods&topic=joining-pods&lang=hi&v=t3',
      position: 135,
      duration: 150,
      pageIds: ['t1', 't2', 't3'],
    },
    compute: ({ query, position, duration, pageIds }) => {
      const params = new URLSearchParams(query);
      const filters = parseTutorialFilters((name) => params.get(name));
      return {
        filters,
        narrowed: hasTutorialFilters(filters),
        urlParams: tutorialFilterParams(filters),
        feedVariables: tutorialFeedVariables(filters),
        watched: hasWatchedEnough(position, duration),
        length: formatTutorialDuration(duration),
        pageOrder: withFocusedFirst(pageIds.map((id) => ({ id })), filters.focus).map((row) => row.id),
        shareUrl: tutorialShareUrl('https://app.duncit.com', 't3'),
      };
    },
  }),
];
