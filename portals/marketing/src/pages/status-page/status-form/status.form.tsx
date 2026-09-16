import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Divider, Grid, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { FormActionsRow } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { statusSchema, type StatusFormProps, type StatusFormValues } from './status.types';
import StatusMediaField from './StatusMediaField';
import StatusScopeFields from './StatusScopeFields';
import StatusExpiryFields from './StatusExpiryFields';

export {
  statusSchema,
  blankStatusValues,
  toStatusInput,
  toStatusValues,
  expiryOptions,
  scopeOptions,
} from './status.types';

/** The media is the status; everything else decides who sees it and for how long. */
export default function StatusForm({
  locations,
  initialValues,
  busy,
  errorMessage,
  submitLabel,
  onCancel,
  onSubmit,
}: Readonly<StatusFormProps>) {
  const { t } = useTranslation();
  const { control, setValue, handleSubmit, formState } = useForm<
    StatusFormValues,
    any,
    StatusFormValues
  >({
    defaultValues: initialValues,
    resolver: zodResolver(statusSchema(t)) as unknown as Resolver<
      StatusFormValues,
      any,
      StatusFormValues
    >,
    mode: 'onChange',
  });

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form noValidate onSubmit={submit}>
      <Grid container spacing={2}>
        <Grid size={12}>
          <RhfTextField
            control={control}
            name="title"
            label={t('shell.common.title')}
            required
            hint={t('marketing.status.titleHint')}
            data-testid="status-title-input"
          />
        </Grid>

        <Grid size={12}>
          <StatusMediaField control={control} setValue={setValue} />
        </Grid>

        <Grid size={12}>
          <RhfTextField
            control={control}
            name="caption"
            label={t('marketing.status.caption')}
            multiline
            minRows={2}
            hint={t('marketing.status.captionHint')}
            data-testid="status-caption-input"
          />
        </Grid>

        <Grid size={12}>
          <RhfTextField
            control={control}
            name="link_url"
            label={t('marketing.status.link')}
            hint={t('marketing.status.linkHint')}
            data-testid="status-link-input"
          />
        </Grid>

        <Grid size={12}>
          <Divider />
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            {t('marketing.status.scope')}
          </Typography>
        </Grid>
        <Grid size={12}>
          <StatusScopeFields control={control} locations={locations} />
        </Grid>

        <Grid size={12}>
          <Divider />
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            {t('marketing.status.expiry')}
          </Typography>
        </Grid>
        <Grid size={12}>
          <StatusExpiryFields control={control} />
        </Grid>

        <FormActionsRow
          errorMessage={errorMessage}
          busy={busy}
          disabled={!formState.isValid}
          submitLabel={submitLabel}
          secondaryAction={
            <DuncitButton onClick={onCancel} disabled={busy} data-testid="status-form-cancel">
              {t('shell.common.cancel')}
            </DuncitButton>
          }
        />
      </Grid>
    </form>
  );
}
