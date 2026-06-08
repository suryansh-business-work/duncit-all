import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Dialog, DialogContent, DialogTitle } from '@mui/material';
import { CREATE_AI_PROMPT, UPDATE_AI_PROMPT, type AiPrompt } from './queries';
import { PromptForm, type PromptFormValues } from '../../forms/prompt';
import { parseApiError } from '../../utils/parseApiError';

interface Props {
  open: boolean;
  prompt: AiPrompt | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Create / edit a Prompt Library entry, wrapping the Formik form with GraphQL. */
export default function PromptDialog({ open, prompt, onClose, onSaved }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [createPrompt, { loading: creating }] = useMutation(CREATE_AI_PROMPT);
  const [updatePrompt, { loading: updating }] = useMutation(UPDATE_AI_PROMPT);

  const submit = async (values: PromptFormValues) => {
    setError(null);
    const input = {
      name: values.name,
      description: values.description ?? '',
      content: values.content,
      category: values.category,
      target_model: values.target_model,
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
      <DialogTitle>{prompt ? 'Edit prompt' : 'Add prompt'}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}
        <PromptForm
          initialValues={
            prompt
              ? {
                  name: prompt.name,
                  description: prompt.description ?? '',
                  category: prompt.category,
                  target_model: prompt.target_model,
                  content: prompt.content,
                  is_active: prompt.is_active,
                }
              : undefined
          }
          submitting={creating || updating}
          submitLabel={prompt ? 'Save changes' : 'Add'}
          onSubmit={submit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
