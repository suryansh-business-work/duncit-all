import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Grid, MenuItem, Stack, TextField } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { RhfTextField } from '@duncit/forms';
import DateTimeField from '../../../components/DateTimeField';
import CampaignMjmlEditor from './CampaignMjmlEditor';
import {
  marketingCampaignSchema,
  type MarketingCampaignFormProps,
  type MarketingCampaignFormValues,
} from './marketing-campaign.types';

export { blankMarketingCampaignValues, toMarketingCampaignInput } from './marketing-campaign.types';
export { marketingCampaignSchema };

export default function MarketingCampaignForm({
  initialValues,
  cards,
  busy,
  previewLoading,
  errorMessage,
  onValuesChange,
  onSubmit,
}: Readonly<MarketingCampaignFormProps>) {
  const { control, handleSubmit, setValue, trigger, watch, formState } = useForm<MarketingCampaignFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(marketingCampaignSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    const subscription = watch((values) => onValuesChange(values as MarketingCampaignFormValues));
    return () => subscription.unsubscribe();
  }, [watch, onValuesChange]);

  const channel = watch('channel');
  const cardType = watch('card_type');
  const scheduledAt = watch('scheduled_at');

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form noValidate onSubmit={submit}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <RhfTextField control={control} name="name" label="Campaign name" required hint="3–120 characters" />
        </Grid>
        <Grid item xs={12} sm={3}>
          <RhfTextField control={control} name="channel" label="Channel" select>
            <MenuItem value="EMAIL">Email Campaign</MenuItem>
            <MenuItem value="WHATSAPP">WhatsApp Campaign</MenuItem>
          </RhfTextField>
        </Grid>
        <Grid item xs={12} sm={3}>
          <RhfTextField control={control} name="audience" label="Audience" select>
            <MenuItem value="ALL_USERS">All active users</MenuItem>
            <MenuItem value="NEWSLETTER_SUBSCRIBERS">Newsletter subscribers</MenuItem>
          </RhfTextField>
        </Grid>
        <Grid item xs={12}>
          <RhfTextField control={control} name="subject" label="Email subject" required hint="3–180 characters" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Controller
            control={control}
            name="card_type"
            render={({ field }) => (
              <TextField
                label="Dynamic card"
                select
                fullWidth
                value={field.value}
                onChange={(event) => {
                  field.onChange(event);
                  setValue('card_ref_id', '');
                }}
                onBlur={field.onBlur}
              >
                <MenuItem value="">No card</MenuItem>
                <MenuItem value="POD">Pod card</MenuItem>
                <MenuItem value="CLUB">Club card</MenuItem>
              </TextField>
            )}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <RhfTextField control={control} name="card_ref_id" label="Card item" select disabled={!cardType}>
            {cards.map((card) => (
              <MenuItem key={card.id} value={card.id}>{card.title}</MenuItem>
            ))}
          </RhfTextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Controller
            control={control}
            name="scheduled_at"
            render={({ field, fieldState }) => (
              <DateTimeField
                label="Schedule at"
                value={field.value}
                onChange={field.onChange}
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? ' '}
                minDateTime={new Date()}
              />
            )}
          />
        </Grid>
        {channel === 'WHATSAPP' && (
          <Grid item xs={12}>
            <Alert severity="info">WhatsApp campaigns currently use the email delivery fallback.</Alert>
          </Grid>
        )}
        <Grid item xs={12}>
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
        {errorMessage && (
          <Grid item xs={12}>
            <Alert severity="error">{errorMessage}</Alert>
          </Grid>
        )}
        <Grid item xs={12}>
          <Stack direction="row" justifyContent="flex-end">
            <Button type="submit" variant="contained" startIcon={<SendIcon />} disabled={busy || previewLoading || !formState.isValid}>
              {scheduledAt ? 'Schedule Campaign' : 'Send Now'}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </form>
  );
}
