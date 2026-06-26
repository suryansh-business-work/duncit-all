import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FEEDBACK_OPTIONS, FEEDBACK_THANK_YOU, feedbackOptionFor } from './feedbackScale';

interface Props {
  open: boolean;
  /** Existing rating (1-5) when feedback was already submitted — gates one-time. */
  existingRating: number | null;
  existingComment: string | null;
  busy?: boolean;
  error?: string | null;
  onSubmit: (rating: number, comment: string) => void;
  onClose: () => void;
}

/**
 * One-time 5-emoji support satisfaction dialog (B8). When a rating already
 * exists it renders a read-only summary + thank-you instead of the form, so the
 * dialog is safe to auto-open whenever a chat/ticket is resolved.
 */
export default function EmojiFeedbackDialog({
  open,
  existingRating,
  existingComment,
  busy,
  error,
  onSubmit,
  onClose,
}: Readonly<Props>) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const submitted = feedbackOptionFor(existingRating);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 900 }}>How did we do?</DialogTitle>
      <DialogContent>
        {submitted ? (
          <Stack spacing={1.25} sx={{ pt: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 800 }}>
              Your rating: {submitted.emoji} {submitted.label}
            </Typography>
            {existingComment && (
              <Typography variant="body2" color="text.secondary">
                “{existingComment}”
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {FEEDBACK_THANK_YOU}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              Rate your support experience.
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction="row" justifyContent="space-between">
              {FEEDBACK_OPTIONS.map((o) => {
                const active = rating === o.value;
                return (
                  <Box
                    key={o.value}
                    component="button"
                    type="button"
                    aria-label={`${o.value} ${o.label}`}
                    aria-pressed={active}
                    onClick={() => setRating(o.value)}
                    sx={{
                      cursor: 'pointer',
                      border: 'none',
                      bgcolor: 'transparent',
                      p: 0.5,
                      borderRadius: 2,
                      fontSize: 30,
                      lineHeight: 1,
                      opacity: active || rating === 0 ? 1 : 0.45,
                      transform: active ? 'scale(1.18)' : 'none',
                      transition: 'transform 120ms, opacity 120ms',
                    }}
                  >
                    {o.emoji}
                  </Box>
                );
              })}
            </Stack>
            {rating > 0 && (
              <Typography variant="caption" align="center" sx={{ fontWeight: 700 }}>
                {feedbackOptionFor(rating)?.label}
              </Typography>
            )}
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
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{submitted ? 'Close' : 'Skip'}</Button>
        {!submitted && (
          <Button
            variant="contained"
            disabled={!rating || busy}
            onClick={() => onSubmit(rating, comment.trim())}
          >
            {busy ? 'Sending…' : 'Submit'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
