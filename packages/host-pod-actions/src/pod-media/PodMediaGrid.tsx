import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import type { PodMediaLabels } from '@duncit/utils';
import type { PodMediaBoardItem } from './queries';

interface Props {
  items: readonly PodMediaBoardItem[];
  labels: PodMediaLabels;
  /** Omitted on a read-only strip — the Complete dialog shows, it does not edit. */
  onRemove?: (url: string) => void;
  busy?: boolean;
}

/**
 * What is on the pod, as a grid of what it looks like.
 *
 * Each tile says who added it, because a host looking at forty photos after an
 * evening is deciding whose to keep — and because a guest has to be able to
 * find their own to take it back down.
 */
export default function PodMediaGrid({ items, labels, onRemove, busy = false }: Readonly<Props>) {
  if (items.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {labels.empty}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
        gap: 1,
      }}
    >
      {items.map((item) => (
        <Stack key={item.url} spacing={0.5}>
          <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', bgcolor: 'action.hover' }}>
            {item.type === 'VIDEO' ? (
              <Box
                component="video"
                src={item.url}
                controls
                preload="metadata"
                sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <Box
                component="img"
                src={item.url}
                alt={labels.uploadedBy(item.uploaded_by_name)}
                loading="lazy"
                sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }}
              />
            )}
            {onRemove && item.can_remove && (
              <Tooltip title={labels.remove}>
                <span style={{ position: 'absolute', top: 4, right: 4 }}>
                  <DuncitIconButton
                    size="small"
                    aria-label={labels.remove}
                    disabled={busy}
                    onClick={() => onRemove(item.url)}
                    sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
                  >
                    <DeleteOutlinedIcon fontSize="small" color="error" />
                  </DuncitIconButton>
                </span>
              </Tooltip>
            )}
          </Box>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Chip
              size="small"
              variant="outlined"
              label={item.source === 'HOST' ? labels.byHost : labels.byGuest}
              color={item.source === 'HOST' ? 'primary' : 'default'}
            />
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary', minWidth: 0 }}>
              {item.uploaded_by_name}
            </Typography>
          </Stack>
        </Stack>
      ))}
    </Box>
  );
}
