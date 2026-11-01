import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, LinearProgress, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { notify } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { OUTREACH_SEQUENCES, SET_OUTREACH_SEQUENCE_ACTIVE, type OutreachSequence } from '../queries';
import SequenceCard from './SequenceCard';
import SequenceEditorDialog from './SequenceEditorDialog';
import EnrollDialog from '../enroll-form/EnrollDialog';

type Editing = { sequence: OutreachSequence | null } | null;

/** Every sequence as a card, with New sequence; a card opens the editor or, for a manager, the enroll dialog. */
export default function SequencesTab({ canManage }: Readonly<{ canManage: boolean }>) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ outreachSequences: OutreachSequence[] }>(OUTREACH_SEQUENCES, {
    fetchPolicy: 'cache-and-network',
  });
  const [setActiveMut, activeState] = useMutation<{ setOutreachSequenceActive: OutreachSequence }>(SET_OUTREACH_SEQUENCE_ACTIVE);
  const [editing, setEditing] = useState<Editing>(null);
  const [enrolling, setEnrolling] = useState<OutreachSequence | null>(null);
  const sequences = data?.outreachSequences ?? [];

  const setActive = async (sequence: OutreachSequence, active: boolean): Promise<boolean> => {
    try {
      await setActiveMut({ variables: { id: sequence.id, active } });
      notify(t(active ? 'marketing.outreach.switchedOn' : 'marketing.outreach.switchedOff', { vars: { name: sequence.name } }), 'success');
      return true;
    } catch (err) {
      notify(parseApiError(err), 'error');
      return false;
    }
  };

  const saved = () => {
    setEditing(null);
    fireAndForget(refetch(), logs.portal.marketing, 'outreach', 'SequencesTab');
  };

  return (
    <Stack spacing={2} data-testid="sequences-tab">
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }} data-tour="outreach-new">
        <Typography variant="body2" color="text.secondary">
          {t('marketing.outreach.sequencesHint')}
        </Typography>
        <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({ sequence: null })} data-testid="new-sequence">
          {t('marketing.outreach.newSequence')}
        </DuncitButton>
      </Stack>
      {loading && !data && <LinearProgress />}
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {data && sequences.length === 0 && (
        <Alert severity="info" data-testid="sequences-empty">
          {t('marketing.outreach.emptySequences')}
        </Alert>
      )}
      {sequences.map((sequence) => (
        <SequenceCard
          key={sequence.id}
          sequence={sequence}
          canManage={canManage}
          busy={activeState.loading}
          onEdit={(row) => setEditing({ sequence: row })}
          onEnroll={setEnrolling}
          onSetActive={setActive}
        />
      ))}
      <SequenceEditorDialog
        open={editing !== null}
        sequence={editing?.sequence ?? null}
        canManage={canManage}
        onClose={() => setEditing(null)}
        onSaved={saved}
      />
      <EnrollDialog sequence={enrolling} onClose={() => setEnrolling(null)} onEnrolled={saved} />
    </Stack>
  );
}
