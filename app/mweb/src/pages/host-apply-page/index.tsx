import { useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { DuncitRoundButton } from '@duncit/buttons';
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
import { useTranslation } from '../../i18n/useTranslation';

type Step = 'category' | 'survey' | 'success';

/**
 * Host multi-category application: an APPROVED host picks another Super → Category
 * → Sub, answers that category's survey (skipped when none), and submits a Host
 * Request. Reuses the survey-gate flow but SKIPS the meeting gate — straight to
 * submitHostRequest, then a success screen back to Host Studio.
 */
export default function HostApplyPage() {
  const { t } = useTranslation();
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
  const [submitRequest, { loading: submitting }] = useMutation<any>(SUBMIT_HOST_REQUEST);

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
      notifyError(e instanceof Error ? e.message : t('mweb.hostApply.couldNotSubmitYourRequestPlease'));
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

  let heading = t('mweb.hostApply.hostANewCategory');
  if (step === 'survey') {
    heading = survey?.title || heading;
  }

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto', p: { xs: 1.5, sm: 2 }, pb: { xs: 10, sm: 8 } }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
        <DuncitRoundButton
          onClick={() => navigate('/host/manage')}
          aria-label={t('mweb.common.back')}
          sx={{ width: 40, height: 40, minWidth: 40, minHeight: 40, bgcolor: 'background.paper', color: 'text.primary' }}
        >
          <ArrowBackRoundedIcon />
        </DuncitRoundButton>
        {step !== 'success' && (
          <Typography component="h1" noWrap sx={{ flex: 1, minWidth: 0, fontSize: '1.0625rem', fontWeight: 600 }}>
            {heading}
          </Typography>
        )}
      </Stack>
      <Card>
        <CardContent>
          <AuthLogo />
          {step === 'category' && (
            <CategoryStep
              submitting={resolving || submitting}
              onContinue={onCategory}
              disabledIds={takenQ.data?.myHostTakenCategoryIds ?? []}
            />
          )}
          {step === 'survey' && survey && (
            <SurveyStepper survey={survey} submitting={submitting} submitLabel={t('mweb.hostApply.submit')} onSubmit={onSurvey} />
          )}
          {step === 'success' && <SuccessScreen />}
        </CardContent>
      </Card>
    </Box>
  );
}
