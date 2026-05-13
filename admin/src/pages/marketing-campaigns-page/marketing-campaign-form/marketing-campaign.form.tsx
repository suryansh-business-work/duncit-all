import { useEffect } from 'react';
import * as yup from 'yup';
import { Form, Formik, useFormikContext } from 'formik';
import { Alert, Button, Grid, MenuItem, Stack, TextField } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DateTimeField from '../../../components/DateTimeField';
import { validationRules } from '../../../forms/validation/rules';
import type { MarketingCampaignFormProps, MarketingCampaignFormValues } from './marketing-campaign.types';

const defaultMjml = `<mjml>
  <mj-body background-color="#f8fafc">
    <mj-section padding="28px 20px 8px">
      <mj-column>
        <mj-text font-size="26px" line-height="34px" font-weight="700" color="#111827">{{app_name}} update</mj-text>
        <mj-text font-size="16px" line-height="24px" color="#4b5563">Here is something new for you.</mj-text>
      </mj-column>
    </mj-section>
    {{content_card}}
  </mj-body>
</mjml>`;

export function blankMarketingCampaignValues(channel: 'EMAIL' | 'WHATSAPP' = 'EMAIL'): MarketingCampaignFormValues {
  return {
    name: '',
    channel,
    audience: 'ALL_USERS',
    subject: '',
    mjml: defaultMjml,
    card_type: '',
    card_ref_id: '',
    scheduled_at: '',
  };
}

export const marketingCampaignSchema: yup.ObjectSchema<MarketingCampaignFormValues> = yup.object({
  name: validationRules.requiredText('Campaign name', 3, 120),
  channel: yup.mixed<'EMAIL' | 'WHATSAPP'>().oneOf(['EMAIL', 'WHATSAPP']).required('Channel is required'),
  audience: yup
    .mixed<'ALL_USERS' | 'NEWSLETTER_SUBSCRIBERS'>()
    .oneOf(['ALL_USERS', 'NEWSLETTER_SUBSCRIBERS'])
    .required('Audience is required'),
  subject: validationRules.requiredText('Subject', 3, 180),
  mjml: yup
    .string()
    .trim()
    .min(20, 'MJML must be at least 20 characters')
    .test('mjml-root', 'MJML must include an <mjml> root element', (value) => /<mjml[\s>]/i.test(value || ''))
    .required('MJML body is required'),
  card_type: yup.mixed<'' | 'POD' | 'CLUB'>().oneOf(['', 'POD', 'CLUB']).default(''),
  card_ref_id: yup.string().trim().default('').when('card_type', {
    is: (value: string) => Boolean(value),
    then: (schema) => schema.required('Select a card'),
  }),
  scheduled_at: yup
    .string()
    .trim()
    .default('')
    .test('valid-date', 'Schedule must be a valid date and time', (value) => !value || !Number.isNaN(new Date(value).getTime())),
});

export function toMarketingCampaignInput(values: MarketingCampaignFormValues) {
  const cast = marketingCampaignSchema.cast(values, { stripUnknown: true });
  return {
    name: cast.name,
    channel: cast.channel,
    audience: cast.audience,
    subject: cast.subject,
    mjml: cast.mjml,
    card_type: cast.card_type || undefined,
    card_ref_id: cast.card_ref_id || undefined,
    scheduled_at: cast.scheduled_at || undefined,
    send_now: !cast.scheduled_at,
  };
}

function ValuesWatcher({ onChange }: { onChange: (values: MarketingCampaignFormValues) => void }) {
  const { values } = useFormikContext<MarketingCampaignFormValues>();
  useEffect(() => onChange(values), [values, onChange]);
  return null;
}

export default function MarketingCampaignForm({
  initialValues,
  cards,
  busy,
  previewLoading,
  errorMessage,
  onValuesChange,
  onSubmit,
}: MarketingCampaignFormProps) {
  return (
    <Formik<MarketingCampaignFormValues>
      initialValues={initialValues}
      enableReinitialize
      validationSchema={marketingCampaignSchema}
      validateOnBlur
      validateOnChange
      onSubmit={(values) => onSubmit(values)}
    >
      {({ values, errors, touched, submitCount, handleBlur, handleChange, setFieldValue, isValid }) => {
        const show = (key: keyof MarketingCampaignFormValues) => Boolean(errors[key] && (touched[key] || submitCount > 0));
        const helper = (key: keyof MarketingCampaignFormValues) => (show(key) ? errors[key] : ' ');
        return (
          <Form noValidate>
            <ValuesWatcher onChange={onValuesChange} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField name="name" label="Campaign name" value={values.name} onChange={handleChange} onBlur={handleBlur} error={show('name')} helperText={helper('name')} fullWidth />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField select name="channel" label="Channel" value={values.channel} onChange={handleChange} fullWidth>
                  <MenuItem value="EMAIL">Email Campaign</MenuItem>
                  <MenuItem value="WHATSAPP">WhatsApp Campaign</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField select name="audience" label="Audience" value={values.audience} onChange={handleChange} fullWidth>
                  <MenuItem value="ALL_USERS">All active users</MenuItem>
                  <MenuItem value="NEWSLETTER_SUBSCRIBERS">Newsletter subscribers</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField name="subject" label="Email subject" value={values.subject} onChange={handleChange} onBlur={handleBlur} error={show('subject')} helperText={helper('subject')} fullWidth />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField select name="card_type" label="Dynamic card" value={values.card_type} onChange={(e) => { handleChange(e); setFieldValue('card_ref_id', ''); }} fullWidth>
                  <MenuItem value="">No card</MenuItem>
                  <MenuItem value="POD">Pod card</MenuItem>
                  <MenuItem value="CLUB">Club card</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField select name="card_ref_id" label="Card item" value={values.card_ref_id} onChange={handleChange} disabled={!values.card_type} error={show('card_ref_id')} helperText={helper('card_ref_id')} fullWidth>
                  {cards.map((card) => <MenuItem key={card.id} value={card.id}>{card.title}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <DateTimeField label="Schedule at" value={values.scheduled_at} onChange={(value) => setFieldValue('scheduled_at', value)} error={show('scheduled_at')} helperText={helper('scheduled_at')} minDateTime={new Date()} />
              </Grid>
              {values.channel === 'WHATSAPP' && <Grid item xs={12}><Alert severity="info">WhatsApp campaigns currently use the email delivery fallback.</Alert></Grid>}
              <Grid item xs={12}>
                <TextField name="mjml" label="MJML body" value={values.mjml} onChange={handleChange} onBlur={handleBlur} error={show('mjml')} helperText={helper('mjml')} fullWidth multiline minRows={14} />
              </Grid>
              {errorMessage && <Grid item xs={12}><Alert severity="error">{errorMessage}</Alert></Grid>}
              <Grid item xs={12}>
                <Stack direction="row" justifyContent="flex-end">
                  <Button type="submit" variant="contained" startIcon={<SendIcon />} disabled={busy || previewLoading || !isValid}>
                    {values.scheduled_at ? 'Schedule Campaign' : 'Send Now'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Form>
        );
      }}
    </Formik>
  );
}