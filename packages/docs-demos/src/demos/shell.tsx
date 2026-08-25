import { deriveSearchItems, supportedTimeZones, withSeconds } from '@duncit/shell';
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

interface ClockMock {
  /** The admin's `time_format`, exactly as Admin > Settings stores it. */
  timeFormat: string;
  alsoTry: string[];
  zoneSearch: string;
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
  defineDemo<ClockMock>({
    id: 'taskbar-clock',
    title: 'The taskbar clock reads the admin pattern, seconds and all',
    note:
      'Seconds go where the MINUTES are, not on the end — appending to a 12-hour pattern gives "07:04 PM:22". Change timeFormat below and watch both forms move together.',
    mock: {
      timeFormat: 'hh:mm a',
      alsoTry: ['HH:mm', 'HH:mm:ss', 'h a'],
      zoneSearch: 'Kolkata',
    },
    compute: (mock) => {
      const zones = supportedTimeZones();
      const term = mock.zoneSearch.trim().toLowerCase();
      return {
        'The admin pattern': mock.timeFormat,
        'Counting seconds': withSeconds(mock.timeFormat),
        'Every other pattern': mock.alsoTry.map((pattern) => `${pattern} → ${withSeconds(pattern)}`),
        'Zones this browser knows': zones.length,
        [`Zones matching "${mock.zoneSearch}"`]: zones.filter((zone) =>
          zone.toLowerCase().includes(term)
        ),
        'Why a fraction, not a pixel':
          'the Agent tab stores how far DOWN its edge it sits (0 to 1), so a tab placed on a 4K monitor is still reachable on a laptop.',
      };
    },
  }),
]);
