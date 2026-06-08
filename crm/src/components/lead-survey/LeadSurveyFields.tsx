import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Snackbar, Stack } from '@mui/material';
import { SAVE_LEAD_SURVEY_RESPONSE, type LeadSurveyAnswer, type LeadSurveyDef, type LeadSurveyEntity } from './queries';
import SurveyStepper, { type SurveyAnswerInput } from './SurveyStepper';
import { parseApiError } from '../../utils/parseApiError';

interface Props {
  entity: LeadSurveyEntity;
  leadId: string;
  survey: LeadSurveyDef;
  initialAnswers?: LeadSurveyAnswer[];
  onSaved: () => void;
}

/** Section-stepped survey fill inside CRM; appends a MANUAL entry on submit. */
export default function LeadSurveyFields({ entity, leadId, survey, initialAnswers, onSaved }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const [save, { loading: saving }] = useMutation(SAVE_LEAD_SURVEY_RESPONSE);

  const onSubmit = async (answers: SurveyAnswerInput[]) => {
    setError(null);
    try {
      await save({ variables: { entity, lead_id: leadId, survey_id: survey.id, answers } });
      setSnack('Survey saved');
      onSaved();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      <SurveyStepper survey={survey} initialAnswers={initialAnswers} submitting={saving} onSubmit={onSubmit} submitLabel="Save survey" />
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} message={snack ?? ''} />
    </Stack>
  );
}
