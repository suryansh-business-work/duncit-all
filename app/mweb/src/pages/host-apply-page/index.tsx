import { useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CategoryStep, { type CategoryScope } from '../survey-gate/CategoryStep';
import SurveyStepper, { type SurveyAnswerInput } from '../survey-gate/SurveyStepper';
import AuthLogo from '../../components/AuthLogo';
import { notifyError } from '../../components/notify';
import {
  ACTIVE_SURVEY_FOR,
  MY_HOST_TAKEN_CATEGORY_IDS,
  SUBMIT_HOST_REQUEST,
  type ActiveSurvey,
  type SubmitHostRequestInput,
} from './queries';
import SuccessScreen from './SuccessScreen';

type Step = 'category' | 'survey' | 'success';

/**
 * Host multi-category application: an APPROVED host picks another Super → Category
 * → Sub, answers that category's survey (skipped when none), and submits a Host
 * Request. Reuses the survey-gate flow but SKIPS the meeting gate — straight to
 * submitHostRequest, then a success screen back to Host Studio.
 */
export default function HostApplyPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('category');
  const [scope, setScope] = useState<CategoryScope | null>(null);
  const [survey, setSurvey] = useState<ActiveSurvey | null>(null);
  const [resolving, setResolving] = useState(false);

  const [resolveSurvey] = useLazyQuery<{ activeSurveyFor: ActiveSurvey | null }>(ACTIVE_SURVEY_FOR, {
    fetchPolicy: 'network-only',
  });
  const takenQ = useQuery<{ myHostTakenCategoryIds: string[] }>(MY_HOST_TAKEN_CATEGORY_IDS, {
    fetchPolicy: 'cache-and-network',
  });
  const [submitRequest, { loading: submitting }] = useMutation(SUBMIT_HOST_REQUEST);

  const submit = async (picked: CategoryScope, answers: SurveyAnswerInput[], surveyId: string | null) => {
    const input: SubmitHostRequestInput = {
      super_category_id: picked.super_category_id || null,
      category_id: picked.category_id || null,
      sub_category_id: picked.sub_category_id || null,
      survey_id: surveyId,
      answers: answers.map((a) => ({ qid: a.qid, value: a.value ?? null, values: a.values ?? [] })),
    };
    try {
      await submitRequest({ variables: { input } });
      setStep('success');
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Could not submit your request — please try again.');
    }
  };

  const onCategory = async (picked: CategoryScope) => {
    setScope(picked);
    setResolving(true);
    try {
      const { data } = await resolveSurvey({ variables: { kind: 'HOST', ...picked } });
      const s = data?.activeSurveyFor ?? null;
      setSurvey(s);
      if (s) { setStep('survey'); return; }
      await submit(picked, [], null);
    } finally {
      setResolving(false);
    }
  };

  const onSurvey = (answers: SurveyAnswerInput[]) => {
    if (!scope) return;
    submit(scope, answers, survey?.id ?? null).catch(() => undefined);
  };

  let heading = 'Host a new category';
  let subtitle = 'Tell us your category so we can ask the right questions.';
  if (step === 'survey') {
    heading = survey?.title || heading;
    subtitle = 'A few quick questions before you submit.';
  }

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto', p: { xs: 1.5, sm: 2 }, pb: { xs: 10, sm: 8 } }}>
      <Box sx={{ mb: 1 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/host/manage')} size="small">
          Back
        </Button>
      </Box>
      <Card variant="outlined" sx={{ borderRadius: 4, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}>
        <CardContent>
          <AuthLogo />
          {step !== 'success' && (
            <Stack spacing={0.5} sx={{ mb: 1.5 }}>
              <Typography variant="h6" fontWeight={950}>{heading}</Typography>
              <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
            </Stack>
          )}
          {step === 'category' && (
            <CategoryStep
              submitting={resolving || submitting}
              onContinue={onCategory}
              disabledIds={takenQ.data?.myHostTakenCategoryIds ?? []}
            />
          )}
          {step === 'survey' && survey && (
            <SurveyStepper survey={survey} submitting={submitting} submitLabel="Submit" onSubmit={onSurvey} />
          )}
          {step === 'success' && <SuccessScreen />}
        </CardContent>
      </Card>
    </Box>
  );
}
