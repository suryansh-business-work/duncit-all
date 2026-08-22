import { deriveSearchItems } from '@duncit/shell';
import { defineDemo, defineDemos } from '../types';

interface NavMock {
  /** A portal's sidebar, exactly as it is declared in its app-config. */
  nav: {
    label: string;
    to?: string;
    children?: { label: string; to?: string; children?: { label: string; to: string }[] }[];
  }[];
  query: string;
}

export default defineDemos('shell', [
  defineDemo<NavMock>({
    id: 'search',
    title: 'The header search is the sidebar, flattened',
    note:
      'Nothing declares a search index. Add a page to nav and it is instantly findable — which is why a portal cannot ship a route the search does not know about.',
    mock: {
      query: 'log',
      nav: [
        { label: 'Dashboard', to: '/' },
        {
          label: 'Telemetry',
          children: [
            { label: 'Dashboard', to: '/telemetry' },
            { label: 'Logs', to: '/telemetry/logs' },
            { label: 'Log settings', to: '/telemetry/logs-settings' },
          ],
        },
        {
          label: 'Emails',
          children: [
            { label: 'Templates', to: '/emails/templates' },
            { label: 'Logs', to: '/emails/logs' },
          ],
        },
        { label: 'Package Documentation', to: '/packages-docs' },
      ],
    },
    compute: (mock) => {
      const items = deriveSearchItems(mock.nav);
      const term = mock.query.trim().toLowerCase();
      return {
        'Pages the search knows': items.length,
        'Every entry': items.map((item) =>
          item.section ? `${item.section} › ${item.label} (${item.to})` : `${item.label} (${item.to})`
        ),
        [`Matches for "${mock.query}"`]: items
          .filter((item) => item.label.toLowerCase().includes(term))
          .map((item) => `${item.section ?? ''} ${item.label}`.trim()),
        'A parent with no `to`':
          'contributes its children and nothing of its own — a section header is not a page.',
      };
    },
  }),
]);
