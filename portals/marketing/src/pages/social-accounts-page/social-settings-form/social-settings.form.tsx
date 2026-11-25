import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { AiSection, AutoReplySection, LeadsSection, OptOutSection, SyncSection } from './social-settings.sections';
import {
  settingsFormValues,
  settingsInput,
  socialSettingsSchema,
  type SocialSettingsFormProps,
  type SocialSettingsFormValues,
} from './social-settings.types';

/**
 * Marketing → Social → Settings: every knob of the social module that is the
 * team's choice, each with what it does. Meta's own rules are stated above
 * the form and are not settings. Read-only for anyone who may not change it.
 */
export default function SocialSettingsForm({ settings, canEdit, canPickAssignee, onSubmit }: Readonly<SocialSettingsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => socialSettingsSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<SocialSettingsFormValues, unknown, SocialSettingsFormValues>({
    defaultValues: settingsFormValues(settings),
    resolver: zodResolver(schema) as unknown as Resolver<SocialSettingsFormValues, unknown, SocialSettingsFormValues>,
    mode: 'onChange',
  });
  const disabled = !canEdit || formState.isSubmitting;
  const save = handleSubmit((values) => onSubmit(settingsInput(values)));

  return (
    <form noValidate onSubmit={save} data-testid="social-settings-form">
      <Stack spacing={2}>
        <Alert severity="info" data-testid="social-settings-meta-rules">
          {t('marketing.socialSettings.metaRulesBody')}
        </Alert>
        {!canEdit && (
          <Alert severity="warning" data-testid="social-settings-read-only">
            {t('marketing.socialSettings.readOnly')}
          </Alert>
        )}
        <SyncSection control={control} disabled={disabled} />
        <AiSection control={control} disabled={disabled} />
        <LeadsSection
          control={control}
          disabled={disabled}
          savedId={settings.default_assignee_user_id}
          savedName={settings.default_assignee_name}
          canPick={canPickAssignee}
        />
        <OptOutSection control={control} disabled={disabled} />
        <AutoReplySection control={control} disabled={disabled} />
        {canEdit && (
          <Stack direction="row">
            <DuncitButton
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!formState.isDirty}
              loading={formState.isSubmitting}
              data-testid="social-settings-save"
            >
              {t('marketing.socialSettings.save')}
            </DuncitButton>
          </Stack>
        )}
      </Stack>
    </form>
  );
}
