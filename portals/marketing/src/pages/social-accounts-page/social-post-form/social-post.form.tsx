import { useMemo } from 'react';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import DateTimeField from '../../../components/DateTimeField';
import MediaPickerField from '../../../components/MediaPickerField';
import type { SocialPublishMode } from '../publish.queries';
import AccountPicker from './AccountPicker';
import PlatformChecks from './PlatformChecks';
import { socialPostSchema, type SocialPostFormProps, type SocialPostFormValues } from './social-post.types';

/**
 * The composer: which accounts, what to say, what to show, and when. One form
 * and three ways out — keep it as a draft, send it now, or schedule it — and
 * each button checks only what its own path needs.
 */
export default function SocialPostForm({ accounts, initial, errorMessage, onCancel, onSubmit }: Readonly<SocialPostFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => socialPostSchema(t, accounts), [t, accounts]);
  const { control, handleSubmit, setValue } = useForm<SocialPostFormValues, any, SocialPostFormValues>({
    defaultValues: initial,
    resolver: zodResolver(schema) as unknown as Resolver<SocialPostFormValues, any, SocialPostFormValues>,
    mode: 'onChange',
  });
  const [chosen, text] = useWatch({ control, name: ['account_ids', 'text'] });
  const platforms = useMemo(() => {
    const ids = new Set(chosen);
    return [...new Set(accounts.filter((account) => ids.has(account.id)).map((account) => account.platform))];
  }, [accounts, chosen]);

  const submitAs = async (mode: SocialPublishMode) => {
    setValue('mode', mode);
    await handleSubmit(onSubmit)();
  };

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()} data-testid="social-post-form">
      <Stack spacing={2}>
        <AccountPicker control={control} accounts={accounts} />
        <RhfTextField
          control={control}
          name="text"
          label={t('marketing.social.postText')}
          hint={t('marketing.social.postTextHint')}
          multiline
          minRows={5}
          maxRows={14}
        />
        <PlatformChecks platforms={platforms} text={text} />
        <Controller
          control={control}
          name="media_url"
          render={({ field, fieldState }) => (
            <MediaPickerField
              label={t('marketing.social.postMedia')}
              value={field.value}
              onChange={field.onChange}
              folder="/marketing/social"
              helperText={fieldState.error?.message ?? t('marketing.social.postMediaHint')}
            />
          )}
        />
        <Controller
          control={control}
          name="scheduled_at"
          render={({ field, fieldState }) => (
            <DateTimeField
              label={t('marketing.social.postWhen')}
              value={field.value}
              onChange={field.onChange}
              minDateTime={new Date()}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? t('marketing.social.postWhenHint')}
            />
          )}
        />
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton onClick={onCancel}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton variant="outlined" onClick={() => submitAs('DRAFT')} data-testid="social-post-draft">
            {t('marketing.social.saveDraft')}
          </DuncitButton>
          <DuncitButton variant="outlined" startIcon={<SendIcon />} onClick={() => submitAs('NOW')} data-testid="social-post-now">
            {t('marketing.social.publishNow')}
          </DuncitButton>
          <DuncitButton variant="contained" startIcon={<ScheduleIcon />} onClick={() => submitAs('SCHEDULE')} data-testid="social-post-schedule">
            {t('marketing.social.schedule')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
