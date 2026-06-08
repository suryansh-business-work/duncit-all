import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, Divider, Snackbar, Stack,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EditNoteIcon from '@mui/icons-material/EditNote';
import LinkIcon from '@mui/icons-material/Link';
import { LeadDetailCard } from '../LeadDetailCard';
import {
  DELETE_LEAD_SURVEY_ENTRY,
  GENERATE_LEAD_SURVEY_LINK,
  LEAD_SURVEY,
  REVOKE_LEAD_SURVEY_LINK,
  surveyLinkUrl,
  type LeadSurveyAnswer,
  type LeadSurveyEntity,
  type LeadSurveyEntry,
  type LeadSurveyResult,
} from './queries';
import LeadSurveyFields from './LeadSurveyFields';
import LeadSurveyEntriesTable from './LeadSurveyEntriesTable';
import { parseApiError } from '../../utils/parseApiError';

interface Props {
  entity: LeadSurveyEntity;
  leadId: string;
}

/** "Survey" tab on a venue/host lead: fill (stepper), share a link, and the full log. */
export default function LeadSurveyTab({ entity, leadId }: Props) {
  const [filling, setFilling] = useState(false);
  const [seed, setSeed] = useState<LeadSurveyAnswer[] | undefined>(undefined);
  const [snack, setSnack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<LeadSurveyResult>(LEAD_SURVEY, {
    variables: { entity, lead_id: leadId },
    fetchPolicy: 'cache-and-network',
  });
  const [generate, { loading: generating }] = useMutation(GENERATE_LEAD_SURVEY_LINK);
  const [revoke, { loading: revoking }] = useMutation(REVOKE_LEAD_SURVEY_LINK);
  const [del, { loading: deleting }] = useMutation(DELETE_LEAD_SURVEY_ENTRY);

  const survey = data?.leadSurvey?.survey ?? null;
  const entries = data?.leadSurvey?.entries ?? [];

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setError(null);
    try { await fn(); if (ok) setSnack(ok); await refetch(); } catch (e) { setError(parseApiError(e)); }
  };

  const openFill = (entry?: LeadSurveyEntry) => { setSeed(entry?.answers); setFilling(true); };
  const onGenerateLink = () => survey && run(async () => {
    const res = await generate({ variables: { entity, lead_id: leadId, survey_id: survey.id } });
    const token = res.data?.generateLeadSurveyLink?.token as string | undefined;
    if (token) await navigator.clipboard?.writeText(surveyLinkUrl(token)).catch(() => undefined);
  }, 'Link generated & copied to clipboard');

  if (loading && !data) return <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>;

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
      subtitle="Fill it as a stepper, share a public link, or click a row to fill/edit — every generation is logged."
      icon={<AssignmentIcon color="primary" />}
      action={
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<EditNoteIcon />} variant={filling ? 'contained' : 'outlined'} onClick={() => (filling ? setFilling(false) : openFill())}>
            {filling ? 'Close form' : 'Fill manually'}
          </Button>
          <Button size="small" startIcon={<LinkIcon />} variant="outlined" disabled={generating} onClick={onGenerateLink}>
            Generate link
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2}>
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {filling && (
          <>
            <LeadSurveyFields
              entity={entity}
              leadId={leadId}
              survey={survey}
              initialAnswers={seed}
              onSaved={() => { setFilling(false); setSnack('Survey saved'); refetch(); }}
            />
            <Divider />
          </>
        )}
        <LeadSurveyEntriesTable
          entries={entries}
          survey={survey}
          onRevoke={(id) => run(() => revoke({ variables: { entry_id: id } }))}
          onDelete={(id) => setConfirmDelete(id)}
          onFill={openFill}
          revoking={revoking}
          deleting={deleting}
        />
      </Stack>

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete survey entry?</DialogTitle>
        <DialogContent><DialogContentText>This permanently removes this generation/response from the log.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={deleting} onClick={() => { const id = confirmDelete!; setConfirmDelete(null); run(() => del({ variables: { entry_id: id } })); }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} message={snack ?? ''} />
    </LeadDetailCard>
  );
}
