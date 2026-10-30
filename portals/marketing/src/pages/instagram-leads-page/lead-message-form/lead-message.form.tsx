import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { notify } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { leadMessageSchema, type LeadMessageFormProps, type LeadMessageFormValues } from './lead-message.types';

/**
 * The next DM: drafted by the AI, edited by the marketer, then copied and
 * sent by hand from the lead's Instagram chat. Pressing "Copy and mark sent"
 * is what counts it towards the daily limit and schedules the follow-up.
 */
export default function LeadMessageForm({ draft, stepLabel, chatUrl, drafting, sending, onDraft, onSend }: Readonly<LeadMessageFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => leadMessageSchema(t), [t]);
  const { control, handleSubmit } = useForm<LeadMessageFormValues, unknown, LeadMessageFormValues>({
    defaultValues: { text: draft },
    resolver: zodResolver(schema) as unknown as Resolver<LeadMessageFormValues, unknown, LeadMessageFormValues>,
    mode: 'onChange',
  });

  const send = async (values: LeadMessageFormValues) => {
    try {
      await navigator.clipboard.writeText(values.text);
      notify(t('marketing.igLeads.copied'), 'success');
    } catch {
      // The send is still recorded; the marketer copies from the box instead.
      notify(t('marketing.igLeads.copyFailed'), 'warning');
    }
    await onSend(values);
  };

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()} data-testid="ig-lead-message-form">
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" component="h3">
          {stepLabel}
        </Typography>
        <RhfTextField
          control={control}
          name="text"
          label={t('marketing.igLeads.message')}
          hint={t('marketing.igLeads.messageHint')}
          multiline
          minRows={4}
        />
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <DuncitButton variant="outlined" startIcon={<AutoAwesomeIcon />} loading={drafting} onClick={onDraft} data-testid="ig-lead-draft">
            {t('marketing.igLeads.draftWithAi')}
          </DuncitButton>
          <DuncitButton
            variant="contained"
            startIcon={<ContentCopyIcon />}
            loading={sending}
            onClick={() => handleSubmit(send)()}
            data-testid="ig-lead-send"
          >
            {t('marketing.igLeads.copyAndMarkSent')}
          </DuncitButton>
          <DuncitButton variant="text" startIcon={<OpenInNewIcon />} href={chatUrl} target="_blank" rel="noopener noreferrer">
            {t('marketing.igLeads.openChat')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
