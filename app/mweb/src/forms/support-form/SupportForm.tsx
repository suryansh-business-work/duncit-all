import { useEffect, useState } from 'react';
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
  const { control, handleSubmit, formState, setValue } = useForm<SupportFormValues>({
    defaultValues: { ...DEFAULTS, ...initialValues },
    resolver: zodResolver(supportSchema),
    mode: 'onBlur',
  });

  // Name/email (and any attached pod) come from an async `me` query that can
  // resolve AFTER mount. RHF reads defaultValues only once, so sync the
  // auto-filled fields in — otherwise the read-only Name/Email stay empty and
  // Zod silently blocks submit. User-typed fields are left untouched.
  useEffect(() => {
    if (initialValues?.name !== undefined) setValue('name', initialValues.name);
    if (initialValues?.email !== undefined) setValue('email', initialValues.email);
    if (initialValues?.pod_id !== undefined) setValue('pod_id', initialValues.pod_id);
    if (initialValues?.pod_title !== undefined) setValue('pod_title', initialValues.pod_title);
  }, [initialValues?.name, initialValues?.email, initialValues?.pod_id, initialValues?.pod_title, setValue]);

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
        <RhfTextField
          control={control}
          name="name"
          label="Name"
          autoComplete="name"
          hint="From your Duncit account"
          InputProps={{ readOnly: true }}
        />
        <RhfTextField
          control={control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          hint="From your Duncit account"
          InputProps={{ readOnly: true }}
        />
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Category"
              required
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
          required
          hint="3–120 characters"
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
          required
          hint="At least 10 characters"
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
