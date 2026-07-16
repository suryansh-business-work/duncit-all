import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { parseApiError } from '@duncit/utils';
import { isVideoUpload } from './attachment';
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
  /** Per-file size cap in bytes. Default 15 MB. */
  maxBytes?: number;
  /** Optional tighter cap for videos (mWeb support = 50 MB). */
  videoMaxBytes?: number;
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
  maxBytes: number;
  videoMaxBytes?: number;
  oversizeMessage?: (file: File) => string;
  videoOversizeMessage?: string;
}

function sizeProblem(file: File, gate: Readonly<SizeGate>): string | null {
  if (
    gate.videoMaxBytes != null &&
    isVideoUpload(file.name, file.type) &&
    file.size > gate.videoMaxBytes
  ) {
    const mb = Math.round(gate.videoMaxBytes / (1024 * 1024));
    return gate.videoOversizeMessage ?? `Video is too large (max ${mb} MB)`;
  }
  if (file.size > gate.maxBytes) {
    if (gate.oversizeMessage) return gate.oversizeMessage(file);
    const mb = Math.round(gate.maxBytes / (1024 * 1024));
    return `${file.name} is too large (max ${mb} MB)`;
  }
  return null;
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
  label = 'Attach files',
  disabled = false,
  accept = 'image/*',
  maxBytes = 15 * 1024 * 1024,
  videoMaxBytes,
  allowDocuments = false,
  strategy = 'base64',
  multiple = true,
  previewSize = 64,
  previewVariant = 'chip',
  errorVariant = 'text',
  oversizeMessage,
  videoOversizeMessage,
  buttonLabel = 'Add',
  buttonSx,
}: Readonly<AttachmentUploadFieldProps>) {
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
        const problem = sizeProblem(f, { maxBytes, videoMaxBytes, oversizeMessage, videoOversizeMessage });
        if (problem) {
          setError(problem);
          continue;
        }
        const url = await uploadOne(f);
        if (url) urls.push(url);
      }
      if (urls.length) onChange([...value, ...urls].slice(0, max));
    } catch (err) {
      setError(parseApiError(err, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: value.length ? 1 : 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {label} ({value.length}/{max})
        </Typography>
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} hidden onChange={onPick} />
        <Button
          size="small"
          startIcon={busy ? <CircularProgress size={14} /> : <AttachFileIcon />}
          disabled={disabled || busy || value.length >= max}
          onClick={() => inputRef.current?.click()}
          sx={buttonSx}
        >
          {buttonLabel}
        </Button>
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
