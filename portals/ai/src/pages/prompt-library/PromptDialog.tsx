import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Dialog, DialogContent, DialogTitle } from '@mui/material';
import { CREATE_AI_PROMPT, UPDATE_AI_PROMPT, type AiPrompt } from './queries';
import { PromptForm, type PromptFormValues } from '../../forms/prompt';
import { parseApiError } from '@duncit/utils';

interface Props {
  open: boolean;
  prompt: AiPrompt | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Create / edit a Prompt Library entry, wrapping the RHF form with GraphQL. On a
 * system prompt only the operator-owned fields are sent — the server ignores the
 * rest, and sending them would just be noise. */
export default function PromptDialog({ open, prompt, onClose, onSaved }: Readonly<Props>) {
  const [error, setError] = useState<string | null>(null);
  const [createPrompt, { loading: creating }] = useMutation(CREATE_AI_PROMPT);
  const [updatePrompt, { loading: updating }] = useMutation(UPDATE_AI_PROMPT);

  const submit = async (values: PromptFormValues) => {
    setError(null);
    const owned = {
      /* v8 ignore next -- description is always a string from the RHF/zod form (default '') */
      description: values.description ?? '',
      content: values.content,
      target_model: values.target_model,
    };
    const input = prompt?.is_system
      ? owned
      : {
          ...owned,
          name: values.name,
          category: values.category,
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
          systemPrompt={!!prompt?.is_system}
          variables={prompt?.variables ?? []}
          submitting={creating || updating}
          submitLabel={prompt ? 'Save changes' : 'Add'}
          onSubmit={submit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
