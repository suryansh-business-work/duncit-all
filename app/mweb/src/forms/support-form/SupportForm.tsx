import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Chip,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import SubjectIcon from '@mui/icons-material/Subject';
import CategoryIcon from '@mui/icons-material/Category';
import EventIcon from '@mui/icons-material/Event';
import RhfTextField from '../components/RhfTextField';
import {
  CATEGORIES,
  DEFAULTS,
  type SupportFormValues,
  supportSchema,
} from './schema';
import AttachmentsField from './AttachmentsField';

interface Props {
  initialValues?: Partial<SupportFormValues>;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: SupportFormValues) => Promise<void> | void;
}

export default function SupportForm({
  initialValues,
  loading,
  errorMessage,
  onSubmit,
}: Readonly<Props>) {
  const [status, setStatus] = useState<string | undefined>(undefined);
  const { control, handleSubmit, formState } = useForm<SupportFormValues>({
    defaultValues: { ...DEFAULTS, ...(initialValues ?? {}) },
    resolver: zodResolver(supportSchema),
    mode: 'onBlur',
  });

  const submit = handleSubmit(async (values) => {
    setStatus(undefined);
    try {
      await onSubmit(values);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Could not submit. Please try again.');
    }
  });

  const isSubmitting = formState.isSubmitting;
  const attachedPod = useWatch({ control, name: 'pod_title' });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        {attachedPod ? (
          <Chip
            icon={<EventIcon />}
            label={`About pod: ${attachedPod}`}
            variant="outlined"
            color="primary"
            sx={{ alignSelf: 'flex-start', fontWeight: 800 }}
          />
        ) : null}
        <RhfTextField control={control} name="name" label="Your name" autoComplete="name" />
        <RhfTextField
          control={control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
        />
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Category"
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CategoryIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <RhfTextField
          control={control}
          name="subject"
          label="Subject"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SubjectIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <RhfTextField
          control={control}
          name="message"
          label="Tell us what's going on"
          multiline
          minRows={4}
        />

        <Controller
          control={control}
          name="attachments"
          render={({ field }) => (
            <AttachmentsField attachments={field.value} setAttachments={field.onChange} />
          )}
        />

        {(errorMessage || status) && <Alert severity="error">{errorMessage ?? status}</Alert>}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading || isSubmitting}
          sx={{ borderRadius: 999, fontWeight: 950 }}
        >
          {loading || isSubmitting ? 'Sending…' : 'Send to support'}
        </Button>
      </Stack>
    </form>
  );
}

export type { SupportFormValues } from './schema';
export { supportSchema } from './schema';
