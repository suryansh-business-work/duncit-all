import { useMemo, useState, type KeyboardEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { VENUE_CHAT_TEXT_MAX } from '../queries';
import {
  chatComposerDefaults,
  makeChatComposerSchema,
  type ChatComposerProps,
  type ChatComposerValues,
} from './chat-composer.types';

/** The box under the thread: Enter sends, Shift+Enter breaks the line. */
export default function ChatComposerForm({ sending, onSend }: Readonly<ChatComposerProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeChatComposerSchema(t), [t]);
  const [failed, setFailed] = useState(false);
  const form = useForm<ChatComposerValues>({
    resolver: zodResolver(schema),
    defaultValues: chatComposerDefaults,
    mode: 'onSubmit',
  });

  const submit = form.handleSubmit(async ({ text }) => {
    setFailed(false);
    const sent = await onSend(text);
    if (sent) form.reset(chatComposerDefaults);
    else setFailed(true);
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!sending) submit().catch(() => setFailed(true));
  };

  return (
    <form noValidate onSubmit={(event) => submit(event).catch(() => setFailed(true))}>
      <Stack spacing={1}>
        {failed && (
          <Alert severity="error" role="alert">
            {t('mweb.venueChat.sendFailed')}
          </Alert>
        )}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Controller
            name="text"
            control={form.control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                maxRows={5}
                size="small"
                label={t('partners.venueChat.messageLabel')}
                placeholder={t('partners.venueChat.messagePlaceholder')}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                onKeyDown={onKeyDown}
                slotProps={{ htmlInput: { maxLength: VENUE_CHAT_TEXT_MAX } }}
              />
            )}
          />
          <DuncitButton type="submit" variant="contained" disabled={sending} endIcon={<SendRoundedIcon />}>
            {sending ? t('partners.venueChat.sending') : t('partners.venueChat.send')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
