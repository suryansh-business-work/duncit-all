import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  DuncitTabs,
  TAB_PARAM,
  TAB_SEARCH_DEBOUNCE_MS,
  TabSearchDefaultProvider,
  filterTabItems,
} from '@duncit/tabs';
import { defineDemo, defineDemos } from '../types';

interface TabsMock {
  items: { value: string; label: string; disabled?: boolean }[];
  initial: string;
}

interface SurfaceMock extends TabsMock {
  /** What the surface's root says: a portal leaves it on, mWeb turns it off. */
  searchByDefault: boolean;
}

interface TabSearchMock extends TabsMock {
  /** What the reader has typed into the strip's search box. */
  typed: string;
}

export default defineDemos('tabs', [
  defineDemo<TabsMock>({
    id: 'strip',
    title: 'The one tab strip every portal and mWeb renders',
    note:
      'Built from an items array, never from hand-written children — which is what guarantees each tab has a real value instead of a bare index in the URL. Add an item to the mock and it appears. The search box at the head of the strip is on by default in a portal; `searchable={false}` is how a two-tab segmented control opts out, and mWeb turns it off for every strip at once (see the last demo).',
    mock: {
      items: [
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'past', label: 'Past' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'drafts', label: 'Drafts', disabled: true },
      ],
      initial: 'upcoming',
    },
    render: (mock) => <TabsStage mock={mock} />,
    compute: (mock) => ({
      'Query key the selection lives under': TAB_PARAM,
      'What a shared link would carry': `?${TAB_PARAM}=${mock.initial}`,
      'Why not an index':
        'MUI falls back to the child index when a tab has no value, and that index changes the moment a tab is inserted — so a shared link silently opens a different tab.',
    }),
  }),
  defineDemo<TabSearchMock>({
    id: 'search',
    title: 'The strip’s own search — debounced, client-side, tabs only',
    note:
      'Type in the box: the strip narrows as you go, one redraw per pause rather than one per keystroke. Edit `typed` to see what `filterTabItems` answers for that word — including the rule that matters, that the OPEN tab is never filtered away (a value no tab carries would drop MUI’s indicator and leave the panel below without its tab).',
    mock: {
      items: [
        { value: 'server-info', label: 'Server Info' },
        { value: 'database-info', label: 'Database Info' },
        { value: 'dns-config', label: 'DNS Config' },
        { value: 'db-backup', label: 'DB Backup' },
        { value: 'e2e-runs', label: 'E2E Runs' },
        { value: 'stress-testing', label: 'Stress Testing' },
        { value: 'graphql-monitor', label: 'GraphQL Monitor' },
      ],
      initial: 'server-info',
      typed: 'db',
    },
    render: (mock) => <TabsStage mock={mock} />,
    compute: (mock) => {
      const filtered = filterTabItems(mock.items, mock.typed, mock.initial);
      return {
        'Typed': mock.typed,
        'Tabs still shown': filtered.visible.map((item) => item.label).join(' · '),
        'Tabs the word matched': filtered.matches,
        'Open tab kept even when it does not match': mock.initial,
        'Debounce before the strip redraws': `${TAB_SEARCH_DEBOUNCE_MS}ms`,
      };
    },
  }),
  defineDemo<SurfaceMock>({
    id: 'surface-default',
    title: 'One switch per surface — portals search, mWeb does not',
    note:
      'Set `searchByDefault` to true and the box comes back: that is a portal, which mounts no provider at all. False is mWeb, whose root wraps the app in `TabSearchDefaultProvider` once — so every strip below it, including one a shared package renders, loses the box without a prop on any of them.',
    mock: {
      items: [
        { value: 'followers', label: 'Followers' },
        { value: 'following', label: 'Following' },
      ],
      initial: 'followers',
      searchByDefault: false,
    },
    render: (mock) => (
      <TabSearchDefaultProvider searchable={mock.searchByDefault}>
        <TabsStage mock={mock} />
      </TabSearchDefaultProvider>
    ),
  }),
]);

/** Hoisted: a component defined inside `render` remounts on every keystroke. */
function TabsStage({ mock }: Readonly<{ mock: TabsMock }>) {
  const [value, setValue] = useState(mock.initial);
  return (
    <Box>
      <DuncitTabs
        items={mock.items}
        value={value}
        onChange={setValue}
        variant="scrollable"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      />
      <Typography variant="body2" sx={{ mt: 2 }}>
        Selected: <strong>{value}</strong> — in a real page this is{' '}
        <code>?{TAB_PARAM}={value}</code>, so a reload and a shared link both land here.
      </Typography>
    </Box>
  );
}
