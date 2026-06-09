import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { SupportPodOption } from './queries';
import { SUBMIT_FEEDBACK } from './queries';

interface Props {
  selected: SupportPodOption | null;
}

const CATEGORIES = [
  { value: 'VENUE', label: 'Venue' },
  { value: 'HOST', label: 'Host' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'FOOD', label: 'Food' },
  { value: 'OTHER', label: 'Other' },
];

export default function FeedbackContent({ selected }: Readonly<Props>) {
  const [rating, setRating] = useState<number | null>(0);
  const [category, setCategory] = useState('OTHER');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [submit, { loading }] = useMutation(SUBMIT_FEEDBACK);

  const handleSubmit = async () => {
    setError(null);
    if (!selected) {
      setError('Pick a pod first.');
      return;
    }
    if (!rating) {
      setError('Tap a star rating before submitting.');
      return;
    }
    try {
      await submit({
        variables: {
          input: {
            pod_id: selected.podDocId,
            rating,
            category,
            message: message.trim() || null,
          },
        },
      });
      setRating(0);
      setMessage('');
      setCategory('OTHER');
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message || 'Could not submit feedback.');
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 4 }}>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Live feedback flows straight to the host and the admin team while the pod is on.
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Rating
          </Typography>
          <Rating value={rating} onChange={(_, v) => setRating(v)} size="large" max={5} />
        </Stack>
        <TextField
          select
          size="small"
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <MenuItem key={c.value} value={c.value}>
              {c.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Tell us more (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          size="small"
          multiline
          minRows={3}
          inputProps={{ maxLength: 1000 }}
        />
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {submitted && !error && (
          <Alert severity="success" onClose={() => setSubmitted(false)}>
            Thanks! The host has been notified.
          </Alert>
        )}
        <Button
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={loading || !selected}
          sx={{ borderRadius: 99, fontWeight: 800 }}
        >
          {loading ? 'Sending…' : 'Send feedback'}
        </Button>
      </Stack>
    </Paper>
  );
}
