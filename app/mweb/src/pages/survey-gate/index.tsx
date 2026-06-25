import { useEffect, useState } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  ACTIVE_SURVEY_FOR,
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

type Step = 'loading' | 'category' | 'survey' | 'meeting' | 'thanks';

/**
 * Gate before "Register a Venue" / "Become a Host" / "List your product": pick
 * the Super → Category → Sub, then the matching survey (skipped when none),
 * then book an onboarding slot. Ends on a thank-you — the onboarding team takes
 * it from the booked meeting (no redirect to the partner portal).
 */
export default function SurveyGatePage() {
  const params = useParams<{ kind: string }>();
  const navigate = useNavigate();
  const kind = (params.kind?.toUpperCase() as SurveyKind) || 'VENUE';
  const valid = kind === 'VENUE' || kind === 'HOST' || kind === 'ECOMM';
  const [step, setStep] = useState<Step>('loading');
  const [survey, setSurvey] = useState<ActiveSurvey | null>(null);
  const [submittedAnswers, setSubmittedAnswers] = useState<SurveyAnswerInput[]>([]);
  const [scope, setScope] = useState<CategoryScope | null>(null);
  const [resolving, setResolving] = useState(false);
  const [bookedSlot, setBookedSlot] = useState('');
  const [meetingError, setMeetingError] = useState<string | null>(null);

  const [resolveSurvey] = useLazyQuery<{ activeSurveyFor: ActiveSurvey | null }>(ACTIVE_SURVEY_FOR, { fetchPolicy: 'network-only' });
  const [submitSurvey, { loading: submittingSurvey }] = useMutation(SUBMIT_SURVEY_RESPONSE);
  const [requestMeeting, { loading: requesting }] = useMutation(REQUEST_MEETING);

  useEffect(() => {
    if (!valid) { navigate('/hosts-venues', { replace: true }); return; }
    // Always walk the full gate — category → survey (when one matches) →
    // meeting — even when a meeting was requested before: requestMeeting
    // upserts per (user, kind), so re-submitting only updates the request.
    setStep('category');
  }, [valid]); // eslint-disable-line react-hooks/exhaustive-deps

  const afterSurvey = () => setStep('meeting');

  const onCategory = async (picked: CategoryScope) => {
    setScope(picked);
    setResolving(true);
    try {
      const { data } = await resolveSurvey({ variables: { kind, ...picked } });
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
    setMeetingError(null);
    try {
      const taxonomy = {
        super_category_id: scope?.super_category_id || null,
        category_id: scope?.category_id || null,
        sub_category_id: scope?.sub_category_id || null,
      };
      await requestMeeting({ variables: { kind, input: { ...input, ...taxonomy } } });
      setBookedSlot(input.requested_at);
      setStep('thanks');
    } catch (e) {
      setMeetingError(e instanceof Error ? e.message : 'Could not book the slot — please try again.');
    }
  };

  if (step === 'loading') {
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
  else if (step === 'thanks') heading = 'You’re booked!';
  else heading = 'Book your onboarding meeting';
  let subtitle: string;
  if (step === 'category') subtitle = 'Tell us your category so we can ask the right questions.';
  else if (step === 'survey') subtitle = 'A few quick questions before you continue.';
  else if (step === 'thanks') subtitle = 'We look forward to meeting you.';
  else subtitle = 'Pick a slot that works for you.';

  const slotLabel = bookedSlot
    ? new Date(bookedSlot).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })
    : '';

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto', p: { xs: 1.5, sm: 2 }, pb: { xs: 10, sm: 8 } }}>
      <Box sx={{ mb: 1 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} size="small">
          Back
        </Button>
      </Box>
      <Card
        variant="outlined"
        sx={{ borderRadius: 4, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}
      >
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
              <MeetingForm submitting={requesting} error={meetingError} onSubmit={onMeeting} />
            </>
          )}
          {step === 'thanks' && (
            <Stack spacing={2}>
              <Alert severity="success" sx={{ borderRadius: 3 }}>
                Thank you for your submission! Your onboarding meeting is booked for{' '}
                <strong>{slotLabel}</strong>. Our onboarding team will meet you at your selected
                slot — please join 5 minutes early.
              </Alert>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/', { replace: true })}
                sx={{ borderRadius: 999, fontWeight: 900 }}
              >
                Back to Home
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
