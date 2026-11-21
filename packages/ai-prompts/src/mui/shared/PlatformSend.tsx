import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CodeIcon from '@mui/icons-material/Code';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DuncitButton } from '@duncit/buttons';
import { MAX_PREFILL_CHARS, PROMPT_PLATFORMS, platformLink, type PromptPlatform, type PromptPlatformId } from '../../share/platforms';
import { bookmarklet, injectionScript } from '../../share/scripts';
import { useDetailCopy } from '../../i18n/useDetailCopy';
import { useCopyText } from './useCopyText';
import { runInBackground } from '../../log';

export type SendEvent = 'OPEN_IN_PLATFORM' | 'COPY_SCRIPT';

interface Props {
  /** The prompt as it will be sent: variables filled, extra input appended. */
  text: string;
  /** Told about every hand-off, for the prompt's analytics. */
  onEvent: (type: SendEvent, platform: PromptPlatformId) => void;
  /** Off until the prompt is complete (a required placeholder still blank). */
  disabled?: boolean;
}

/**
 * Hand the prompt to an LLM: one button per platform, and copy-ready scripts
 * for when a link cannot carry it.
 *
 * A prompt longer than a URL can hold is copied first and the platform opened
 * empty — the reader pastes. The note above the buttons says so before they
 * click, not after.
 */
export function PlatformSend({ text, onEvent, disabled = false }: Readonly<Props>) {
  const copy = useDetailCopy();
  const copyText = useCopyText();
  const tooLong = text.length > MAX_PREFILL_CHARS;

  const open = async (platform: PromptPlatform) => {
    const link = platformLink(platform, text);
    if (!link.prefilled) await copyText(text, copy.detail.copied);
    globalThis.open(link.url, '_blank', 'noopener,noreferrer');
    onEvent('OPEN_IN_PLATFORM', platform.id);
  };

  const scriptFor = (platform: PromptPlatform) =>
    injectionScript(platform, text, { noComposer: copy.send.noComposer, inserted: copy.send.inserted });

  const copyScript = async (platform: PromptPlatform, asBookmarklet: boolean) => {
    const script = scriptFor(platform);
    const ok = await copyText(asBookmarklet ? bookmarklet(script) : script, copy.send.scriptCopied);
    if (ok) onEvent('COPY_SCRIPT', platform.id);
  };

  return (
    <Stack spacing={1.5}>
      {tooLong && (
        <Alert severity="info" sx={{ py: 0.5 }}>
          {copy.send.tooLong}
        </Alert>
      )}
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
        {PROMPT_PLATFORMS.map((platform) => (
          <DuncitButton
            key={platform.id}
            variant="outlined"
            disabled={disabled}
            startIcon={<OpenInNewIcon />}
            onClick={() => runInBackground(open(platform), 'open')}
            data-testid={`prompt-send-${platform.id}`}
          >
            {copy.send.openIn(platform.name)}
          </DuncitButton>
        ))}
      </Box>
      <Accordion disableGutters variant="outlined">
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">{copy.send.scriptsTitle}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
            {copy.send.scriptsHint}
          </Typography>
          <Stack spacing={1}>
            {PROMPT_PLATFORMS.map((platform) => (
              <Stack key={platform.id} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <DuncitButton
                  size="small"
                  disabled={disabled}
                  startIcon={<CodeIcon />}
                  onClick={() => runInBackground(copyScript(platform, false), 'copyScript')}
                  data-testid={`prompt-script-${platform.id}`}
                >
                  {copy.send.copyScript(platform.name)}
                </DuncitButton>
                <DuncitButton
                  size="small"
                  disabled={disabled}
                  startIcon={<BookmarkAddIcon />}
                  onClick={() => runInBackground(copyScript(platform, true), 'copyScript')}
                  data-testid={`prompt-bookmarklet-${platform.id}`}
                >
                  {copy.send.copyBookmarklet(platform.name)}
                </DuncitButton>
              </Stack>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
