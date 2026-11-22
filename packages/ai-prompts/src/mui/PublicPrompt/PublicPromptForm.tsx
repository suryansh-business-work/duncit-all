import { useMemo } from 'react';
import { useForm, useWatch, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { estimateTokens } from '../../render';
import type { SharedPrompt, PublicEventInput } from '../../share/publicApi';
import { composePrompt, publicPromptDefaults, publicPromptSchema, type PublicPromptValues } from '../../share/publicSchema';
import { useDetailCopy } from '../../i18n/useDetailCopy';
import { PlatformSend } from '../shared/PlatformSend';
import { useCopyText } from '../shared/useCopyText';
import { runInBackground } from '../../log';

interface Props {
  prompt: SharedPrompt;
  onEvent: (input: PublicEventInput) => void;
}

/**
 * The visitor's half of a shared prompt: fill its placeholders, add anything
 * else, watch the finished prompt take shape, then copy it or send it to an LLM.
 */
export function PublicPromptForm({ prompt, onEvent }: Readonly<Props>) {
  const copy = useDetailCopy();
  const copyText = useCopyText();
  const schema = useMemo(
    () => publicPromptSchema({ required: copy.publicPage.required, tooLong: copy.publicPage.tooLongField }, prompt.variables),
    [copy, prompt.variables],
  );
  const { control, formState } = useForm<PublicPromptValues>({
    resolver: zodResolver(schema),
    defaultValues: publicPromptDefaults(prompt.variables),
    mode: 'onChange',
  });
  // Seeded from the defaults, so every field is present from the first render.
  const values = useWatch({ control }) as PublicPromptValues;
  const composed = composePrompt(prompt.content, values);
  const ready = formState.isValid;

  const copyPrompt = async () => {
    if (await copyText(composed, copy.detail.copied)) onEvent({ type: 'COPY_PROMPT' });
  };

  return (
    <Stack spacing={2.5} component="form" noValidate onSubmit={(event) => event.preventDefault()}>
      {prompt.variables.length > 0 && (
        <Box component="section">
          <Typography variant="h6" component="h2">
            {copy.publicPage.variablesTitle}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
            {copy.publicPage.variablesHint}
          </Typography>
          <Stack spacing={1.5}>
            {prompt.variables.map((variable) => (
              <RhfTextField
                key={variable.name}
                control={control}
                name={`values.${variable.name}` as Path<PublicPromptValues>}
                label={variable.label}
                placeholder={variable.example || undefined}
                hint={variable.description || undefined}
                required={variable.required}
                multiline
                minRows={1}
              />
            ))}
          </Stack>
        </Box>
      )}

      <RhfTextField
        control={control}
        name="extra"
        label={copy.publicPage.extraLabel}
        hint={copy.publicPage.extraHint}
        multiline
        minRows={3}
      />

      <Box component="section" aria-live="polite">
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1 }}>
          <Typography variant="h6" component="h2">
            {copy.publicPage.previewTitle}
          </Typography>
          <Chip size="small" color="primary" variant="outlined" label={copy.detail.tokens(estimateTokens(composed))} />
        </Stack>
        <Paper
          variant="outlined"
          component="pre"
          aria-label={copy.publicPage.previewTitle}
          sx={{ m: 0, p: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', maxHeight: (theme) => theme.spacing(50), overflow: 'auto' }}
        >
          {composed}
        </Paper>
        <Box sx={{ mt: 1 }}>
          <DuncitButton startIcon={<ContentCopyIcon />} disabled={!ready} onClick={() => runInBackground(copyPrompt(), 'copyPrompt')}>
            {copy.detail.copyPrompt}
          </DuncitButton>
        </Box>
      </Box>

      <Box component="section">
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
          {copy.share.sendTitle}
        </Typography>
        <PlatformSend text={composed} disabled={!ready} onEvent={(type, platform) => onEvent({ type, platform })} />
      </Box>
    </Stack>
  );
}
