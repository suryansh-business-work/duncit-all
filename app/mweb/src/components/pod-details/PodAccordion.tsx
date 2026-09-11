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

/** One collapsible section: a 24px surface card whose header is an icon disc and
 * a section title. Native twin: components/details/Accordion. */
export default function PodAccordion({
  id,
  title,
  icon,
  expanded,
  onChange,
  error = false,
  children,
}: Readonly<Props>) {
  const tint = error ? 'error.main' : 'secondary.main';
  return (
    <Accordion
      expanded={expanded}
      onChange={(_, v) => onChange(v)}
      disableGutters
      square
      sx={{
        '&:before': { display: 'none' },
        mb: 1.5,
        border: '1px solid',
        borderColor: error ? 'error.main' : 'var(--duncit-card-border)',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: 'var(--duncit-card-shadow)',
        bgcolor: 'background.paper',
        '&.Mui-expanded': { mb: 1.5 },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
        sx={{ minHeight: 64, px: 2 }}
        aria-controls={`${id}-content`}
        id={`${id}-header`}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "center",
            flex: 1,
            minWidth: 0
          }}>
          {icon && (
            <Box
              sx={{
                width: 36,
                height: 36,
                flexShrink: 0,
                borderRadius: '50%',
                bgcolor: 'action.hover',
                color: tint,
                display: 'grid',
                placeItems: 'center',
                '& svg': { fontSize: 20 },
              }}
            >
              {icon}
            </Box>
          )}
          <Typography
            variant="subtitle1"
            color={error ? 'error.main' : undefined}
            sx={{ fontSize: '1.05rem', fontWeight: 600 }}
          >
            {title}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>{children}</AccordionDetails>
    </Accordion>
  );
}
