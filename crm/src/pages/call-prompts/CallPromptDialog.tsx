import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Dialog, DialogContent, DialogTitle } from '@mui/material';
import {
  CREATE_CRM_CALL_PROMPT,
  UPDATE_CRM_CALL_PROMPT,
  type CrmCallPrompt,
} from '../../api/call.gql';
import { CallPromptForm, type CallPromptFormValues } from '../../forms/call-prompt';
import { parseApiError } from '../../utils/parseApiError';

interface Props {
  open: boolean;
  prompt: CrmCallPrompt | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Create / edit a Static Content prompt, wrapping the RHF+Zod form with GraphQL. */
export default function CallPromptDialog({ open, prompt, onClose, onSaved }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [createPrompt, { loading: creating }] = useMutation(CREATE_CRM_CALL_PROMPT);
  const [updatePrompt, { loading: updating }] = useMutation(UPDATE_CRM_CALL_PROMPT);

  const submit = async (values: CallPromptFormValues) => {
    setError(null);
    const input = {
      name: values.name,
      description: values.description ?? '',
      context: values.context,
      language: values.language,
      is_active: values.is_active,
    };
    try {
      if (prompt) await updatePrompt({ variables: { id: prompt.id, input } });
      else await createPrompt({ variables: { input } });
      onSaved();
      onClose();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{prompt ? 'Edit Static Content' : 'Add Static Content'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <CallPromptForm
          defaultValues={prompt ?? undefined}
          submitting={creating || updating}
          submitLabel={prompt ? 'Save changes' : 'Add'}
          onSubmit={submit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
