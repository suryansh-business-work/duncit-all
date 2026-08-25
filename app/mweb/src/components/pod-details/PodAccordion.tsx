import { ReactNode } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface Props {
  id: string;
  title: string;
  icon?: ReactNode;
  defaultExpanded?: boolean;
  expanded: boolean;
  onChange: (open: boolean) => void;
  /** Colors the summary header/title in the theme error color (e.g. invalid section). */
  error?: boolean;
  children: ReactNode;
}

export default function PodAccordion({
  id,
  title,
  icon,
  expanded,
  onChange,
  error = false,
  children,
}: Readonly<Props>) {
  const accent = error ? 'error.main' : 'primary.main';
  return (
    <Accordion
      expanded={expanded}
      onChange={(_, v) => onChange(v)}
      disableGutters
      square
      sx={{
        '&:before': { display: 'none' },
        mb: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: 'none',
        bgcolor: 'background.paper',
        '&.Mui-expanded': { mb: 1 },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ minHeight: 56 }}
        aria-controls={`${id}-content`}
        id={`${id}-header`}
      >
        <Stack
          direction="row"
          spacing={1.25}
          sx={{
            alignItems: "center",
            flex: 1
          }}>
          {icon && <Box sx={{ display: 'flex', color: accent }}>{icon}</Box>}
          <Typography variant="subtitle1" color={error ? 'error.main' : undefined} sx={{
            fontWeight: 600
          }}>
            {title}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}
