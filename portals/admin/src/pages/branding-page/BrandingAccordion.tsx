import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface Props {
  title: string;
  subtitle: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

/** One collapsible section of the Branding page: a bold title over its hint. */
export default function BrandingAccordion({ title, subtitle, defaultExpanded, children }: Readonly<Props>) {
  return (
    <Accordion defaultExpanded={defaultExpanded} disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} data-testid="branding-section">
        <Box>
          <Typography variant="subtitle1" sx={{
            fontWeight: 700
          }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {subtitle}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}
