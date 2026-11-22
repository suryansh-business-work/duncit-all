import { useRef, useState, type KeyboardEvent } from 'react';
import { Chip, CircularProgress, Stack, TextField } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { DuncitIconButton } from '@duncit/buttons';
import { voiceErrorKey, type AskDuncitAttachmentView } from '@duncit/utils';
import { useImagekitUpload } from '../../utils/imagekit';
import { useAttachmentGate } from '../../utils/uploadLimits';
import { useTranslation } from '../../i18n/useTranslation';
import type { VoiceError } from './useVoice';

interface Props {
  streaming: boolean;
  sending: boolean;
  maxChars: number;
  maxAttachments: number;
  voiceEnabled: boolean;
  recording: boolean;
  transcribing: boolean;
  onSend: (text: string, attachments: AskDuncitAttachmentView[]) => void;
  onStop: () => void;
  onRecordStart: () => Promise<VoiceError | null>;
  onRecordStop: () => Promise<string | null>;
}

const ACCEPT = 'image/*,application/pdf,text/plain,text/csv';

const kindOf = (mime: string) => {
  if (mime.startsWith('image/')) return 'IMAGE';
  return mime === 'application/pdf' ? 'PDF' : 'FILE';
};

/** The message box: text (Enter sends, Shift+Enter breaks a line), files, voice, send / stop. */
export default function Composer(props: Readonly<Props>) {
  const { streaming, sending, maxChars, maxAttachments, voiceEnabled, recording, transcribing } = props;
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<AskDuncitAttachmentView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { upload, uploading } = useImagekitUpload();
  const gate = useAttachmentGate();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const busy = sending || uploading || transcribing;
  const tooLong = text.length > maxChars;

  const send = () => {
    const body = text.trim();
    if ((!body && !files.length) || busy || tooLong || streaming) return;
    props.onSend(body, files);
    setText('');
    setFiles([]);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const refused = gate(file);
    if (refused) {
      setError(refused);
      return;
    }
    setError(null);
    try {
      const url = await upload(file, '/ask-duncit');
      if (url) setFiles((prev) => [...prev, { url, kind: kindOf(file.type), name: file.name, mime: file.type, size: file.size }].slice(0, maxAttachments));
    } catch {
      setError(t('askDuncit.composer.uploadFailed'));
    }
  };

  const toggleMic = async () => {
    if (!recording) {
      const refused = await props.onRecordStart();
      if (refused) setError(t(voiceErrorKey(refused)));
      return;
    }
    const heard = await props.onRecordStop();
    if (heard) setText((prev) => (prev ? `${prev} ${heard}` : heard));
    else setError(t('askDuncit.voice.error.FAILED'));
  };

  return (
    <Stack spacing={0.75} sx={{ px: 1.5, pb: 1.5 }} data-testid="ask-duncit-composer">
      {error && <Chip role="alert" size="small" color="error" label={error} onDelete={() => setError(null)} sx={{ alignSelf: 'flex-start' }} />}
      {files.length > 0 && (
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          {files.map((file) => (
            <Chip key={file.url} size="small" icon={<AttachFileIcon />} label={file.name} onDelete={() => setFiles((prev) => prev.filter((f) => f.url !== file.url))} />
          ))}
        </Stack>
      )}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'flex-end' }}>
        {maxAttachments > 0 && (
          <>
            <input ref={fileRef} type="file" hidden accept={ACCEPT} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; pick(file).catch(() => undefined); }} />
            <DuncitIconButton aria-label={t('askDuncit.composer.attach')} disabled={busy || files.length >= maxAttachments} onClick={() => fileRef.current?.click()}>
              {uploading ? <CircularProgress size={18} /> : <AttachFileIcon />}
            </DuncitIconButton>
          </>
        )}
        <TextField
          fullWidth
          multiline
          maxRows={6}
          size="small"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder={t(recording ? 'askDuncit.voice.listening' : 'askDuncit.composer.placeholder')}
          error={tooLong}
          helperText={tooLong ? t('askDuncit.composer.tooLong') : undefined}
          slotProps={{ htmlInput: { 'aria-label': t('askDuncit.composer.label'), 'data-testid': 'ask-duncit-input' } }}
        />
        {voiceEnabled && (
          <DuncitIconButton aria-label={t(recording ? 'askDuncit.voice.stop' : 'askDuncit.voice.start')} aria-pressed={recording} color={recording ? 'error' : 'default'} disabled={transcribing} onClick={() => { toggleMic().catch(() => undefined); }}>
            {transcribing ? <CircularProgress size={18} /> : <MicNoneOutlinedIcon />}
          </DuncitIconButton>
        )}
        {streaming ? (
          <DuncitIconButton data-testid="ask-duncit-stop" aria-label={t('askDuncit.composer.stop')} color="primary" onClick={props.onStop}>
            <StopRoundedIcon />
          </DuncitIconButton>
        ) : (
          <DuncitIconButton data-testid="ask-duncit-send" aria-label={t('askDuncit.composer.send')} color="primary" disabled={busy || tooLong || (!text.trim() && !files.length)} onClick={send}>
            {sending ? <CircularProgress size={18} /> : <SendRoundedIcon />}
          </DuncitIconButton>
        )}
      </Stack>
    </Stack>
  );
}
