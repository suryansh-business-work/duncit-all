import { IconButton, Stack, TextField } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { commentSchema } from './helpers';

interface SubmitHelpers {
  resetForm: () => void;
}

interface Props {
  viewerId?: string | null;
  posting: boolean;
  onSubmit: (values: { text: string }, helpers: SubmitHelpers) => Promise<void> | void;
}

export default function CommentInput({ viewerId, posting, onSubmit }: Readonly<Props>) {
  const { control, handleSubmit, watch, reset } = useForm<{ text: string }>({
    defaultValues: { text: '' },
    resolver: zodResolver(commentSchema),
    mode: 'onTouched',
  });

  const text = watch('text');

  const submit = handleSubmit(async (values) => {
    await onSubmit(values, { resetForm: () => reset({ text: '' }) });
  });

  return (
    <form onSubmit={submit}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          p: 1.5,
          borderTop: 1,
          borderColor: 'divider',
          pb: 'calc(env(safe-area-inset-bottom) + 12px)',
        }}
      >
        <Controller
          control={control}
          name="text"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              fullWidth
              size="small"
              placeholder={viewerId ? 'Add a comment…' : 'Sign in to comment'}
              disabled={!viewerId}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <IconButton
          color="primary"
          type="submit"
          disabled={!viewerId || posting || !text.trim()}
        >
          <SendIcon />
        </IconButton>
      </Stack>
    </form>
  );
}
