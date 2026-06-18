import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  MY_PENDING_POD_FEEDBACK,
  SUBMIT_FEEDBACK,
} from '../pages/support-hub/queries';

const CATEGORIES = ['VENUE', 'HOST', 'SAFETY', 'FOOD', 'OTHER'] as const;

interface PendingPod {
  id: string;
  title: string;
}

/**
 * After a user attends a pod and returns to the app, ask how it went (Bug 6).
 * Replaces the old in-support "Live Feedback" entry with a one-time prompt.
 */
export default function PodFeedbackPrompt() {
  const [dismissed, setDismissed] = useState(false);
  const { data } = useQuery<{ myPendingPodFeedback: PendingPod | null }>(MY_PENDING_POD_FEEDBACK, {
    fetchPolicy: 'cache-and-network',
  });
  const [rating, setRating] = useState<number | null>(0);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('OTHER');
  const [message, setMessage] = useState('');
  const [submit, { loading }] = useMutation(SUBMIT_FEEDBACK, {
    refetchQueries: [{ query: MY_PENDING_POD_FEEDBACK }],
  });

  const pod = data?.myPendingPodFeedback ?? null;
  const open = !!pod && !dismissed;

  const handleSubmit = async () => {
    if (!pod || !rating) return;
    await submit({
      variables: {
        input: { pod_id: pod.id, rating, category, message: message.trim() || null },
      },
    });
    setDismissed(true);
  };

  if (!pod) return null;

  return (
    <Dialog open={open} onClose={() => setDismissed(true)} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 900 }}>How was “{pod.title}”?</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Your feedback helps us make pods better.
          </Typography>
          <Stack alignItems="center">
            <Rating value={rating} onChange={(_e, v) => setRating(v)} size="large" />
          </Stack>
          <TextField
            select
            size="small"
            label="What is this about?"
            value={category}
            onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Tell us more (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            multiline
            minRows={2}
            inputProps={{ maxLength: 1000 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDismissed(true)}>Not now</Button>
        <Button variant="contained" disabled={!rating || loading} onClick={handleSubmit}>
          {loading ? 'Sending…' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
