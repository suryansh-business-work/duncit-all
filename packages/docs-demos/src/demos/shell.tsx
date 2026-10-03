import {
  BrandAnalyticsReport,
  deriveSearchItems,
  formatGmtOffset,
  trendBarPercents,
  trendPeak,
  withSeconds,
  zoneChoices,
  type BrandAnalytics,
} from '@duncit/shell';
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
      'Seconds go where the MINUTES are, not on the end — appending to a 12-hour pattern gives "07:04 PM:22". Change timeFormat below and watch both forms move together. The zone rows below are what the tray lists: offset first, then the id, then whatever this machine calls the zone.',
    mock: {
      timeFormat: 'hh:mm a',
      alsoTry: ['HH:mm', 'HH:mm:ss', 'h a'],
      zoneSearch: 'Kolkata',
    },
    compute: (mock) => {
      const zones = zoneChoices();
      const term = mock.zoneSearch.trim().toLowerCase();
      return {
        'The admin pattern': mock.timeFormat,
        'Counting seconds': withSeconds(mock.timeFormat),
        'Every other pattern': mock.alsoTry.map((pattern) => `${pattern} → ${withSeconds(pattern)}`),
        'Zones this browser knows': zones.length,
        'Earliest and latest offset': `${formatGmtOffset(zones[0]?.offset ?? 0)} → ${formatGmtOffset(
          zones[zones.length - 1]?.offset ?? 0
        )}`,
        [`Zones matching "${mock.zoneSearch}"`]: zones
          .filter((zone) => zone.value.toLowerCase().includes(term))
          .map((zone) => `(${zone.gmt}) ${zone.value} · ${zone.name}`),
        'Why a fraction, not a pixel':
          'the Agent tab stores how far DOWN its edge it sits (0 to 1), so a tab placed on a 4K monitor is still reachable on a laptop.',
      };
    },
  }),
  defineDemo<BrandAnalytics>({
    id: 'brand-analytics',
    title: "A brand's sales, exactly as brandAnalytics answers",
    note:
      'The body BrandAnalyticsPanel shows under its 7 / 30 / 90-day selector. Set orders to 0 for the empty-window line, or empty top_products to see the table give way. BrandLogsPanel reads a live table query, so it has no sandbox here.',
    mock: {
      days: 7,
      since: '2026-09-28T00:00:00.000Z',
      orders: 46,
      units_sold: 71,
      gross_revenue: 58450,
      net_earnings: 49682,
      average_order_value: 1271,
      product_views: 3120,
      product_clicks: 488,
      total_products: 12,
      live_products: 9,
      trend: [
        { date: '2026-09-28', orders: 4, gross_revenue: 5100 },
        { date: '2026-09-29', orders: 7, gross_revenue: 8800 },
        { date: '2026-09-30', orders: 5, gross_revenue: 6350 },
        { date: '2026-10-01', orders: 9, gross_revenue: 11400 },
        { date: '2026-10-02', orders: 6, gross_revenue: 7600 },
        { date: '2026-10-03', orders: 11, gross_revenue: 13900 },
        { date: '2026-10-04', orders: 4, gross_revenue: 5300 },
      ],
      top_products: [
        {
          product_id: '66f1a0c2e4b0a1d2c3e4f501',
          name: 'Chicken Jerky Treats',
          units_sold: 24,
          gross_revenue: 21600,
          net_earnings: 18360,
        },
        {
          product_id: '66f1a0c2e4b0a1d2c3e4f502',
          name: 'Rope Tug Toy',
          units_sold: 18,
          gross_revenue: 8100,
          net_earnings: 6885,
        },
        {
          product_id: '66f1a0c2e4b0a1d2c3e4f503',
          name: 'Orthopedic Pet Bed',
          units_sold: 6,
          gross_revenue: 17400,
          net_earnings: 14790,
        },
      ],
    },
    render: (mock) => <BrandAnalyticsReport analytics={mock} />,
    compute: (mock) => ({
      'Busiest day (orders)': trendPeak(mock.trend),
      'Bar heights (% of the busiest day)': trendBarPercents(mock.trend),
    }),
  }),
]);
