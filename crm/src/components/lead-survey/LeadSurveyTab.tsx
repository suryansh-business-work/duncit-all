import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { LeadDetailCard } from '../LeadDetailCard';
import { LEAD_SURVEY, type LeadSurveyEntity, type LeadSurveyResult } from './queries';
import LeadSurveyFields from './LeadSurveyFields';

interface Props {
  entity: LeadSurveyEntity;
  leadId: string;
}

const formatDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
};

/**
 * "Survey" tab on a venue/host lead. Generates the onboarding survey matching
 * the lead's Super → Category → Sub and saves the filled response on the lead.
 */
export default function LeadSurveyTab({ entity, leadId }: Props) {
  const [open, setOpen] = useState(false);
  const { data, loading, refetch } = useQuery<LeadSurveyResult>(LEAD_SURVEY, {
    variables: { entity, lead_id: leadId },
    fetchPolicy: 'cache-and-network',
  });

  const survey = data?.leadSurvey?.survey ?? null;
  const response = data?.leadSurvey?.response ?? null;
  const savedAt = formatDate(response?.submitted_at);
  const showForm = open || !!response;

  if (loading && !data) {
    return <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>;
  }

  if (!survey) {
    return (
      <LeadDetailCard title="Survey" icon={<AssignmentIcon color="primary" />}>
        <Alert severity="info">
          No onboarding survey matches this lead's category yet. Create one in the Onboarding portal scoped to this
          Super → Category → Sub, then reopen this tab.
        </Alert>
      </LeadDetailCard>
    );
  }

  return (
    <LeadDetailCard
      title={survey.title || 'Survey'}
      subtitle={savedAt ? `Last saved ${savedAt}${response?.submitted_by ? ` by ${response.submitted_by}` : ''}` : 'Generated from the matching onboarding survey'}
      icon={<AssignmentIcon color="primary" />}
    >
      {showForm ? (
        <LeadSurveyFields entity={entity} leadId={leadId} survey={survey} response={response} onSaved={() => refetch()} />
      ) : (
        <Stack spacing={1.5} alignItems="flex-start">
          <Typography variant="body2" color="text.secondary">
            A {survey.questions.length}-question survey is available for this lead's category.
          </Typography>
          <Button variant="contained" startIcon={<AutoAwesomeIcon />} onClick={() => setOpen(true)}>
            Generate survey
          </Button>
        </Stack>
      )}
    </LeadDetailCard>
  );
}
