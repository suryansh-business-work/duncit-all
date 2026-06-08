import { useEffect, useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import {
  ACTIVE_SURVEY_FOR,
  MY_MEETING,
  MY_SURVEY_RESPONSE,
  PARTNER_PATH,
  REQUEST_MEETING,
  SUBMIT_SURVEY_RESPONSE,
  type ActiveSurvey,
  type SurveyKind,
} from './queries';
import CategoryStep, { type CategoryScope } from './CategoryStep';
import SurveyForm, { type SurveyAnswerInput } from './SurveyForm';
import MeetingForm, { type MeetingInput } from './MeetingForm';

type Step = 'loading' | 'category' | 'survey' | 'meeting' | 'proceed';

/**
 * Gate before "Register a Venue" / "Become a Host": first pick the Super →
 * Category → Sub, then the matching survey (skipped when none), then an
 * onboarding meeting. Forwards to the (partner) registration route when done.
 */
export default function SurveyGatePage() {
  const params = useParams<{ kind: string }>();
  const navigate = useNavigate();
  const kind = (params.kind?.toUpperCase() as SurveyKind) || 'VENUE';
  const valid = kind === 'VENUE' || kind === 'HOST';
  const next = PARTNER_PATH[kind] ?? '/hosts-venues';
  const [step, setStep] = useState<Step>('loading');
  const [survey, setSurvey] = useState<ActiveSurvey | null>(null);
  const [resolving, setResolving] = useState(false);

  const proceed = () => navigate(next, { replace: true });

  const { data: meet, loading: meetLoading } = useQuery<{ myMeeting: { id: string } | null }>(MY_MEETING, { variables: { kind }, skip: !valid, fetchPolicy: 'network-only' });
  const [resolveSurvey] = useLazyQuery<{ activeSurveyFor: ActiveSurvey | null }>(ACTIVE_SURVEY_FOR, { fetchPolicy: 'network-only' });
  const [checkResponse] = useLazyQuery<{ mySurveyResponse: { survey_id: string } | null }>(MY_SURVEY_RESPONSE, { fetchPolicy: 'network-only' });
  const [submitSurvey, { loading: submittingSurvey }] = useMutation(SUBMIT_SURVEY_RESPONSE);
  const [requestMeeting, { loading: requesting }] = useMutation(REQUEST_MEETING);

  const meetingDone = !!meet?.myMeeting;

  useEffect(() => {
    if (!valid) { navigate('/hosts-venues', { replace: true }); return; }
    if (meetLoading) return;
    setStep('category');
  }, [valid, meetLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const afterSurvey = () => {
    if (meetingDone) proceed();
    else setStep('meeting');
  };

  const onCategory = async (scope: CategoryScope) => {
    setResolving(true);
    try {
      const { data } = await resolveSurvey({ variables: { kind, ...scope } });
      const s = data?.activeSurveyFor ?? null;
      setSurvey(s);
      if (s) {
        const { data: r } = await checkResponse({ variables: { survey_id: s.id } });
        if (!r?.mySurveyResponse) { setStep('survey'); return; }
      }
      afterSurvey();
    } finally {
      setResolving(false);
    }
  };

  const onSurvey = async (answers: SurveyAnswerInput[]) => {
    if (survey) {
      try { await submitSurvey({ variables: { survey_id: survey.id, answers } }); } catch { /* don't block */ }
    }
    afterSurvey();
  };

  const onMeeting = async (input: MeetingInput) => {
    try { await requestMeeting({ variables: { kind, input } }); } catch { /* don't block */ }
    proceed();
  };

  if (step === 'loading' || step === 'proceed') {
    return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;
  }

  const heading =
    step === 'category' ? (kind === 'VENUE' ? 'Register your venue' : 'Become a host')
    : step === 'survey' ? (survey?.title || (kind === 'VENUE' ? 'Register your venue' : 'Become a host'))
    : 'Schedule your onboarding meeting';
  const subtitle =
    step === 'category' ? 'Tell us your category so we can ask the right questions.'
    : step === 'survey' ? 'A few quick questions before you continue.'
    : 'Last step before registration.';

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto', p: { xs: 1.5, sm: 2 } }}>
      <Card variant="outlined" sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack spacing={0.5} sx={{ mb: 1.5 }}>
            <Typography variant="h6" fontWeight={950}>{heading}</Typography>
            <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
          </Stack>
          {step === 'category' && <CategoryStep submitting={resolving} onContinue={onCategory} />}
          {step === 'survey' && survey && <SurveyForm survey={survey} submitting={submittingSurvey} onSubmit={onSurvey} />}
          {step === 'meeting' && <MeetingForm submitting={requesting} onSubmit={onMeeting} />}
        </CardContent>
      </Card>
    </Box>
  );
}
