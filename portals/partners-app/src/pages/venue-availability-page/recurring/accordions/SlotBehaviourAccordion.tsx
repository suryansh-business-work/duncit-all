import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  FormControlLabel,
  FormControl,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import type { ConflictMode, RecurringForm } from '../useRecurringDialog';

interface Props {
  form: RecurringForm;
  patch: (p: Partial<RecurringForm>) => void;
}

export default function SlotBehaviourAccordion({ form, patch }: Readonly<Props>) {
  return (
    <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TuneIcon fontSize="small" color="action" />
          <div>
            <Typography fontWeight={800}>Slot behaviour</Typography>
            <Typography variant="caption" color="text.secondary">
              Holidays, weekly-off and how conflicts are handled
            </Typography>
          </div>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          <FormControlLabel
            control={<Switch checked={form.skipWeeklyOff} onChange={(e) => patch({ skipWeeklyOff: e.target.checked })} />}
            label="Skip the venue's weekly-off days"
          />
          <FormControlLabel
            control={<Switch checked={form.skipHolidays} onChange={(e) => patch({ skipHolidays: e.target.checked })} />}
            label="Skip the venue's holidays"
          />
          <FormControl>
            <FormLabel sx={{ fontWeight: 700, fontSize: 13 }}>If a slot already exists</FormLabel>
            <RadioGroup
              row
              value={form.conflictMode}
              onChange={(e) => patch({ conflictMode: e.target.value as ConflictMode })}
            >
              <FormControlLabel value="SKIP" control={<Radio size="small" />} label="Skip it" />
              <FormControlLabel value="REPLACE" control={<Radio size="small" />} label="Replace it" />
            </RadioGroup>
          </FormControl>
          {form.conflictMode === 'REPLACE' && (
            <Typography variant="caption" color="warning.main">
              Replace deletes existing non-booked slots in this window before creating. Booked slots are kept.
            </Typography>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
