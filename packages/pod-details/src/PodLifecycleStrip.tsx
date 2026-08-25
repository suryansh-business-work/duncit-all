import { Box, Stack, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { fmtDateTime } from './format';

export interface LifecycleStep {
  key: string;
  label: string;
  /** ISO date, or a word like "Pending" when there is nothing to stamp. */
  when: string | null;
  done: boolean;
  /** The pod ended badly — the last dot goes red with a cross. */
  failed?: boolean;
}

/**
 * Created → Pod date → Completed, as three equal columns.
 *
 * MUI's `alternativeLabel` Stepper sizes itself from its labels, so inside a
 * column card it grew wider than the card and the third step was simply cut
 * off. Three flex children with `minWidth: 0` cannot do that: they divide
 * whatever width there is and the text wraps instead of pushing.
 */
export default function PodLifecycleStrip({ steps }: Readonly<{ steps: LifecycleStep[] }>) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "flex-start",
        py: 1
      }}>
      {steps.map((step, index) => {
        const tone = step.failed ? 'error.main' : 'success.main';
        return (
          <Stack
            key={step.key}
            sx={{
              alignItems: "center",
              flex: 1,
              minWidth: 0,
              position: 'relative',
              px: 0.5
            }}>
            {/* The connector runs from the previous dot to this one, behind
                both, so it never adds width of its own. */}
            {index > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 13,
                  right: '50%',
                  width: '100%',
                  height: 2,
                  bgcolor: step.done ? tone : 'divider',
                }}
              />
            )}
            <Box
              sx={{
                position: 'relative',
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: step.done ? 'common.white' : 'text.disabled',
                bgcolor: step.done ? tone : 'action.disabledBackground',
              }}
            >
              {step.done && (step.failed ? <CloseIcon sx={{ fontSize: 18 }} /> : <CheckIcon sx={{ fontSize: 18 }} />)}
            </Box>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                textAlign: "center",
                mt: 1
              }}>
              {step.label}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                textAlign: "center"
              }}>
              {step.when ? fmtDateTime(step.when) : 'Pending'}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
}
