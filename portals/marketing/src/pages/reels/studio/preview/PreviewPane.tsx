import { useMemo, useState } from 'react';
import { Box, Stack, ToggleButton, Tooltip, Typography } from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import { Player, type PlayerRef } from '@remotion/player';
import { useTranslation } from '@duncit/shell';
import { frameOf } from '../../composition/aspect';
import { ReelComposition } from '../../composition/ReelComposition';
import { reelDurationInFrames, sceneTimings } from '../../composition/timing';
import { remotionLicenseKey } from '../../license';
import type { ReelProject } from '../../types';
import SafeZones from './SafeZones';

/** Shown until the editor has made a first cut. */
function EmptyPreview({ hasFootage }: Readonly<{ hasFootage: boolean }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 320, color: 'text.secondary' }} data-testid="reel-preview-empty">
      <MovieFilterIcon sx={{ fontSize: 48 }} aria-hidden />
      <Typography variant="subtitle1" component="p" sx={{ color: 'text.primary', fontWeight: 600 }}>
        {t('ai.reels.preview.emptyTitle')}
      </Typography>
      <Typography variant="body2">
        {hasFootage ? t('ai.reels.preview.emptyWithFootage') : t('ai.reels.preview.emptyNoFootage')}
      </Typography>
    </Stack>
  );
}

/**
 * The centre pane: the reel, playing.
 *
 * The player is handed the spec as props and nothing else, so an edit arriving
 * from the chat — or a hand edit on the timeline — redraws the same mounted
 * player in place: the playhead stays where it was and unchanged clips are not
 * fetched again. There is no render step between an edit and the picture.
 *
 * `onPlayer` hands the mounted player to the timeline, which follows its
 * playhead and moves it. The safe-zone guides are a toggle over the player:
 * what a network's own interface will cover, so a title is not put there.
 */
export default function PreviewPane({
  project,
  onPlayer,
}: Readonly<{ project: ReelProject; onPlayer?: (player: PlayerRef | null) => void }>) {
  const { t } = useTranslation();
  const { spec, assets } = project;
  const timings = useMemo(() => sceneTimings(spec), [spec]);
  const inputProps = useMemo(() => ({ spec, assets }), [spec, assets]);
  const frame = frameOf(spec);
  const [guides, setGuides] = useState(false);

  return (
    <Stack component="section" aria-label={t('ai.reels.preview.title')} sx={{ height: '100%', minHeight: 0 }} data-testid="reel-preview-pane">
      <Stack direction="row" sx={{ justifyContent: 'flex-end', px: 1.5, py: 0.5 }}>
        <Tooltip title={t('ai.reels.preview.safeZonesHint')}>
          <ToggleButton
            value="guides"
            size="small"
            selected={guides}
            onChange={() => setGuides((on) => !on)}
            aria-label={t('ai.reels.preview.safeZones')}
            data-testid="reel-safe-zones-toggle"
          >
            <GridOnIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, pt: 0, bgcolor: 'action.hover' }}>
        {timings.length === 0 ? (
          <EmptyPreview hasFootage={assets.length > 0} />
        ) : (
          <Box sx={{ position: 'relative', height: '100%', maxWidth: '100%', aspectRatio: `${frame.width} / ${frame.height}` }}>
            <Player
              ref={onPlayer}
              component={ReelComposition}
              inputProps={inputProps}
              durationInFrames={reelDurationInFrames(timings)}
              compositionWidth={frame.width}
              compositionHeight={frame.height}
              fps={spec.fps}
              controls
              loop
              acknowledgeRemotionLicense={remotionLicenseKey !== null}
              style={{
                height: '100%',
                width: '100%',
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: spec.background,
              }}
            />
            {guides && <SafeZones />}
          </Box>
        )}
      </Box>
    </Stack>
  );
}
