import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { tokens } from '@duncit/theme';
import LiveRunProgress from './LiveRunProgress';
import { KIND_KEYS, RUN_PATH, type TestsLiveRun, type TestsLiveRunKind } from './queries';
import { useLiveRun } from './useLiveRun';

const KIND_ICONS: Readonly<Record<TestsLiveRunKind, ReactNode>> = {
  UNIT: <ScienceOutlinedIcon fontSize="small" />,
  E2E: <RouteOutlinedIcon fontSize="small" />,
  STRESS: <SpeedOutlinedIcon fontSize="small" />,
};

/** A ring that spreads out from the live dot and fades — the "on air" light. */
const ping = keyframes`
  from { transform: scale(1); opacity: 0.8; }
  to { transform: scale(2.6); opacity: 0; }
`;
const PING_MS = tokens.motion.slow * 6;
/** The icon badge and the live dot, in theme spacing units. */
const BADGE_UNITS = 4;
const DOT_UNITS = 1;

function LiveDot() {
  return (
    <Box
      aria-hidden
      sx={(theme) => ({
        position: 'relative',
        width: theme.spacing(DOT_UNITS),
        height: theme.spacing(DOT_UNITS),
        borderRadius: '50%',
        bgcolor: 'info.main',
        flexShrink: 0,
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          bgcolor: 'info.main',
          animation: `${ping} ${PING_MS}ms ${tokens.motion.ease} infinite`,
        },
        '@media (prefers-reduced-motion: reduce)': { '&::after': { animation: 'none', display: 'none' } },
      })}
    />
  );
}

/** One live run in the strip: what kind it is, which run, where to open it, and how far along it is. */
export default function LiveRunCard({ run }: Readonly<{ run: TestsLiveRun }>) {
  const { t } = useTranslation();
  const state = useLiveRun(run.kind, run.run_id);
  const kind = t(KIND_KEYS[run.kind]);
  const accent = state?.progress.overdue ? 'warning' : 'info';

  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        p: 2,
        borderLeft: `${tokens.size.indicator}px solid ${theme.palette[accent].main}`,
        bgcolor: alpha(theme.palette[accent].main, tokens.state.hover),
      })}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
          <Box
            aria-hidden
            sx={(theme) => ({
              width: theme.spacing(BADGE_UNITS),
              height: theme.spacing(BADGE_UNITS),
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              color: `${accent}.main`,
              bgcolor: alpha(theme.palette[accent].main, tokens.state.tint[theme.palette.mode]),
            })}
          >
            {KIND_ICONS[run.kind]}
          </Box>
          <Stack sx={{ minWidth: 0, flexGrow: 1 }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" component="h3" noWrap>
                {kind}
              </Typography>
              <LiveDot />
            </Stack>
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontFamily: tokens.font.mono }}>
              {run.ref ? t('tests.live.subtitle', { vars: { run: run.run_no, ref: run.ref } }) : run.run_no}
            </Typography>
          </Stack>
          <DuncitButton
            component={RouterLink}
            to={RUN_PATH[run.kind](run.run_id)}
            size="small"
            sx={{ flexShrink: 0 }}
            aria-label={t('tests.common.openNamed', { vars: { name: `${kind} ${run.run_no}` } })}
          >
            {t('tests.common.open')}
          </DuncitButton>
        </Stack>
        {state && (
          <LiveRunProgress
            state={state}
            label={t('tests.live.progressLabel', { vars: { kind, run: run.run_no } })}
          />
        )}
      </Stack>
    </Paper>
  );
}
