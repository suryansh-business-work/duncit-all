import { Backdrop, Box, Stack, Typography } from '@mui/material';
import { AI_MONITOR_GRADIENT_CSS, AI_MONITOR_MOTION } from '@duncit/utils';
import { AiMonitorGlyph } from './AiMonitorGlyph';
import { aiMotion, aiScan } from './motion';

const { scanMs } = AI_MONITOR_MOTION;

export interface AiProcessingOverlayProps {
  open: boolean;
  /** What is happening. */
  title: string;
  /** Why it takes a moment. */
  note: string;
  /** What the reader should do meanwhile. */
  hold: string;
  testId?: string;
}

/**
 * The wait a person sits behind while an AI check reads what they submitted.
 *
 * It blocks on purpose: the content is being read and published, so an editable
 * form underneath would be a form whose edits are already too late.
 *
 * It holds no copy of its own — the three sentences come from the caller, the
 * same way `AiMonitoringDialog` takes its `copy`. Create Pod's wording is not
 * a listing's wording, and a shared component inventing a fourth set of
 * strings would be one more thing to translate. Native twin —
 * `AiMonitorOverlay` (rule 27).
 */
export function AiProcessingOverlay({
  open,
  title,
  note,
  hold,
  testId,
}: Readonly<AiProcessingOverlayProps>) {
  return (
    <Backdrop
      open={open}
      data-testid={testId}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 1,
        bgcolor: 'rgba(3,7,18,0.74)',
        backdropFilter: 'blur(8px)',
        p: 2,
      }}
    >
      <Stack
        spacing={1.25}
        sx={{
          alignItems: 'center',
          width: 'min(340px, calc(100vw - 32px))',
          px: 3,
          py: 3.5,
          borderRadius: '16px',
          textAlign: 'center',
          color: '#fff',
          bgcolor: 'rgba(17,24,39,0.94)',
          border: '1px solid rgba(255,255,255,0.16)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.42)',
        }}
      >
        <AiMonitorGlyph size={56} rings />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Box
          aria-hidden
          sx={{
            width: '100%',
            height: 4,
            borderRadius: 999,
            overflow: 'hidden',
            bgcolor: 'rgba(255,255,255,0.14)',
          }}
        >
          <Box
            sx={{
              width: '38%',
              height: '100%',
              borderRadius: 999,
              background: AI_MONITOR_GRADIENT_CSS,
              ...aiMotion(`${aiScan} ${scanMs}ms ease-in-out infinite`),
            }}
          />
        </Box>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
          {note}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>
          {hold}
        </Typography>
      </Stack>
    </Backdrop>
  );
}
