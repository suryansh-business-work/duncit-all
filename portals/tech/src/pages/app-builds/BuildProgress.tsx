import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useTranslation } from '@duncit/shell';
import { isLive, isStaleRunning, type AppBuildRow, type AppBuildStage } from './queries';

/**
 * What the runner has done so far, in order.
 *
 * The workflow reports a stage as it ENTERS it, so the last entry is what is
 * happening now and everything above it is finished. That makes a thirteen
 * minute build legible while it runs: "still going" and "stuck on pods for
 * eight minutes" look identical in a spinner and completely different here.
 */
interface Props {
  build: AppBuildRow;
}

/** Minutes a finished stage took, from when the next one started. */
const gapMinutes = (from: string, to: string): number =>
  Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000));

interface StageRowProps {
  stage: AppBuildStage;
  /** The last entry is the current one — unless the build has stopped. */
  current: boolean;
  took: string;
}

function StageRow({ stage, current, took }: Readonly<StageRowProps>) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Box sx={{ display: 'flex', width: 18, justifyContent: 'center' }}>
        {current ? (
          <CircularProgress size={13} thickness={6} />
        ) : (
          <CheckCircleIcon sx={{ fontSize: 15 }} color="success" />
        )}
      </Box>
      <Typography variant="body2" sx={{ flex: 1 }} fontWeight={current ? 600 : 400}>
        {stage.name}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {took}
      </Typography>
    </Stack>
  );
}

export default function BuildProgress({ build }: Readonly<Props>) {
  const { t } = useTranslation();
  const stages = build.stages ?? [];
  if (stages.length === 0) return null;

  // A stopped build has no current stage, and neither does one whose runner
  // died — leaving a spinner on the stage it died in would claim it is still
  // being worked on.
  const live = isLive(build) && !isStaleRunning(build);
  const lastIndex = stages.length - 1;

  return (
    <Stack spacing={0.75}>
      <Typography variant="subtitle2">{t('tech.appBuilds.progressTitle')}</Typography>
      {stages.map((stage, index) => {
        const next = stages[index + 1];
        const isCurrent = live && index === lastIndex;
        // Only a stage that has ENDED has a duration; the running one is still
        // accruing and the number would be wrong the moment it was rendered.
        const took = next
          ? t('tech.appBuilds.stageTook', {
              vars: { minutes: String(gapMinutes(stage.at, next.at)) },
            })
          : '';
        return <StageRow key={stage.at} stage={stage} current={isCurrent} took={took} />;
      })}
      {!live && stages.length > 0 && (
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box sx={{ display: 'flex', width: 18, justifyContent: 'center' }}>
            <RadioButtonUncheckedIcon sx={{ fontSize: 15 }} color="disabled" />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t('tech.appBuilds.progressEnded')}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
