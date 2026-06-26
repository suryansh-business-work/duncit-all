import { Box, Paper, Stack, Typography } from '@mui/material';
import { feedbackOption } from '../lib/feedbackScale';

interface Props {
  rating: number | null;
  comment: string | null;
}

/** Read-only display of a user's satisfaction rating (emoji scale) + comment.
 * Shown to agents on a resolved chat session or a resolved/closed ticket. */
export default function FeedbackPanel({ rating, comment }: Readonly<Props>) {
  const option = feedbackOption(rating);
  if (!option) return null;
  return (
    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
      <Typography variant="overline" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>
        User feedback
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box component="span" sx={{ fontSize: 24, lineHeight: 1 }} aria-hidden>
          {option.emoji}
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {option.value} · {option.label}
        </Typography>
      </Stack>
      {comment && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, fontStyle: 'italic' }}>
          “{comment}”
        </Typography>
      )}
    </Paper>
  );
}
