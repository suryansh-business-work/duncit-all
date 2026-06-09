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
  children: ReactNode;
}

export default function PodAccordion({
  id,
  title,
  icon,
  expanded,
  onChange,
  children,
}: Readonly<Props>) {
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
        borderRadius: 1.5,
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
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ flex: 1 }}>
          {icon && <Box sx={{ display: 'flex', color: 'primary.main' }}>{icon}</Box>}
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}
