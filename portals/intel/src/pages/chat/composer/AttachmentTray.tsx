import { useRef } from 'react';
import { Chip, IconButton, Stack, Tooltip } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { useTranslation } from '@duncit/app-settings';
import type { ChatAttachment } from './useChatAttachments';

export const attachmentIcon = (mime: string) => (mime === 'application/pdf' ? <PictureAsPdfOutlinedIcon fontSize="small" /> : <ImageOutlinedIcon fontSize="small" />);

/** The paperclip: opens the file picker for images and PDFs. */
export function AttachButton({ accept, disabled, onFiles }: Readonly<{ accept: string; disabled: boolean; onFiles: (files: FileList) => void }>) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement | null>(null);
  return (
    <>
      <Tooltip title={t('intel.composer.attach')}>
        <span>
          <IconButton aria-label={t('intel.composer.attach')} onClick={() => input.current?.click()} disabled={disabled || !accept}>
            <AttachFileIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept={accept}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </>
  );
}

/** The files waiting to go with the next question: upload progress, failures, and remove. */
export function AttachmentTray({ items, onRemove }: Readonly<{ items: readonly ChatAttachment[]; onRemove: (key: string) => void }>) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, px: 1, pt: 0.5 }} aria-live="polite">
      {items.map((item) => {
        const label = item.status === 'uploading' ? t('intel.composer.attachUploading', { vars: { name: item.name, progress: item.progress } }) : item.name;
        return (
          <Tooltip key={item.key} title={item.status === 'failed' ? t('intel.composer.attachFailed', { vars: { reason: item.error ?? '' } }) : ''}>
            <Chip
              size="small"
              variant="outlined"
              color={item.status === 'failed' ? 'error' : 'default'}
              icon={attachmentIcon(item.mime)}
              label={label}
              onDelete={() => onRemove(item.key)}
              sx={{ maxWidth: 260 }}
            />
          </Tooltip>
        );
      })}
    </Stack>
  );
}
