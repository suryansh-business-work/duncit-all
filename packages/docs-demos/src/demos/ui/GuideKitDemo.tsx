import { useState } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { DuncitButton } from '@duncit/buttons';
import { EmptyState, HelpTip, PageHeader, PageIntro, PortalTour } from '@duncit/ui';
import { defineDemo } from '../../types';

interface GuideKitMock {
  page_title: string;
  help: string;
  summary: string;
  steps: string[];
  venues: string[];
  empty_title: string;
  empty_body: string;
}

/**
 * A console page as the kit frames it: the title with its help tip, the intro
 * with its steps, the list (or what stands in for one), and a tour over both.
 * The tour is started by hand here; a real page opens it once per user through
 * `useFirstRunTour`, which this sandbox would re-trigger on every mock edit.
 */
function GuideKitDemo({ mock }: Readonly<{ mock: GuideKitMock }>) {
  const [tourOpen, setTourOpen] = useState(false);
  const [cleared, setCleared] = useState(false);
  const venues = cleared ? [] : mock.venues;
  return (
    <Stack spacing={2}>
      <PageHeader
        title={
          <>
            {mock.page_title} <HelpTip title={mock.help} />
          </>
        }
      />
      <Box data-tour="guide-demo-intro">
        <PageIntro
          id="guide-demo"
          storageKey="duncit.guide.docs-demo"
          summary={mock.summary}
          steps={mock.steps}
          onStartTour={() => setTourOpen(true)}
        />
      </Box>
      <Paper variant="outlined" data-tour="guide-demo-list" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {venues.length === 0 ? (
          <EmptyState
            compact
            icon={<InboxOutlinedIcon />}
            title={mock.empty_title}
            body={mock.empty_body}
            action={
              <DuncitButton variant="contained" size="small" onClick={() => setCleared(false)}>
                Add the venues back
              </DuncitButton>
            }
          />
        ) : (
          <Stack>
            {venues.map((venue) => (
              <Typography key={venue} variant="body2" sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
                {venue}
              </Typography>
            ))}
            <Box sx={{ p: 1 }}>
              <DuncitButton variant="text" size="small" onClick={() => setCleared(true)}>
                Clear the list
              </DuncitButton>
            </Box>
          </Stack>
        )}
      </Paper>
      <PortalTour
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        steps={[
          {
            anchor: 'guide-demo-intro',
            title: 'Read this first',
            body: 'The intro says what the page is for. Its steps fold away once read, and stay folded for this page.',
          },
          {
            anchor: 'guide-demo-list',
            title: 'Then the list',
            body: 'Empty, it says what fills it and offers the action that does — never a blank panel.',
          },
        ]}
      />
    </Stack>
  );
}

export const guideKitDemo = defineDemo<GuideKitMock>({
  id: 'guide-kit',
  title: 'Guide kit — PageIntro, HelpTip, EmptyState and PortalTour on one console page',
  note:
    'Hover or tab to the info glyph beside the title. Fold the steps and reload the page: the fold is remembered. Press Start tour and the spotlight walks the intro and the list — Escape skips it. Clear the list to see the empty state, with the action that fills it again. Edit steps to add or remove one.',
  mock: {
    page_title: 'Venue payouts',
    help: 'A payout is released once the pod has completed and its door attendance is settled.',
    summary: 'Release host and venue payouts for completed pods, one cycle at a time.',
    steps: [
      'Pick a payout cycle from the filter bar.',
      'Review every line against the seats scanned at the door.',
      'Release the cycle, or hold a line with a note for Finance.',
    ],
    venues: ['Play Arena, HSR Layout', 'Smashtress, Raj Nagar Extension', 'The Turf Club, Indiranagar'],
    empty_title: 'No payouts in this cycle',
    empty_body: 'Lines appear here once a pod at one of your venues completes.',
  },
  render: (mock) => <GuideKitDemo mock={mock} />,
});
