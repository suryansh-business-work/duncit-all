import { Box, Stack, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ImageIcon from '@mui/icons-material/Image';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';

const VIDEO_RE = /^.+\.(mp4|webm|mov|m4v)(\?.*)?$/i;

interface Props {
  url: string;
  index: number;
  total: number;
  onReplace: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

export default function MediaListRow({
  url,
  index,
  total,
  onReplace,
  onMove,
  onRemove,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1
      }}>
      {VIDEO_RE.test(url) ? (
        <Box
          component="video"
          src={url}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          sx={{
            width: 56,
            height: 56,
            objectFit: 'cover',
            borderRadius: 0.5,
            bgcolor: 'common.black',
          }}
        />
      ) : (
        <Box
          component="img"
          src={url}
          alt=""
          sx={{
            width: 56,
            height: 56,
            objectFit: 'cover',
            borderRadius: 0.5,
            bgcolor: 'action.hover',
          }}
        />
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
          {url}
        </Typography>
        <Typography variant="caption" sx={{
          color: "text.disabled"
        }}>
          #{index + 1}
        </Typography>
      </Box>
      <Tooltip title={t('media.list.replace')}>
        <DuncitIconButton size="small" onClick={onReplace}>
          <ImageIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      <Tooltip title={t('media.list.moveUp')}>
        <span>
          <DuncitIconButton size="small" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUpwardIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('media.list.moveDown')}>
        <span>
          <DuncitIconButton
            size="small"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDownwardIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('media.picker.remove')}>
        <DuncitIconButton size="small" color="error" onClick={onRemove}>
          <DeleteIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
    </Stack>
  );
}
