import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { DuncitButton } from '@duncit/buttons';
import {
  joinPhone,
  namedCompanionEntries,
  type NamedCompanionInput,
  type PodAttendanceLabels,
  type PodAttendanceRow,
} from '@duncit/utils';
import ForceCompanionFields from './ForceCompanionFields';
import {
  buildForceMarkSchema,
  forceMarkInitialValues,
  type ForceMarkValues,
} from './force.form';

interface Props {
  row: PodAttendanceRow | null;
  labels: PodAttendanceLabels;
  busy: boolean;
  onClose: () => void;
  onConfirm: (row: PodAttendanceRow, companions: readonly NamedCompanionInput[]) => void;
}

/**
 * The Club Admin's by-name mark, behind a warning.
 *
 * This writes attendance with no scan and no code behind it, and attendance is
 * what the host is paid on — so the one thing between this button and a wrong
 * payout is the person pressing it having checked. The dialog therefore
 * restates WHO is about to be marked (name and number) rather than only asking
 * "are you sure": a confirm with no subject is a confirm people click through.
 *
 * It also collects the rest of a multi-seat booking. That used to be the host's
 * job alone, which left this dialog unreachable on exactly the bookings an
 * admin gets called about: the row's button was disabled until the group was
 * named at a door nobody was standing at any more. The names are optional here
 * — the admin records what the call told them, and the seat is marked either
 * way.
 */
export default function ForceMarkDialog({
  row,
  labels,
  busy,
  onClose,
  onConfirm,
}: Readonly<Props>) {
  const { control, handleSubmit, reset } = useForm<ForceMarkValues, any, ForceMarkValues>({
    resolver: zodResolver(buildForceMarkSchema(labels)) as unknown as Resolver<
      ForceMarkValues,
      any,
      ForceMarkValues
    >,
    defaultValues: forceMarkInitialValues(row?.companions_required ?? 0),
  });

  // A different booking owes a different number of names — never carry the
  // previous attendee's rows onto somebody else's mark.
  useEffect(() => {
    reset(forceMarkInitialValues(row?.companions_required ?? 0));
  }, [row, reset]);

  const phone = row ? joinPhone(row.phone_extension, row.phone_number) : '';
  const submit = handleSubmit((values) => {
    if (row) onConfirm(row, namedCompanionEntries(values.companions));
  });

  return (
    <Dialog open={!!row} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>{labels.forceTitle}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Alert severity="warning" icon={<WarningAmberIcon />}>
            {labels.forceWarning}
          </Alert>
          <Stack spacing={0.25}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {row?.name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {[phone, row?.email, row?.ticket_code].filter(Boolean).join(' · ')}
            </Typography>
            {!!row && row.seats > 1 && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {labels.seats(row.seats)}
              </Typography>
            )}
          </Stack>
          <ForceCompanionFields control={control} labels={labels} seats={row?.seats ?? 1} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy}>
          {labels.forceCancel}
        </DuncitButton>
        <DuncitButton
          variant="contained"
          color="warning"
          disabled={busy || !row}
          onClick={() => {
            submit().catch(() => undefined);
          }}
          sx={{ borderRadius: 999, fontWeight: 800 }}
        >
          {busy ? labels.marking : labels.forceConfirm}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
