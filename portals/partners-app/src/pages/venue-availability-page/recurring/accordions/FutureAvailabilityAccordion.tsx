import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';

export default function FutureAvailabilityAccordion({ maxAdvanceDays }: Readonly<{ maxAdvanceDays: number }>) {
  return (
    <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <EventRepeatIcon fontSize="small" color="action" />
          <div>
            <Typography fontWeight={800}>Future availability</Typography>
            <Typography variant="caption" color="text.secondary">
              How far ahead slots are created
            </Typography>
          </div>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          <Typography variant="body2">
            Slots can be published up to <strong>{maxAdvanceDays} days</strong> ahead (change this under
            Venue rules).
          </Typography>
          <Alert severity="info">
            Automatic rolling extension (monthly / quarterly) is coming soon. For now, re-open this dialog to
            publish the next window.
          </Alert>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
