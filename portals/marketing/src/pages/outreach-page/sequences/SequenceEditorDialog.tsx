import { useId } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Dialog, DialogContent, DialogTitle, LinearProgress } from '@mui/material';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import SequenceForm, { toSequenceInput, type SequenceFormValues } from '../sequence-form';
import { OUTREACH_WA_TEMPLATES, SAVE_OUTREACH_SEQUENCE, type OutreachSequence, type OutreachWaTemplate } from '../queries';

interface Props {
  open: boolean;
  /** The sequence to edit; null for a new one. */
  sequence: OutreachSequence | null;
  /** A manager edits any sequence; anyone else only one that is switched off. */
  canManage: boolean;
  onClose: () => void;
  onSaved: (sequence: OutreachSequence) => void;
}

const NO_TEMPLATES: readonly OutreachWaTemplate[] = [];

/** New sequence or Edit, in a dialog, with the WhatsApp templates the steps may pick. */
export default function SequenceEditorDialog({ open, sequence, canManage, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const templates = useQuery<{ outreachWaTemplates: OutreachWaTemplate[] }>(OUTREACH_WA_TEMPLATES, { skip: !open, fetchPolicy: 'cache-and-network' });
  const [save, { loading }] = useMutation<{ saveOutreachSequence: OutreachSequence }>(SAVE_OUTREACH_SEQUENCE);
  const readOnly = !canManage && !!sequence?.active;

  const submit = async (values: SequenceFormValues): Promise<boolean> => {
    try {
      const { data } = await save({ variables: { id: sequence?.id ?? null, input: toSequenceInput(values) } });
      /* v8 ignore next -- Apollo rejects a failed mutation, so a resolved one always carries data */
      if (!data) return false;
      notify(t('marketing.outreach.saved'), 'success');
      onSaved(data.saveOutreachSequence);
      return true;
    } catch (err) {
      notify(parseApiError(err), 'error');
      return false;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby={titleId} data-testid="sequence-editor">
      <DialogTitle id={titleId}>{t(sequence ? 'marketing.outreach.editTitle' : 'marketing.outreach.newTitle')}</DialogTitle>
      <DialogContent>
        {templates.loading && !templates.data && <LinearProgress sx={{ mb: 2 }} />}
        {templates.error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {parseApiError(templates.error)}
          </Alert>
        )}
        {readOnly && (
          <Alert severity="info" sx={{ mb: 2 }} data-testid="sequence-read-only">
            {t('marketing.outreach.activeReadOnly')}
          </Alert>
        )}
        <SequenceForm
          sequence={sequence}
          templates={templates.data?.outreachWaTemplates ?? NO_TEMPLATES}
          busy={loading}
          readOnly={readOnly}
          onSubmit={submit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
