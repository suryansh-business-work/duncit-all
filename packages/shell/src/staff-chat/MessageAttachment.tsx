import { useState } from 'react';
import { Backdrop, Box, IconButton, Link, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import type { StaffMessage } from './queries';

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
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
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
  const [lightbox, setLightbox] = useState(false);
  const url = message.attachment_url ?? '';
  if (!url) return null;

  const name = message.attachment_name || 'Attachment';
  const type = message.attachment_type ?? '';
  const isImage = type.startsWith('image');
  const isVideo = type.startsWith('video');
  const size = humanSize(message.attachment_size);

  if (isImage || isVideo) {
    return (
      <>
        <Box
          role="button"
          tabIndex={0}
          aria-label={`Open ${name}`}
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
          sx={{ zIndex: (theme) => theme.zIndex.modal + 1, bgcolor: 'rgba(0,0,0,0.9)' }}
        >
          <IconButton
            aria-label="Close preview"
            onClick={() => setLightbox(false)}
            sx={{ position: 'absolute', top: 12, right: 12, color: '#fff' }}
          >
            <CloseIcon />
          </IconButton>
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
      alignItems="center"
      spacing={1}
      sx={{
        mb: message.text ? 0.5 : 0,
        p: 0.75,
        borderRadius: 1.5,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        maxWidth: 320,
      }}
    >
      <Icon color="action" />
      <Stack sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {name}
        </Typography>
        {size && (
          <Typography variant="caption" color="text.secondary">
            {size}
          </Typography>
        )}
      </Stack>
      <Tooltip title="Download">
        <IconButton
          size="small"
          component={Link}
          href={url}
          download={name}
          target="_blank"
          rel="noreferrer"
          aria-label={`Download ${name}`}
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
