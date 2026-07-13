import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import DayOfWeekPicker from '../DayOfWeekPicker';
import { BULK_DELETE_VENUE_SLOTS, BULK_UPDATE_VENUE_SLOTS } from '../recurring.queries';

const toInt = (v: string) => Math.max(0, Math.round(Number(v) || 0));

interface Props {
  venueId: string;
  onDone: () => Promise<void> | void;
}

export default function BulkActionsAccordion({ venueId, onDone }: Readonly<Props>) {
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [price, setPrice] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | { text: string; run: () => Promise<void> }>(null);
  const [bulkDelete, { error: deleteError }] = useMutation(BULK_DELETE_VENUE_SLOTS);
  const [bulkUpdate, { error: updateError }] = useMutation(BULK_UPDATE_VENUE_SLOTS);

  const filter = () => ({
    venue_id: venueId,
    ...(from ? { from: from.toISOString() } : {}),
    ...(to ? { to: to.toISOString() } : {}),
    ...(weekdays.length ? { weekdays } : {}),
  });

  const runDelete = async () => {
    const { data } = await bulkDelete({ variables: { input: filter() } });
    setResult(`Deleted ${data.bulkDeleteVenueSlots.affected} slot(s).`);
    await onDone();
  };
  const runUpdate = async (extra: Record<string, unknown>, label: string) => {
    const { data } = await bulkUpdate({ variables: { input: { ...filter(), ...extra } } });
    const r = data.bulkUpdateVenueSlots;
    const skippedText = r.skipped ? `, ${r.skipped} skipped` : '';
    setResult(`${label}: ${r.affected} updated${skippedText}.`);
    await onDone();
  };

  return (
    <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'error.light', borderRadius: 2, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <DeleteForeverIcon fontSize="small" color="error" />
          <div>
            <Typography fontWeight={800} color="error.main">
              Bulk actions
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Delete or update many upcoming slots at once
            </Typography>
          </div>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <Typography variant="caption" color="text.secondary">
            Filter (all optional — empty means every upcoming non-booked slot). Booked slots are never affected.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <DatePicker label="From" value={from} onChange={setFrom} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
            <DatePicker label="To" value={to} onChange={setTo} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
          </Stack>
          <DayOfWeekPicker value={weekdays} onChange={setWeekdays} />
          {result && <Alert severity="info" onClose={() => setResult(null)}>{result}</Alert>}
          {(deleteError || updateError) && (
            <Alert severity="error">{(deleteError ?? updateError)?.message}</Alert>
          )}
          <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1} alignItems="center">
            <Button color="error" variant="outlined" onClick={() => setConfirm({ text: 'Delete all matching upcoming slots? This cannot be undone.', run: runDelete })}>
              Delete matching
            </Button>
            <Button color="error" variant="text" onClick={() => setConfirm({ text: 'Disable (block) all matching slots?', run: () => runUpdate({ block: true }, 'Disabled') })}>
              Disable
            </Button>
            <Button variant="text" onClick={() => setConfirm({ text: 'Enable (unblock) all matching slots?', run: () => runUpdate({ block: false }, 'Enabled') })}>
              Enable
            </Button>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField size="small" type="number" label="New price (₹)" value={price} onChange={(e) => setPrice(e.target.value)} sx={{ maxWidth: 160 }} inputProps={{ min: 0 }} />
            <Button
              variant="outlined"
              disabled={price === ''}
              onClick={() =>
                setConfirm({
                  text: `Re-price all matching upcoming slots to ₹${toInt(price)}? Existing prices are overwritten.`,
                  run: () => runUpdate({ set_price: toInt(price) }, 'Re-priced'),
                })
              }
            >
              Set price
            </Button>
          </Stack>
        </Stack>
      </AccordionDetails>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <DialogTitle>Are you sure?</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirm?.text}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              const action = confirm;
              setConfirm(null);
              await action?.run();
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Accordion>
  );
}
