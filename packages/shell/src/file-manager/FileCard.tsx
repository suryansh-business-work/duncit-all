import {
  Box,
  Card,
  CardActionArea,
  Checkbox,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { formatBytes } from '@duncit/media-picker';
import type { MediaItem } from './queries';
import { thumbUrl } from './transform';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  file: MediaItem;
  selected: boolean;
  onToggle: (fileId: string) => void;
  onOpen: (file: MediaItem) => void;
  onCopy: (file: MediaItem) => void;
}

const isImage = (file: MediaItem) => file.fileType === 'image';

/**
 * One tile.
 *
 * The copy button is on the tile rather than only in the details panel, because
 * "give me the link" is what most visits here are for and making that two
 * clicks deep is what sends people back to hunting in ImageKit's own console.
 */
export default function FileCard({ file, selected, onToggle, onOpen, onCopy }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined" sx={{ position: 'relative', height: '100%' }}>
      <Checkbox
        size="small"
        checked={selected}
        onChange={() => onToggle(file.fileId)}
        inputProps={{ 'aria-label': `Select ${file.name}` }}
        sx={{
          position: 'absolute',
          top: 2,
          left: 2,
          zIndex: 1,
          bgcolor: 'background.paper',
          borderRadius: 1,
          p: 0.25,
        }}
      />
      <Tooltip title={t('shell.fileManager.copyLink')}>
        <IconButton
          size="small"
          onClick={() => onCopy(file)}
          aria-label={`Copy link to ${file.name}`}
          sx={{ position: 'absolute', top: 2, right: 2, zIndex: 1, bgcolor: 'background.paper' }}
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <CardActionArea onClick={() => onOpen(file)} sx={{ height: '100%' }}>
        <Box
          sx={{
            height: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
            overflow: 'hidden',
          }}
        >
          {isImage(file) ? (
            <Box
              component="img"
              src={thumbUrl(file.url)}
              alt={file.name}
              loading="lazy"
              sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            <Stack alignItems="center" spacing={0.5} sx={{ color: 'text.secondary' }}>
              <InsertDriveFileIcon />
              <Typography variant="caption">{file.mime || 'file'}</Typography>
            </Stack>
          )}
        </Box>
        <Box sx={{ p: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap title={file.name}>
            {file.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatBytes(file.size)}
            {file.width ? ` · ${file.width}×${file.height}` : ''}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  );
}
