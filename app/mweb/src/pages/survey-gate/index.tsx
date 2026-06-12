import { useEffect, useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import {
  ACTIVE_SURVEY_FOR,
  MY_MEETING,
  PARTNER_PATH,
  REQUEST_MEETING,
  SUBMIT_SURVEY_RESPONSE,
  type ActiveSurvey,
  type SurveyKind,
} from './queries';
import CategoryStep, { type CategoryScope } from './CategoryStep';
import SurveyStepper, { type SurveyAnswerInput } from './SurveyStepper';
import SubmittedSummary from './SubmittedSummary';
import MeetingForm, { type MeetingInput } from './MeetingForm';
import AuthLogo from '../../components/AuthLogo';

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
  const valid = kind === 'VENUE' || kind === 'HOST' || kind === 'ECOMM';
  const next = PARTNER_PATH[kind] ?? '/hosts-venues';
  const [step, setStep] = useState<Step>('loading');
  const [survey, setSurvey] = useState<ActiveSurvey | null>(null);
  const [submittedAnswers, setSubmittedAnswers] = useState<SurveyAnswerInput[]>([]);
  const [resolving, setResolving] = useState(false);

  const proceed = () => navigate(next, { replace: true });

  const { data: meet, loading: meetLoading } = useQuery<{ myMeeting: { id: string } | null }>(MY_MEETING, { variables: { kind }, skip: !valid, fetchPolicy: 'network-only' });
  const [resolveSurvey] = useLazyQuery<{ activeSurveyFor: ActiveSurvey | null }>(ACTIVE_SURVEY_FOR, { fetchPolicy: 'network-only' });
  const [submitSurvey, { loading: submittingSurvey }] = useMutation(SUBMIT_SURVEY_RESPONSE);
  const [requestMeeting, { loading: requesting }] = useMutation(REQUEST_MEETING);

  const meetingDone = !!meet?.myMeeting;

  useEffect(() => {
    if (!valid) { navigate('/hosts-venues', { replace: true }); return; }
    if (meetLoading) return;
    // Once the meeting is requested the gate is satisfied — proceed without
    // re-prompting. Otherwise re-ask category → survey → meeting every visit.
    if (meetingDone) { proceed(); return; }
    setStep('category');
  }, [valid, meetLoading, meetingDone]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Re-prompt the survey on every visit until the meeting is requested — we
      // no longer skip it just because a response was submitted before.
      if (s) { setStep('survey'); return; }
      afterSurvey();
    } finally {
      setResolving(false);
    }
  };

  const onSurvey = async (answers: SurveyAnswerInput[]) => {
    setSubmittedAnswers(answers);
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

  const KIND_HEADINGS: Record<SurveyKind, string> = {
    VENUE: 'Register your venue',
    HOST: 'Become a host',
    ECOMM: 'List your product',
  };
  const kindHeading = KIND_HEADINGS[kind];
  let heading: string;
  if (step === 'category') heading = kindHeading;
  else if (step === 'survey') heading = survey?.title || kindHeading;
  else heading = 'Schedule your onboarding meeting';
  let subtitle: string;
  if (step === 'category') subtitle = 'Tell us your category so we can ask the right questions.';
  else if (step === 'survey') subtitle = 'A few quick questions before you continue.';
  else subtitle = 'Last step before registration.';

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto', p: { xs: 1.5, sm: 2 } }}>
      <Card variant="outlined" sx={{ borderRadius: 4 }}>
        <CardContent>
          <AuthLogo />
          <Stack spacing={0.5} sx={{ mb: 1.5 }}>
            <Typography variant="h6" fontWeight={950}>{heading}</Typography>
            <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
          </Stack>
          {step === 'category' && <CategoryStep submitting={resolving} onContinue={onCategory} />}
          {step === 'survey' && survey && <SurveyStepper survey={survey} submitting={submittingSurvey} onSubmit={onSurvey} />}
          {step === 'meeting' && (
            <>
              {survey && <SubmittedSummary survey={survey} answers={submittedAnswers} />}
              <MeetingForm submitting={requesting} onSubmit={onMeeting} />
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
