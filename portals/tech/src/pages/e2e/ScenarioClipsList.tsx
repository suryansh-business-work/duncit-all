import { Box, Chip, Link, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { E2eScenarioVideo } from './queries';

type ClipColor = 'success' | 'error' | 'default';

/** Mocha's words for how a test ended, as chip colours. Anything else is neutral. */
const CLIP_COLOR: Record<string, ClipColor> = { passed: 'success', failed: 'error' };

interface RowProps {
  clip: E2eScenarioVideo;
  stateLabel: string;
  watchLabel: string;
}

function ClipRow({ clip, stateLabel, watchLabel }: Readonly<RowProps>) {
  return (
    <Box
      sx={{ borderTop: 1, borderColor: 'divider', py: 1, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}
    >
      <Chip
        size="small"
        label={stateLabel}
        color={CLIP_COLOR[clip.state] ?? 'default'}
        variant={CLIP_COLOR[clip.state] ? 'filled' : 'outlined'}
        sx={{ minWidth: 84 }}
      />
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
          {clip.title}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {clip.suite}
          </Typography>
          {/* The clip lives in Slack, which is where it plays. A run that could
              not share its clips simply has no link — the dialog above it
              says why. */}
          {clip.permalink && (
            <Link href={clip.permalink} target="_blank" rel="noopener noreferrer" variant="caption" underline="hover">
              {watchLabel}
            </Link>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

/**
 * One row per scenario, in the order they ran — the way the Slack thread
 * reads. Renders nothing for a run that cut no clips, which is every run of a
 * suite that does not record scenario boundaries.
 */
export default function ScenarioClipsList({ clips }: Readonly<{ clips: E2eScenarioVideo[] }>) {
  const { t } = useTranslation();
  if (clips.length === 0) return null;
  const stateLabels: Record<string, string> = {
    passed: t('tech.e2e.suitePassed'),
    failed: t('tech.e2e.suiteFailed'),
    pending: t('tech.e2e.scenarioPending'),
  };
  return (
    <Box>
      <Typography variant="subtitle2">
        {t('tech.e2e.detailScenarios', { vars: { count: String(clips.length) } })}
      </Typography>
      {clips.map((clip) => (
        <ClipRow
          key={clip.file_id}
          clip={clip}
          stateLabel={stateLabels[clip.state] ?? clip.state}
          watchLabel={t('tech.e2e.watchClip')}
        />
      ))}
    </Box>
  );
}
