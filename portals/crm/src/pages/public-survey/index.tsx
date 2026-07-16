import { useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useParams } from 'react-router-dom';
import { Alert, Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SurveyStepper, { type SurveyAnswerInput } from '../../components/lead-survey/SurveyStepper';
import { LEAD_SURVEY_BY_TOKEN, PUBLIC_BRANDING, SUBMIT_LEAD_SURVEY_BY_TOKEN, type PublicBranding, type PublicLeadSurvey } from './queries';
import { parseApiError } from '@duncit/utils';

/** Public, no-login survey fill page hosted by CRM (/s/:token). Open to anyone with the link. */
export default function PublicSurveyPage() {
  const { token = '' } = useParams<{ token: string }>();
  const { data, loading, error } = useQuery<{ leadSurveyByToken: PublicLeadSurvey }>(LEAD_SURVEY_BY_TOKEN, {
    variables: { token },
    skip: !token,
    fetchPolicy: 'network-only',
  });
  const { data: brandingData } = useQuery<PublicBranding>(PUBLIC_BRANDING, { fetchPolicy: 'cache-first' });
  const [submit, { loading: submitting }] = useMutation(SUBMIT_LEAD_SURVEY_BY_TOKEN);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const branding = brandingData?.branding;
  const logoUrl = branding?.logo_url || '/duncit-logo.svg';
  const appName = branding?.app_name || 'Duncit';
  const payload = data?.leadSurveyByToken;
  const survey = payload?.survey ?? null;

  const onSubmit = async (answers: SurveyAnswerInput[]) => {
    setSubmitError(null);
    try {
      await submit({ variables: { token, answers } });
      setDone(true);
    } catch (e) {
      setSubmitError(parseApiError(e));
    }
  };

  const shell = (children: ReactNode) => (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: { xs: 1.5, sm: 2 }, minHeight: '100dvh', display: 'grid', alignContent: 'center' }}>
      <Box
        component="img"
        src={logoUrl}
        alt={appName}
        sx={{ height: 40, maxWidth: 160, objectFit: 'contain', display: 'block', mx: 'auto', mb: 2 }}
      />
      <Card variant="outlined" sx={{ borderRadius: 3 }}><CardContent>{children}</CardContent></Card>
    </Box>
  );

  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;
  if (error || !survey) return shell(<Alert severity="error">This survey link is invalid or has been revoked.</Alert>);
  // Already submitted (either now, or on a previous visit) → don't show the form again.
  if (done || payload?.already_filled) {
    return shell(
      <Stack spacing={1.5} alignItems="center" sx={{ py: 2, textAlign: 'center' }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 48 }} />
        <Typography variant="h6" fontWeight={900}>{done ? 'Thank you!' : 'Already submitted'}</Typography>
        <Typography variant="body2" color="text.secondary">
          This survey has already been submitted. You can close this page.
        </Typography>
      </Stack>
    );
  }

  return shell(
    <>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={950}>{survey.title || 'Quick survey'}</Typography>
        <Typography variant="body2" color="text.secondary">
          {payload?.lead_name ? `For ${payload.lead_name} — a` : 'A'} few quick questions.
          {payload?.already_filled ? ' You can update your earlier answers.' : ''}
        </Typography>
      </Stack>
      {submitError && <Alert severity="error" sx={{ mb: 1.5 }}>{submitError}</Alert>}
      <SurveyStepper survey={survey} submitting={submitting} onSubmit={onSubmit} />
    </>
  );
}
