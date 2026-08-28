import { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { Backdrop, Box, Link, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { DuncitIconButton } from '@duncit/buttons';
import VoiceNotePlayer from './voice/VoiceNotePlayer';
import type { StaffMessage } from './queries';

/**
 * How long the note ran, read off the name the recorder gave it.
 *
 * The audio element reports its own duration eventually, but a webm written by
 * MediaRecorder carries no duration in its header — browsers report Infinity
 * until the whole thing has been played through, which is exactly the number
 * you cannot show before somebody presses play.
 */
const secondsFromName = (name: string): number =>
  Number(/voice-note-(\d+)s/.exec(name)?.[1] ?? 0);

/** Bytes as something a person reads, not a number they have to divide. */
export function humanSize(bytes?: number | null): string {
  const value = Number(bytes) || 0;
  if (value <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const power = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  return `${(value / 1024 ** power).toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
}

/** An icon per family, so a PDF does not look like a zip. */
function iconFor(name: string, type: string) {
  // slice/lastIndexOf rather than split(...).pop(), whose Array#pop() return
  // type is optional for the general case — this name always has a tail, a
  // dot or not, so there is no real "nothing to lower-case" branch to guard.
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  if (type.includes('pdf') || ext === 'pdf') return PictureAsPdfIcon;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return TableChartIcon;
  if (['doc', 'docx', 'txt', 'rtf', 'md'].includes(ext)) return DescriptionIcon;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return FolderZipIcon;
  return InsertDriveFileIcon;
}

interface Props {
  message: StaffMessage;
}

/**
 * Whatever came with the message.
 *
 * An image or a video shows itself and opens full-screen; everything else is a
 * named row with its type, its size and a download that does not navigate the
 * chat away. The size matters more than it looks: "can I open this on my
 * phone right now" is answered by a number, not by a filename.
 */
export default function MessageAttachment({ message }: Readonly<Props>) {
  const { t } = useTranslation();
  const [lightbox, setLightbox] = useState(false);
  const url = message.attachment_url ?? '';
  if (!url) return null;

  const name = message.attachment_name || 'Attachment';
  const type = message.attachment_type ?? '';
  const isImage = type.startsWith('image');
  const isVideo = type.startsWith('video');
  const size = humanSize(message.attachment_size);

  // A voice note is audio that arrived with a waveform. Audio WITHOUT one is a
  // file somebody attached, and belongs in the named row below like any other.
  const peaks = message.attachment_peaks ?? [];
  if (type.startsWith('audio') && peaks.length > 0) {
    return <VoiceNotePlayer url={url} peaks={peaks} seconds={secondsFromName(name)} />;
  }

  if (isImage || isVideo) {
    return (
      <>
        <Box
          role="button"
          tabIndex={0}
          aria-label={t('shell.chat.attachment.open', { vars: { name } })}
          onClick={() => setLightbox(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setLightbox(true);
            }
          }}
          sx={{ cursor: 'zoom-in', mb: message.text ? 0.5 : 0, maxWidth: 320 }}
        >
          {isImage ? (
            <Box
              component="img"
              src={url}
              alt={name}
              loading="lazy"
              sx={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 1.5, display: 'block' }}
            />
          ) : (
            <Box
              component="video"
              src={url}
              controls
              preload="metadata"
              sx={{ width: '100%', maxHeight: 240, borderRadius: 1.5, display: 'block' }}
            />
          )}
        </Box>

        <Backdrop
          open={lightbox}
          onClick={() => setLightbox(false)}
          sx={{
            zIndex: (theme) => theme.zIndex.modal + 1,
            bgcolor: (theme) => alpha(theme.palette.common.black, 0.9),
          }}
        >
          <DuncitIconButton
            aria-label={t('shell.chat.attachment.closePreview')}
            onClick={() => setLightbox(false)}
            sx={{ position: 'absolute', top: 12, right: 12, color: (theme) => theme.palette.common.white }}
          >
            <CloseIcon />
          </DuncitIconButton>
          {isImage ? (
            <Box
              component="img"
              src={url}
              alt={name}
              sx={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain' }}
            />
          ) : (
            <Box
              component="video"
              src={url}
              controls
              autoPlay
              sx={{ maxWidth: '92vw', maxHeight: '88vh' }}
            />
          )}
        </Backdrop>
      </>
    );
  }

  const Icon = iconFor(name, type);
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        mb: message.text ? 0.5 : 0,
        p: 0.75,
        borderRadius: 1.5,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        maxWidth: 320
      }}>
      <Icon color="action" />
      <Stack sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {name}
        </Typography>
        {size && (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {size}
          </Typography>
        )}
      </Stack>
      <Tooltip title={t('shell.chat.attachment.download')}>
        <DuncitIconButton
          size="small"
          component={Link}
          href={url}
          download={name}
          target="_blank"
          rel="noreferrer"
          aria-label={t('shell.chat.attachment.downloadNamed', { vars: { name } })}
        >
          <DownloadIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
    </Stack>
  );
}
