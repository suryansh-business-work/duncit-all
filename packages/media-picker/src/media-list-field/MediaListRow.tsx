import { Box, Stack, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ImageIcon from '@mui/icons-material/Image';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';

const VIDEO_RE = /^.+\.(mp4|webm|mov|m4v)(\?.*)?$/i;

/** The four control names a row shows as tooltips and reads to a screen reader. */
export interface MediaListRowLabels {
  replace: string;
  moveUp: string;
  moveDown: string;
  remove: string;
}

export interface MediaListRowProps {
  url: string;
  index: number;
  total: number;
  onReplace: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  /**
   * The host's own copy for the controls. Omit it for the shared `media.*`
   * wording; a form package that ships these labels under its own namespace
   * (`clubForm.mediaRow.*`, `podForm.mediaRow.*`) passes them so its
   * translations keep applying.
   */
  labels?: MediaListRowLabels;
}

/** One image/video row in a media list, with replace, reorder and remove controls. */
export default function MediaListRow({
  url,
  index,
  total,
  onReplace,
  onMove,
  onRemove,
  labels,
}: Readonly<MediaListRowProps>) {
  const { t } = useTranslation();
  const copy = labels ?? {
    replace: t('media.list.replace'),
    moveUp: t('media.list.moveUp'),
    moveDown: t('media.list.moveDown'),
    remove: t('media.picker.remove'),
  };
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
          color: "text.secondary"
        }}>
          #{index + 1}
        </Typography>
      </Box>
      <Tooltip title={copy.replace}>
        <DuncitIconButton size="small" onClick={onReplace}>
          <ImageIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      <Tooltip title={copy.moveUp}>
        <span>
          {/* The tooltip names the span it wraps, not this button — name it too. */}
          <DuncitIconButton
            size="small"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label={copy.moveUp}
            data-testid="media-list-move-up"
          >
            <ArrowUpwardIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
      <Tooltip title={copy.moveDown}>
        <span>
          <DuncitIconButton
            size="small"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label={copy.moveDown}
            data-testid="media-list-move-down"
          >
            <ArrowDownwardIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
      <Tooltip title={copy.remove}>
        <DuncitIconButton size="small" color="error" onClick={onRemove}>
          <DeleteIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
    </Stack>
  );
}
