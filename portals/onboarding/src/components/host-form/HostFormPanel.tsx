import type { ReactNode } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface Props {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** One collapsible section of the host form. */
export default function HostFormPanel({ title, expanded, onToggle, children }: Readonly<Props>) {
  return (
    <Accordion expanded={expanded} onChange={onToggle} disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>{children}</Stack>
      </AccordionDetails>
    </Accordion>
  );
}
