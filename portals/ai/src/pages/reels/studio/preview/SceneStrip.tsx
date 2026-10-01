import { Chip, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { SceneTiming } from '../../composition/timing';
import { formatReelDuration } from '../../format';
import type { ReelAsset } from '../../types';
import MediaThumb from '../MediaThumb';

interface Props {
  timings: readonly SceneTiming[];
  assets: ReadonlyMap<string, ReelAsset>;
  onSeek: (frame: number) => void;
}

/**
 * The reel's scenes in order, each a button that jumps the player to it.
 *
 * A reel is edited by saying things like "make the third clip shorter", so the
 * strip numbers the scenes the way the operator will refer to them — and the
 * editor is told the same order.
 */
export default function SceneStrip({ timings, assets, onSeek }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack
      direction="row"
      role="group"
      aria-label={t('ai.reels.preview.scenes')}
      sx={{ gap: 1, px: 2, py: 1.25, overflowX: 'auto', flexShrink: 0, borderTop: '1px solid', borderColor: 'divider' }}
      data-testid="reel-scene-strip"
    >
      {timings.map(({ scene, from, transitionFrames }, index) => {
        const asset = assets.get(scene.asset_id);
        const number = index + 1;
        const length = formatReelDuration(scene.duration_ms);
        return (
          <Chip
            key={scene.id}
            clickable
            variant="outlined"
            avatar={<MediaThumb kind={asset?.kind ?? 'IMAGE'} src={asset?.thumbnail_url ?? ''} size={24} />}
            label={t('ai.reels.preview.sceneChip', { vars: { number, length } })}
            aria-label={t('ai.reels.preview.goToScene', { vars: { number, length } })}
            // Past the overlap, so the jump lands on the scene itself rather than mid-transition.
            onClick={() => onSeek(from + transitionFrames)}
            data-testid={`reel-scene-${scene.id}`}
            sx={{ flexShrink: 0 }}
          />
        );
      })}
    </Stack>
  );
}
