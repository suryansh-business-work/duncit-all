import { useState, type KeyboardEvent } from 'react';
import { IconButton, InputBase, Paper, Stack, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import { useTranslation } from '@duncit/app-settings';
import type { IntelModelOption } from '@duncit/gql-types';
import { AttachButton, AttachmentTray } from './AttachmentTray';
import ComposerControls, { type ComposerSettings } from './ComposerControls';
import { useChatAttachments } from './useChatAttachments';

/** The longest question the server accepts (INTEL_LIMITS.maxMessageChars). */
export const MAX_MESSAGE_CHARS = 12_000;

interface Props {
  settings: ComposerSettings;
  onSettings: (next: ComposerSettings) => void;
  models: IntelModelOption[];
  environments: string[];
  allowedSources: string[];
  busy: boolean;
  streaming: boolean;
  draft: string;
  onDraft: (text: string) => void;
  /** The question and the ids of the images / PDFs attached to it. */
  onSend: (text: string, attachmentIds: string[]) => void;
  onStop: () => void;
  /** Upload limits from Settings › Media & Uploads. */
  uploadMaxMb: number;
  uploadTypes: readonly string[];
}

/** The input: Enter sends, Shift+Enter breaks the line; images and PDFs can be attached; Stop while an answer streams. */
export default function Composer(props: Readonly<Props>) {
  const { settings, onSettings, models, environments, allowedSources, busy, streaming, draft, onDraft, onSend, onStop, uploadMaxMb, uploadTypes } = props;
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const files = useChatAttachments({ maxMb: uploadMaxMb, types: uploadTypes });
  const text = draft.trim();
  const tooLong = draft.length > MAX_MESSAGE_CHARS;
  const canSend = (text.length > 0 || files.ids.length > 0) && !files.uploading && !busy && !streaming && !tooLong;

  const submit = () => {
    if (!canSend) return;
    onSend(text || t('intel.composer.attachmentsOnly'), files.ids);
    onDraft('');
    files.clear();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 1, borderRadius: 3, borderColor: focused ? 'primary.main' : 'divider', transition: 'border-color .2s, box-shadow .2s', boxShadow: focused ? 3 : 0 }}>
      <AttachmentTray items={files.items} onRemove={files.remove} />
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'flex-end', px: 0.5 }}>
        <AttachButton accept={files.accept} disabled={files.full || busy || streaming} onFiles={files.add} />
        <InputBase
          multiline
          maxRows={8}
          fullWidth
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onPaste={(e) => {
            if (e.clipboardData.files.length > 0) files.add(e.clipboardData.files);
          }}
          placeholder={t('intel.composer.placeholder')}
          inputProps={{ 'aria-label': t('intel.composer.placeholder'), maxLength: MAX_MESSAGE_CHARS + 1 }}
          sx={{ py: 1, fontSize: '0.95rem' }}
          error={tooLong}
        />
        {streaming ? (
          <Tooltip title={t('intel.composer.stop')}>
            <IconButton aria-label={t('intel.composer.stop')} onClick={onStop} color="primary">
              <StopCircleIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title={t('intel.composer.send')}>
            <span>
              <IconButton aria-label={t('intel.composer.send')} onClick={submit} disabled={!canSend} sx={{ bgcolor: canSend ? 'primary.main' : 'action.disabledBackground', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } }}>
                <SendIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>
      <ComposerControls value={settings} onChange={onSettings} models={models} environments={environments} allowedSources={allowedSources} onVoice={(spoken) => onDraft(draft ? `${draft} ${spoken}` : spoken)} disabled={busy || streaming} />
    </Paper>
  );
}
