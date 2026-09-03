import type { ReactNode } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface Props {
  icon: ReactNode;
  title: string;
  caption: string;
  /** `error` frames the accordion in red — for the destructive bulk actions. */
  tone?: 'default' | 'error';
  children: ReactNode;
}

/**
 * The one header shell every "Advanced settings" accordion opens with: an
 * icon, a bold title and a one-line caption. Four accordions share it so the
 * frame, the spacing and the expand affordance cannot drift apart.
 */
export default function AdvancedAccordion({ icon, title, caption, tone = 'default', children }: Readonly<Props>) {
  const isError = tone === 'error';
  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: 1,
        borderColor: isError ? 'error.light' : 'divider',
        borderRadius: 2,
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          {icon}
          <div>
            <Typography sx={{ fontWeight: 800, color: isError ? 'error.main' : 'text.primary' }}>{title}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {caption}
            </Typography>
          </div>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}
