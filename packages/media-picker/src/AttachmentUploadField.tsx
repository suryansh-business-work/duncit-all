import { useRef, useState } from 'react';
import { useTranslation } from './i18n/useTranslation';
import type { ChangeEvent } from 'react';
import { Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { DuncitButton } from '@duncit/buttons';
import { AiMonitoringChip } from '@duncit/ai-monitoring/mui';
import { parseApiError } from '@duncit/utils';
import { isVideoUpload } from './attachment';
import { useUploadCaps } from './useUploadCaps';
import { MB } from './utils';
import type { UploadSurface } from './types';
import { useImagekitBase64Upload } from './upload';
import { useImagekitDirectUpload } from './useImagekitDirectUpload';
import AttachmentPreview from './AttachmentPreview';
import type { AttachmentDocVariant } from './AttachmentPreview';

export type UploadStrategy = 'base64' | 'direct';

export interface AttachmentUploadFieldProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** ImageKit folder. Default '/support'. */
  folder?: string;
  /** Maximum number of attachments. Default 5. */
  max?: number;
  label?: string;
  disabled?: boolean;
  /** File-input accept list. Default 'image/*' (use ATTACHMENT_ACCEPT_ALL for docs). */
  accept?: string;
  /**
   * Per-file cap for images and documents, in bytes. Omit it — Admin > Upload
   * Settings for `surface` is the answer, and a number here overrides the
   * admin. `null` means no client-side cap at all (the server still has one).
   */
  maxBytes?: number | null;
  /** Same for videos: omit it and the admin's video cap applies. */
  videoMaxBytes?: number | null;
  /** Which Upload Settings row supplies the caps. Default PORTALS. */
  surface?: UploadSurface;
  /** Let the server accept PDF/office documents (base64 strategy). */
  allowDocuments?: boolean;
  /** 'base64' = server mutation; 'direct' = signed direct-to-ImageKit (large files). */
  strategy?: UploadStrategy;
  /** Allow selecting several files per pick. Default true. */
  multiple?: boolean;
  /** Thumbnail edge in px (64 support/website, 72 mWeb). */
  previewSize?: number;
  /** Non-image preview: 'chip' (support) or 'card' (mWeb). */
  previewVariant?: AttachmentDocVariant;
  /** Error rendering: caption 'text' (support/website) or dismissible 'chip' (mWeb). */
  errorVariant?: 'text' | 'chip';
  oversizeMessage?: (file: File) => string;
  videoOversizeMessage?: string;
  buttonLabel?: string;
  buttonSx?: SxProps<Theme>;
}

interface SizeGate {
  /** Images and documents; null = no client-side cap. */
  maxBytes: number | null;
  videoMaxBytes: number | null;
  oversizeMessage?: (file: File) => string;
  videoOversizeMessage?: string;
}

/** A file is judged by the cap for ITS kind, never by a single number for
 * all three — that is how a photo ended up sharing a document ceiling. */
function sizeProblem(file: File, gate: Readonly<SizeGate>): string | null {
  if (isVideoUpload(file.name, file.type)) {
    if (gate.videoMaxBytes == null || file.size <= gate.videoMaxBytes) return null;
    const mb = Math.round(gate.videoMaxBytes / MB);
    return gate.videoOversizeMessage ?? `Video is too large (max ${mb} MB)`;
  }
  if (gate.maxBytes == null || file.size <= gate.maxBytes) return null;
  if (gate.oversizeMessage) return gate.oversizeMessage(file);
  const mb = Math.round(gate.maxBytes / MB);
  return `${file.name} is too large (max ${mb} MB)`;
}

/**
 * Multi-file ImageKit attachment field (pick files → URL list). Replaces the
 * forked copies in portals/support, portals/website-app and (via
 * strategy='direct') app/mweb's support AttachmentsField.
 */
export default function AttachmentUploadField({
  value,
  onChange,
  folder = '/support',
  max = 5,
  label,
  disabled = false,
  accept = 'image/*',
  maxBytes,
  videoMaxBytes,
  surface = 'PORTALS',
  allowDocuments = false,
  strategy = 'base64',
  multiple = true,
  previewSize = 64,
  previewVariant = 'chip',
  errorVariant = 'text',
  oversizeMessage,
  videoOversizeMessage,
  buttonLabel,
  buttonSx,
}: Readonly<AttachmentUploadFieldProps>) {
  const { t } = useTranslation();
  // The admin's caps, unless this call site named its own.
  const caps = useUploadCaps(surface);
  const imageOrDocCap = maxBytes === undefined ? caps.maxImageBytes : maxBytes;
  const videoCap = videoMaxBytes === undefined ? caps.maxVideoBytes : videoMaxBytes;
  // Resolved here, not as default parameters: a hook cannot run in the
  // parameter list, and a caller-supplied label must still win.
  const heading = label ?? t('media.picker.attachFiles');
  const addLabel = buttonLabel ?? t('media.picker.add');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const base64 = useImagekitBase64Upload();
  const direct = useImagekitDirectUpload();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadOne = async (file: File): Promise<string> => {
    if (strategy === 'direct') return direct.upload(file, folder);
    const res = await base64.upload(file, { folder, allowDocuments });
    return res.url;
  };

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (inputRef.current) inputRef.current.value = '';
    if (!files.length) return;
    const room = Math.max(0, max - value.length);
    const slice = files.slice(0, room);
    setBusy(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const f of slice) {
        const problem = sizeProblem(f, {
          maxBytes: imageOrDocCap,
          videoMaxBytes: videoCap,
          oversizeMessage,
          videoOversizeMessage,
        });
        if (problem) {
          setError(problem);
          continue;
        }
        const url = await uploadOne(f);
        if (url) urls.push(url);
      }
      if (urls.length) onChange([...value, ...urls].slice(0, max));
    } catch (err) {
      setError(parseApiError(err, t('media.picker.uploadFailed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          mb: value.length ? 1 : 0
        }}>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            flex: 1
          }}>
          {heading} ({value.length}/{max})
        </Typography>
        <AiMonitoringChip />
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} hidden onChange={onPick} />
        <DuncitButton
          size="small"
          startIcon={busy ? <CircularProgress size={14} /> : <AttachFileIcon />}
          disabled={disabled || busy || value.length >= max}
          onClick={() => inputRef.current?.click()}
          sx={buttonSx}
        >
          {addLabel}
        </DuncitButton>
      </Stack>
      {error && errorVariant === 'chip' && (
        <Chip
          size="small"
          color="error"
          label={error}
          onDelete={() => setError(null)}
          sx={{ alignSelf: 'flex-start', mb: 1 }}
        />
      )}
      {value.length > 0 && (
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
          {value.map((url, i) => (
            <AttachmentPreview
              key={url + i}
              url={url}
              size={previewSize}
              docVariant={previewVariant}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
            />
          ))}
        </Stack>
      )}
      {error && errorVariant === 'text' && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Box>
  );
}
