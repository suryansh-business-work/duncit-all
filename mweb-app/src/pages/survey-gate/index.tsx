import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import {
  ACTIVE_SURVEY,
  MY_MEETING,
  MY_SURVEY_RESPONSE,
  PARTNER_PATH,
  REQUEST_MEETING,
  SUBMIT_SURVEY_RESPONSE,
  type ActiveSurvey,
  type SurveyKind,
} from './queries';
import SurveyForm, { type SurveyAnswerInput } from './SurveyForm';
import MeetingForm, { type MeetingInput } from './MeetingForm';

type Step = 'loading' | 'survey' | 'meeting' | 'proceed';

/**
 * Gate before "Register a Venue" / "Become a Host": first the survey, then an
 * onboarding meeting request. Each is asked only once; once both are done the
 * user is forwarded straight to the (partner) registration route.
 */
export default function SurveyGatePage() {
  const params = useParams<{ kind: string }>();
  const navigate = useNavigate();
  const kind = (params.kind?.toUpperCase() as SurveyKind) || 'VENUE';
  const valid = kind === 'VENUE' || kind === 'HOST';
  const next = PARTNER_PATH[kind] ?? '/hosts-venues';
  const [step, setStep] = useState<Step>('loading');

  const proceed = () => navigate(next, { replace: true });

  const { data: resp, loading: respLoading } = useQuery<{ mySurveyResponse: { kind: string } | null }>(MY_SURVEY_RESPONSE, { variables: { kind }, skip: !valid, fetchPolicy: 'network-only' });
  const { data: meet, loading: meetLoading } = useQuery<{ myMeeting: { id: string } | null }>(MY_MEETING, { variables: { kind }, skip: !valid, fetchPolicy: 'network-only' });
  const { data: surveyData, loading: surveyLoading } = useQuery<{ activeSurvey: ActiveSurvey | null }>(ACTIVE_SURVEY, { variables: { kind }, skip: !valid, fetchPolicy: 'cache-and-network' });
  const [submitSurvey, { loading: submittingSurvey }] = useMutation(SUBMIT_SURVEY_RESPONSE);
  const [requestMeeting, { loading: requesting }] = useMutation(REQUEST_MEETING);

  const survey = surveyData?.activeSurvey ?? null;
  const surveyDone = !!resp?.mySurveyResponse || !survey;
  const meetingDone = !!meet?.myMeeting;

  useEffect(() => {
    if (!valid) { navigate('/hosts-venues', { replace: true }); return; }
    if (respLoading || meetLoading || surveyLoading) return;
    if (!surveyDone) setStep('survey');
    else if (!meetingDone) setStep('meeting');
    else proceed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, respLoading, meetLoading, surveyLoading, surveyDone, meetingDone]);

  const onSurvey = async (answers: SurveyAnswerInput[]) => {
    try { await submitSurvey({ variables: { kind, answers } }); } catch { /* don't block */ }
    setStep(meetingDone ? 'proceed' : 'meeting');
    if (meetingDone) proceed();
  };

  const onMeeting = async (input: MeetingInput) => {
    try { await requestMeeting({ variables: { kind, input } }); } catch { /* don't block */ }
    proceed();
  };

  if (step === 'loading' || step === 'proceed') {
    return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto', p: { xs: 1.5, sm: 2 } }}>
      <Card variant="outlined" sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack spacing={0.5} sx={{ mb: 1.5 }}>
            <Typography variant="h6" fontWeight={950}>
              {step === 'survey' ? (survey?.title || (kind === 'VENUE' ? 'Register your venue' : 'Become a host')) : 'Schedule your onboarding meeting'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {step === 'survey' ? 'A few quick questions before you continue.' : 'Last step before registration.'}
            </Typography>
          </Stack>
          {step === 'survey' && survey ? (
            <SurveyForm survey={survey} submitting={submittingSurvey} onSubmit={onSurvey} />
          ) : (
            <MeetingForm submitting={requesting} onSubmit={onMeeting} />
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
