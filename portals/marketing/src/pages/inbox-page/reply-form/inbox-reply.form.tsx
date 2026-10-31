import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { HelpTip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { blankInboxReplyValues, inboxReplySchema, type InboxReplyFormProps, type InboxReplyFormValues } from './inbox-reply.types';

/** The answer box: Claude may fill it, the person edits it, and only Send posts it. */
export default function InboxReplyForm({ max, blockedReason, busy, suggesting, onSuggest, onSend }: Readonly<InboxReplyFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => inboxReplySchema(t, max), [t, max]);
  const { control, handleSubmit, reset, setValue } = useForm<InboxReplyFormValues, unknown, InboxReplyFormValues>({
    defaultValues: blankInboxReplyValues(),
    resolver: zodResolver(schema) as unknown as Resolver<InboxReplyFormValues, unknown, InboxReplyFormValues>,
    mode: 'onChange',
  });

  const send = handleSubmit(async (values) => {
    if (await onSend(values.text)) reset(blankInboxReplyValues());
  });

  const suggest = async () => {
    const draft = await onSuggest();
    if (draft) setValue('text', draft, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <form noValidate onSubmit={send} data-testid="inbox-reply-form">
      <Stack spacing={1}>
        <RhfTextField
          control={control}
          name="text"
          label={t('marketing.inbox.replyField')}
          hint={t('marketing.inbox.replyHint', { vars: { max } })}
          multiline
          minRows={3}
          fullWidth
        />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
          <DuncitButton variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={suggest} loading={suggesting} data-testid="inbox-suggest">
            {t('marketing.inbox.suggest')}
          </DuncitButton>
          {blockedReason && <HelpTip title={blockedReason} />}
          <DuncitButton
            type="submit"
            variant="contained"
            startIcon={<SendIcon />}
            loading={busy}
            disabled={blockedReason !== null}
            data-testid="inbox-send"
          >
            {t('marketing.inbox.send')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
