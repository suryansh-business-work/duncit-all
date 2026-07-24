import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material';
import { FEEDBACK_CATEGORIES } from '@duncit/slack';
import RhfTextField from '../components/RhfTextField';
import { feedbackDefaults, feedbackSchema, type FeedbackValues } from './feedback.types';

interface Props {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: FeedbackValues) => Promise<void> | void;
}

/** Report-a-problem / feedback form (RHF + Zod + MUI). Category is a shared
 * enum; the parent wires `onSubmit` to the submitAppFeedback mutation. */
export default function FeedbackForm({ loading, errorMessage, onSubmit }: Readonly<Props>) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<FeedbackValues>({
    defaultValues: feedbackDefaults,
    resolver: zodResolver(feedbackSchema),
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong');
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <Controller
          control={control}
          name="category"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              select
              fullWidth
              size="small"
              label="Category"
              required
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? ' '}
            >
              {FEEDBACK_CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <RhfTextField
          control={control}
          name="message"
          label="What's going on?"
          required
          multiline
          minRows={4}
          placeholder="Describe the problem or share your idea"
          hint="At least 10 characters"
          size="small"
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          data-testid="feedback-submit"
          sx={{ borderRadius: 2, py: 1.1, fontWeight: 700, textTransform: 'none' }}
        >
          {loading ? 'Sending…' : 'Send feedback'}
        </Button>
        {(submitError || errorMessage) && <Alert severity="error">{submitError || errorMessage}</Alert>}
      </Stack>
    </form>
  );
}
