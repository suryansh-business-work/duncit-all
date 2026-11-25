import { Avatar, Box, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { formatReelDuration } from '../../format';
import type { ReelStockItem } from '../../types';

interface Props {
  track: ReelStockItem;
  /** True when the reel already holds this track. */
  added: boolean;
  busy: boolean;
  onAdd: (track: ReelStockItem) => void;
}

/**
 * One track: its cover, who made it, how long it runs, its licence, a preview
 * to listen to before it costs anything, and the way into the reel. The
 * preview streams from the library only when played (`preload="none"`), so a
 * page of results downloads no music at all.
 */
export default function MusicTrackRow({ track, added, busy, onAdd }: Readonly<Props>) {
  const { t } = useTranslation();
  const name = track.attribution || track.provider_id;

  return (
    <Box component="li" sx={{ listStyle: 'none', py: 1, borderBottom: '1px solid', borderColor: 'divider' }} data-testid={`reel-music-item-${track.id}`}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
        <Avatar variant="rounded" src={track.preview_url || undefined} alt="" sx={{ width: 40, height: 40 }}>
          <MusicNoteIcon fontSize="small" />
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={name}>
            {name}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap title={track.licence}>
            {[formatReelDuration(track.duration_ms), track.licence].filter(Boolean).join(' · ')}
          </Typography>
        </Box>
        {added ? (
          <Tooltip title={t('ai.reels.sources.alreadyAdded')}>
            {/* titleAccess, not role/aria-label: MUI hides an icon from screen readers unless it has one. */}
            <CheckIcon fontSize="small" titleAccess={t('ai.reels.sources.alreadyAdded')} sx={{ color: 'success.main', mx: 1 }} />
          </Tooltip>
        ) : (
          <Tooltip title={t('ai.reels.sources.add')}>
            <span>
              <DuncitIconButton
                size="small"
                aria-label={t('ai.reels.music.addNamed', { vars: { name } })}
                disabled={busy}
                onClick={() => onAdd(track)}
                data-testid={`reel-music-add-${track.id}`}
              >
                <AddIcon fontSize="small" />
              </DuncitIconButton>
            </span>
          </Tooltip>
        )}
      </Stack>
      {track.url && (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- a library music preview; Jamendo publishes no caption track for it
        <Box
          component="audio"
          controls
          preload="none"
          src={track.url}
          aria-label={t('ai.reels.music.previewNamed', { vars: { name } })}
          sx={{ width: '100%', height: 32, mt: 0.75 }}
          data-testid={`reel-music-preview-${track.id}`}
        />
      )}
    </Box>
  );
}
