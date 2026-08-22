import { buildOffsets, computeRange, filterByQuery, findRowAt } from '@duncit/virtual-scroll';
import { defineDemo, defineDemos } from '../types';

interface WindowMock {
  /** Row heights in px — a real feed mixes tall pod cards with short ad rows. */
  heights: number[];
  gap: number;
  scroll_top: number;
  viewport_height: number;
  overscan: number;
}

interface SearchMock {
  query: string;
  pods: { id: string; title: string; venue: string }[];
}

export default defineDemos('virtual-scroll', [
  defineDemo<WindowMock>({
    id: 'window',
    title: 'Which rows a feed actually has to render',
    note:
      'Scroll the list by raising scroll_top. Only start..end are mounted; leadPad and trailPad hold the scrollbar at its true length.',
    mock: {
      heights: [320, 320, 96, 320, 320, 320, 96, 320, 320, 320],
      gap: 12,
      scroll_top: 700,
      viewport_height: 800,
      overscan: 200,
    },
    compute: (mock) => {
      const offsets = buildOffsets(mock.heights, mock.gap);
      const range = computeRange({
        offsets,
        viewTop: mock.scroll_top,
        viewBottom: mock.scroll_top + mock.viewport_height,
        overscanLead: mock.overscan,
        overscanTrail: mock.overscan,
      });
      return {
        'Total scroll height': offsets[offsets.length - 1],
        'Row under the top edge': findRowAt(offsets, mock.scroll_top),
        'Rows mounted': `${range.start}..${range.end} (${range.end - range.start + 1} of ${mock.heights.length})`,
        'leadPad / trailPad': `${range.leadPad} / ${range.trailPad}`,
      };
    },
  }),

  defineDemo<SearchMock>({
    id: 'search',
    title: 'The search a virtualized list filters with',
    note:
      "Every token has to match somewhere. Try 'hsr badminton' — order does not matter, and accents are folded away.",
    mock: {
      query: 'hsr badminton',
      pods: [
        { id: 'DUN-POD-4821', title: 'Sunday Badminton Doubles', venue: 'Play Arena, HSR Layout' },
        { id: 'DUN-POD-4822', title: 'Evening Football 5s', venue: 'Turf Park, HSR Layout' },
        { id: 'DUN-POD-4823', title: 'Badminton Beginners', venue: 'Smash Court, Koramangala' },
      ],
    },
    compute: (mock) => ({
      'Matches': filterByQuery(mock.pods, mock.query, (pod) => [pod.title, pod.venue, pod.id]),
    }),
  }),
]);
