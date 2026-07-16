import { Avatar, Box, Chip, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import MovieIcon from '@mui/icons-material/Movie';
import { describeAttachment, typeLabel } from './attachment';

export type AttachmentDocVariant = 'chip' | 'card';

export interface AttachmentPreviewProps {
  url: string;
  onRemove: () => void;
  /** Square thumbnail edge in px. 64 (support/website) or 72 (mWeb). */
  size?: number;
  /** Non-image rendering: outlined Chip (support) or icon card (mWeb). */
  docVariant?: AttachmentDocVariant;
}

/** Type-aware preview: image thumbnail vs a small chip/card for video/doc. */
export default function AttachmentPreview({
  url,
  onRemove,
  size = 64,
  docVariant = 'chip',
}: Readonly<AttachmentPreviewProps>) {
  const info = describeAttachment(url);
  const badgeSize = size >= 72 ? 24 : 22;
  const badgeFont = size >= 72 ? 14 : 13;
  const removeButton = (
    <IconButton
      size="small"
      aria-label="Remove attachment"
      onClick={onRemove}
      sx={{
        position: 'absolute',
        top: -8,
        right: -8,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        width: badgeSize,
        height: badgeSize,
      }}
    >
      <CloseIcon sx={{ fontSize: badgeFont }} />
    </IconButton>
  );

  if (info.kind === 'image') {
    return (
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <Avatar
          variant="rounded"
          src={url}
          sx={{ width: size, height: size, '& img': { objectFit: 'cover' } }}
        />
        {removeButton}
      </Box>
    );
  }

  if (docVariant === 'card') {
    return (
      <Box sx={{ position: 'relative' }}>
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{ height: size, px: 1, maxWidth: 168, border: 1, borderColor: 'divider', borderRadius: 2 }}
        >
          {info.kind === 'video' ? <MovieIcon color="action" /> : <InsertDriveFileIcon color="action" />}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" noWrap sx={{ display: 'block', fontWeight: 700 }}>
              {info.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {typeLabel(info.ext)}
            </Typography>
          </Box>
        </Stack>
        {removeButton}
      </Box>
    );
  }

  return (
    <Chip
      variant="outlined"
      icon={<InsertDriveFileIcon />}
      label={info.name}
      onDelete={onRemove}
      sx={{ maxWidth: 200, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
    />
  );
}
