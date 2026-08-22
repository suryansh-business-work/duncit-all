import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { DuncitTabs, TAB_PARAM } from '@duncit/tabs';
import { defineDemo, defineDemos } from '../types';

interface TabsMock {
  items: { value: string; label: string; disabled?: boolean }[];
  initial: string;
}

export default defineDemos('tabs', [
  defineDemo<TabsMock>({
    id: 'strip',
    title: 'The one tab strip every portal and mWeb renders',
    note:
      'Built from an items array, never from hand-written children — which is what guarantees each tab has a real value instead of a bare index in the URL. Add an item to the mock and it appears.',
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
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      />
      <Typography variant="body2" sx={{ mt: 2 }}>
        Selected: <strong>{value}</strong> — in a real page this is{' '}
        <code>?{TAB_PARAM}={value}</code>, so a reload and a shared link both land here.
      </Typography>
    </Box>
  );
}
