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
import type { SocialPublishMode } from '../publish.queries';
import AccountPicker from './AccountPicker';
import ApprovalSwitch from './ApprovalSwitch';
import PlatformChecks from './PlatformChecks';
import PostMediaField from './PostMediaField';
import { socialPostSchema, type SocialPostFormProps, type SocialPostFormValues } from './social-post.types';

/**
 * The composer: which accounts, what to say, what to show, and when. One form
 * and three ways out — keep it as a draft, send it now, or schedule it — and
 * each button checks only what its own path needs. With "Needs approval" on,
 * the two sending buttons hand the post to a manager instead.
 */
export default function SocialPostForm({ accounts, initial, errorMessage, reviewNote, onCancel, onSubmit }: Readonly<SocialPostFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => socialPostSchema(t, accounts), [t, accounts]);
  const { control, handleSubmit, setValue } = useForm<SocialPostFormValues, any, SocialPostFormValues>({
    defaultValues: initial,
    resolver: zodResolver(schema) as unknown as Resolver<SocialPostFormValues, any, SocialPostFormValues>,
    mode: 'onChange',
  });
  const [chosen, text, media, needsApproval] = useWatch({ control, name: ['account_ids', 'text', 'media', 'needs_approval'] });
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
        {reviewNote && (
          <Alert severity="warning" data-testid="social-post-sent-back">
            {t('marketing.social.sentBack', { vars: { note: reviewNote } })}
          </Alert>
        )}
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
        <PlatformChecks platforms={platforms} text={text} mediaCount={media.length} />
        <PostMediaField control={control} />
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
        <ApprovalSwitch control={control} />
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton onClick={onCancel}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton variant="outlined" onClick={() => submitAs('DRAFT')} data-testid="social-post-draft">
            {t('marketing.social.saveDraft')}
          </DuncitButton>
          <DuncitButton variant="outlined" startIcon={<SendIcon />} onClick={() => submitAs('NOW')} data-testid="social-post-now">
            {needsApproval ? t('marketing.social.sendForApprovalNow') : t('marketing.social.publishNow')}
          </DuncitButton>
          <DuncitButton variant="contained" startIcon={<ScheduleIcon />} onClick={() => submitAs('SCHEDULE')} data-testid="social-post-schedule">
            {needsApproval ? t('marketing.social.sendForApproval') : t('marketing.social.schedule')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
