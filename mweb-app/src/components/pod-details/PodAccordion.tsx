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
  expanded: string | false;
  onChange: (next: string | false) => void;
  children: ReactNode;
}

export default function PodAccordion({
  id,
  title,
  icon,
  expanded,
  onChange,
  children,
}: Props) {
  return (
    <Accordion
      expanded={expanded === id}
      onChange={(_, v) => onChange(v ? id : false)}
      disableGutters
      square
      sx={{
        '&:before': { display: 'none' },
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 56 }}>
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
