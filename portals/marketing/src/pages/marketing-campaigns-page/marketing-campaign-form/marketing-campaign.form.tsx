import { useEffect } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Grid, MenuItem, Stack } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import DateTimeField from '../../../components/DateTimeField';
import { peopleCount } from '../../../lib/reach';
import CampaignMjmlEditor from './CampaignMjmlEditor';
import CampaignVariables from './CampaignVariables';
import {
  marketingCampaignSchema,
  type MarketingCampaignFormProps,
  type MarketingCampaignFormValues,
} from './marketing-campaign.types';

export {
  blankMarketingCampaignValues,
  isCampaignDraftDirty,
  toMarketingCampaignInput,
} from './marketing-campaign.types';
import { useTranslation } from '@duncit/app-settings';
export { marketingCampaignSchema };

export default function MarketingCampaignForm({
  initialValues,
  audienceLists,
  variables,
  unknownVariables,
  busy,
  previewLoading,
  errorMessage,
  onValuesChange,
  onSubmit,
}: Readonly<MarketingCampaignFormProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit, trigger, watch, formState } = useForm<MarketingCampaignFormValues, any, MarketingCampaignFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(marketingCampaignSchema) as unknown as Resolver<MarketingCampaignFormValues, any, MarketingCampaignFormValues>,
    mode: 'onChange',
  });

  useEffect(() => {
    const subscription = watch((values) => onValuesChange(values as MarketingCampaignFormValues));
    return () => subscription.unsubscribe();
  }, [watch, onValuesChange]);

  const audience = watch('audience');
  const audienceListId = watch('audience_list_id');
  const scheduledAt = watch('scheduled_at');

  // Only a saved list knows its own size; the other audiences are resolved at
  // send time and have no count to show here.
  const reach =
    audience === 'AUDIENCE_LIST'
      ? (audienceLists.find((l) => l.id === audienceListId)?.member_count ?? null)
      : null;

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form noValidate onSubmit={submit}>
      <Grid container spacing={2}>
        <Grid
          size={{
            xs: 12,
            sm: 6
          }}>
          <RhfTextField control={control} name="name" label={t('marketing.common.campaignName')} required hint="3–120 characters" />
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6
          }}>
          <RhfTextField control={control} name="audience" label={t('marketing.common.audience')} select>
            <MenuItem value="ALL_USERS">{t('marketing.marketingCampaigns.allActiveUsers')}</MenuItem>
            <MenuItem value="NEWSLETTER_SUBSCRIBERS">{t('marketing.marketingCampaigns.newsletterSubscribers')}</MenuItem>
            <MenuItem value="AUDIENCE_LIST">{t('marketing.common.savedAudienceList')}</MenuItem>
          </RhfTextField>
        </Grid>
        {audience === 'AUDIENCE_LIST' && (
          <Grid
            size={{
              xs: 12,
              sm: 6
            }}>
            <RhfTextField
              control={control}
              name="audience_list_id"
              label={t('marketing.common.audienceList')}
              select
              required
              hint="Membership is recomputed when the campaign sends."
            >
              {audienceLists.length === 0 && (
                <MenuItem disabled value="">
                  No saved lists yet — create one under Target Audience
                </MenuItem>
              )}
              {audienceLists.map((list) => (
                <MenuItem key={list.id} value={list.id}>
                  {`${list.name} · ${list.member_count.toLocaleString()}`}
                </MenuItem>
              ))}
            </RhfTextField>
          </Grid>
        )}
        {reach !== null && (
          <Grid size={12}>
            <Alert severity={reach > 0 ? 'info' : 'warning'} data-testid="campaign-reach">
              {reach > 0
                ? `This campaign reaches ${peopleCount(reach)}.`
                : 'This campaign reaches nobody right now.'}
            </Alert>
          </Grid>
        )}
        <Grid size={12}>
          <RhfTextField control={control} name="subject" label={t('marketing.marketingCampaigns.emailSubject')} required hint="3–180 characters" />
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6
          }}>
          <Controller
            control={control}
            name="scheduled_at"
            render={({ field, fieldState }) => (
              <DateTimeField
                label={t('marketing.marketingCampaigns.scheduleAt')}
                value={field.value}
                onChange={field.onChange}
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? ' '}
                minDateTime={new Date()}
              />
            )}
          />
        </Grid>
        <Grid size={12}>
          <Controller
            control={control}
            name="mjml"
            render={({ field, fieldState }) => (
              <CampaignMjmlEditor
                value={field.value}
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? ' '}
                onChange={field.onChange}
                onVerify={() => { trigger('mjml').catch(() => undefined); }}
              />
            )}
          />
        </Grid>
        <Grid size={12}>
          <CampaignVariables variables={variables} unknown={unknownVariables} />
        </Grid>
        {errorMessage && (
          <Grid size={12}>
            <Alert severity="error">{errorMessage}</Alert>
          </Grid>
        )}
        <Grid size={12}>
          <Stack direction="row" sx={{
            justifyContent: "flex-end"
          }}>
            <DuncitButton type="submit" variant="contained" startIcon={<SendIcon />} disabled={busy || previewLoading || !formState.isValid}>
              {scheduledAt ? 'Schedule Campaign' : 'Send Now'}
            </DuncitButton>
          </Stack>
        </Grid>
      </Grid>
    </form>
  );
}
