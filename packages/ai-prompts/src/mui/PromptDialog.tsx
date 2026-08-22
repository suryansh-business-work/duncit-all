import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Box, Dialog, DialogContent, DialogTitle, Stack } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { CREATE_AI_PROMPT, UPDATE_AI_PROMPT } from '../queries';
import { promptFeedUrl } from '../copy';
import { usePromptCopy } from '../i18n/useCopy';
import type { PromptFormValues } from '../schema';
import type { AiPrompt } from '../types';
import { PromptForm } from './PromptForm';
import { PromptContext } from './PromptContext';
import { FeedUrlBar } from './FeedUrlBar';

interface Props {
  open: boolean;
  /** The row being edited, or null to create a new AI prompt. */
  prompt: AiPrompt | null;
  apiOrigin: string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Create / edit a Prompt Library entry: the form on the left, and on the right
 * the things that make an edit safe to make — where it runs, what it
 * substitutes, and the finished prompt.
 *
 * On a code prompt only the operator-owned fields are sent. The server ignores
 * the rest (the catalogue overwrites them on the next boot), so sending them
 * would be noise that reads like it did something.
 */
export function PromptDialog({ open, prompt, apiOrigin, onClose, onSaved }: Readonly<Props>) {
  const copy = usePromptCopy();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  // The preview follows the row that is open, not the one that was open last:
  // without this the panel shows the previous prompt for a frame after a switch.
  useEffect(() => setDraft(prompt?.content ?? ''), [prompt]);
  const [createPrompt, { loading: creating }] = useMutation(CREATE_AI_PROMPT);
  const [updatePrompt, { loading: updating }] = useMutation(UPDATE_AI_PROMPT);
  const code = prompt?.kind === 'CODE';

  const submit = async (values: PromptFormValues) => {
    setError(null);
    const owned = {
      description: values.description,
      content: values.content,
      target_model: values.target_model,
    };
    const identity = {
      name: values.name,
      category: values.category,
      is_active: values.is_active,
    };
    try {
      if (prompt) {
        const input = code ? owned : { ...owned, ...identity };
        await updatePrompt({ variables: { id: prompt.id, input } });
      } else {
        await createPrompt({ variables: { input: { ...owned, ...identity, key: values.key } } });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const title = prompt ? copy.editPrompt : copy.createTitle;
  const initialValues = prompt
    ? {
        name: prompt.name,
        key: prompt.key ?? '',
        description: prompt.description ?? '',
        category: prompt.category,
        target_model: prompt.target_model,
        content: prompt.content,
        is_active: prompt.is_active,
      }
    : undefined;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <PromptForm
              initialValues={initialValues}
              code={code}
              editing={!!prompt}
              variables={prompt?.variables ?? []}
              submitting={creating || updating}
              submitLabel={prompt ? copy.saveChanges : copy.add}
              onSubmit={submit}
              onCancel={onClose}
              onContentChange={setDraft}
            />
          </Box>
          {prompt && (
            <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
              <Stack spacing={1.5}>
                {prompt.key && (
                  <FeedUrlBar
                    url={promptFeedUrl(apiOrigin, { key: prompt.key })}
                    label={copy.apiCopyOne}
                  />
                )}
                <PromptContext prompt={prompt} content={draft} />
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
