import { useMemo } from 'react';
import { Stack, TextField } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { DuncitIconButton } from '@duncit/buttons';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { makeCommentSchema } from './helpers';
import { useTranslation } from '../../i18n/useTranslation';

interface SubmitHelpers {
  resetForm: () => void;
}

interface Props {
  viewerId?: string | null;
  posting: boolean;
  onSubmit: (values: { text: string }, helpers: SubmitHelpers) => Promise<void> | void;
}

export default function CommentInput({ viewerId, posting, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeCommentSchema(t), [t]);
  const { control, handleSubmit, watch, reset } = useForm<{ text: string }>({
    defaultValues: { text: '' },
    resolver: zodResolver(schema),
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
        sx={{
          alignItems: "center",
          p: 1.5,
          borderTop: 1,
          borderColor: 'divider',
          pb: 'calc(env(safe-area-inset-bottom) + 12px)'
        }}>
        <Controller
          control={control}
          name="text"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              fullWidth
              size="small"
              placeholder={
                viewerId ? t('mweb.podDetails.addComment') : t('mweb.podDetails.signInToComment')
              }
              disabled={!viewerId}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 999,
                  bgcolor: 'action.hover',
                  '& fieldset': { borderColor: 'transparent' },
                },
              }}
            />
          )}
        />
        <DuncitIconButton
          type="submit"
          aria-label={t('mweb.podDetails.sendComment')}
          disabled={!viewerId || posting || !text.trim()}
          sx={{
            width: 42,
            height: 42,
            flexShrink: 0,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { bgcolor: 'primary.main' },
            '&.Mui-disabled': { bgcolor: 'primary.main', color: 'primary.contrastText', opacity: 0.5 },
          }}
        >
          <SendIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
    </form>
  );
}
