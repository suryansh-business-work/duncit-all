import { useId, useState, type ReactNode } from 'react';
import { Box, ButtonBase, Collapse, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from '../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../theme';

interface Props {
  testId: string;
  /** What is folded inside, so the host knows whether to open it. */
  hint: string;
  /** Opens it on arrival — something inside is already filled. */
  defaultOpen?: boolean;
  /** Holds it open — something inside failed validation and must be seen. */
  forceOpen?: boolean;
  children: ReactNode;
}

/** A step's optional extras folded under one row, so the step shows only what
 * every pod needs. The fields stay mounted while folded, so the form keeps
 * their values. Native twin: MoreOptionsSection. */
export default function MoreOptionsSection({ testId, hint, defaultOpen = false, forceOpen = false, children }: Readonly<Props>) {
  const [open, setOpen] = useState(defaultOpen);
  const { t } = useTranslation();
  const regionId = useId();
  const shown = open || forceOpen;
  return (
    <Box data-testid={testId}>
      <ButtonBase
        data-testid={`${testId}-toggle`}
        aria-expanded={shown}
        aria-controls={regionId}
        onClick={() => setOpen((value) => !value)}
        sx={{ ...SURFACE_SX, width: '100%', minHeight: 56, px: 2, py: 1.25, gap: 1.5, justifyContent: 'flex-start', textAlign: 'left' }}
      >
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.95rem', fontWeight: 600 }}>{t('mweb.createPod.moreOptions')}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{hint}</Typography>
        </Stack>
        <ExpandMoreIcon
          aria-hidden
          sx={{
            color: 'text.secondary',
            transform: shown ? 'rotate(180deg)' : 'none',
            transition: (theme) => theme.transitions.create('transform'),
          }}
        />
      </ButtonBase>
      <Collapse in={shown} id={regionId}>
        <Stack spacing={2} sx={{ pt: 2 }}>{children}</Stack>
      </Collapse>
    </Box>
  );
}
