import { useCallback, useState } from 'react';
import { Badge, Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import SosTab from './SosTab';
import CallbacksTab from './CallbacksTab';
import FeedbackTab from './FeedbackTab';
import { useBouncerSocket } from './useBouncerSocket';
import type { CallbackRequest, FeedbackEntry, SosAlert } from './queries';

type TabKey = 'sos' | 'callbacks' | 'feedback';

export default function BouncersPage() {
  const [tab, setTab] = useState<TabKey>('sos');
  const [liveSos, setLiveSos] = useState<SosAlert[]>([]);
  const [liveCallbacks, setLiveCallbacks] = useState<CallbackRequest[]>([]);
  const [liveFeedback, setLiveFeedback] = useState<FeedbackEntry[]>([]);

  const upsert = <T extends { id: string }>(setter: (fn: (prev: T[]) => T[]) => void) => (item: T) => {
    setter((prev) => {
      const next = prev.filter((p) => p.id !== item.id);
      next.unshift(item);
      return next.slice(0, 50);
    });
  };

  useBouncerSocket({
    onSos: upsert(setLiveSos),
    onSosUpdate: upsert(setLiveSos),
    onCallback: upsert(setLiveCallbacks),
    onCallbackUpdate: upsert(setLiveCallbacks),
    onFeedback: upsert(setLiveFeedback),
  });

  const clearLiveSos = useCallback(() => setLiveSos([]), []);

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Bouncers
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Live SOS alerts, callback requests, and feedback from users using the Bouncers safety tools.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v as TabKey)}>
        <Tab
          value="sos"
          label={
            <Badge color="error" badgeContent={liveSos.length} max={99}>
              <Box sx={{ pr: liveSos.length ? 2 : 0 }}>SOS Alerts</Box>
            </Badge>
          }
        />
        <Tab
          value="callbacks"
          label={
            <Badge color="warning" badgeContent={liveCallbacks.length} max={99}>
              <Box sx={{ pr: liveCallbacks.length ? 2 : 0 }}>Callback Requests</Box>
            </Badge>
          }
        />
        <Tab
          value="feedback"
          label={
            <Badge color="primary" badgeContent={liveFeedback.length} max={99}>
              <Box sx={{ pr: liveFeedback.length ? 2 : 0 }}>Live Feedback</Box>
            </Badge>
          }
        />
      </Tabs>

      <Box>
        {tab === 'sos' && <SosTab liveItems={liveSos} onClear={clearLiveSos} />}
        {tab === 'callbacks' && <CallbacksTab liveItems={liveCallbacks} />}
        {tab === 'feedback' && <FeedbackTab liveItems={liveFeedback} />}
      </Box>
    </Stack>
  );
}
