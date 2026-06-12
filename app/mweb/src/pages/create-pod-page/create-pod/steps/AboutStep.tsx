import { Stack, TextField } from '@mui/material';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
}

/** Step 3 — description, extra info and media URLs. */
export default function AboutStep({ form }: Readonly<Props>) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Stack spacing={2}>
      <TextField
        label="Description"
        required
        fullWidth
        multiline
        minRows={4}
        {...register('pod_description')}
        error={!!errors.pod_description}
        helperText={errors.pod_description?.message}
      />
      <TextField
        label="Pod info / additional notes"
        fullWidth
        multiline
        minRows={2}
        helperText="Logistics, what to bring, parking notes, etc."
        {...register('pod_info')}
      />
      <TextField
        label="Media URLs"
        fullWidth
        multiline
        minRows={2}
        helperText="One image or video URL per line."
        {...register('media_text')}
      />
    </Stack>
  );
}
