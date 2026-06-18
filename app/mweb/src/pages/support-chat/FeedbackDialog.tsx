import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { SUBMIT_SUPPORT_CHAT_FEEDBACK } from './queries';

interface Props {
  open: boolean;
  sessionId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function FeedbackDialog({ open, sessionId, onClose, onSubmitted }: Readonly<Props>) {
  const [rating, setRating] = useState<number | null>(0);
  const [comment, setComment] = useState('');
  const [submit, { loading }] = useMutation(SUBMIT_SUPPORT_CHAT_FEEDBACK);

  const handleSubmit = async () => {
    if (!rating) return;
    await submit({ variables: { session_id: sessionId, rating, comment: comment.trim() || null } });
    onSubmitted();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 900 }}>How did we do?</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} alignItems="center" sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Rate your support experience.
          </Typography>
          <Rating value={rating} onChange={(_e, v) => setRating(v)} size="large" />
          <TextField
            fullWidth
            size="small"
            label="Anything to add? (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            multiline
            minRows={2}
            inputProps={{ maxLength: 1000 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Skip</Button>
        <Button variant="contained" disabled={!rating || loading} onClick={handleSubmit}>
          {loading ? 'Sending…' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
