import { useEffect, useState } from 'react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

/** Same rule the server enforces on a companion's number (6-15 digits). */
const PHONE = /^\d{6,15}$/;

export interface CompanionValue {
  name: string;
  phone_number: string;
}

interface Props {
  /** Ticket code being checked in, or null when the dialog is closed. */
  ticketCode: string | null;
  /** How many people still need a name and a phone number. */
  required: number;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (companions: CompanionValue[]) => void;
}

const blank = (count: number): CompanionValue[] =>
  Array.from({ length: count }, () => ({ name: '', phone_number: '' }));

const rowValid = (row: CompanionValue) =>
  row.name.trim().length >= 2 && PHONE.test(row.phone_number.trim());

/**
 * The rest of the group, collected before an admin can check a multi-seat
 * ticket in.
 *
 * The server has always refused a group check-in without these details, but
 * this console only surfaced the refusal as a toast — leaving the operator with
 * a message telling them to add people and nowhere to add them. The host's
 * scanner has had this form since the feature shipped; this is the same
 * contract for the admin path.
 */
export default function CompanionsDialog({
  ticketCode,
  required,
  busy,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<CompanionValue[]>(() => blank(required));
  const [touched, setTouched] = useState(false);

  // A new ticket (or a changed count) starts from empty rows rather than the
  // last operator's typing.
  useEffect(() => {
    setRows(blank(required));
    setTouched(false);
  }, [ticketCode, required]);

  const set = (index: number, patch: Partial<CompanionValue>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const complete = rows.length > 0 && rows.every(rowValid);

  const submit = () => {
    setTouched(true);
    if (complete) onSubmit(rows.map((row) => ({ ...row, name: row.name.trim() })));
  };

  return (
    <Dialog open={!!ticketCode} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{t('admin.companions.title')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {`Ticket ${ticketCode ?? ''} admits more than one person. Add the other ${required} to mark attendance.`}
          </Typography>
          {rows.map((row, index) => (
            // The index IS the identity: these are positional slots created from
            // a count, never reordered, added to or removed.
            <Stack key={`companion-${index}`} spacing={1}>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 700
                }}>
                {`Person ${index + 1}`}
              </Typography>
              <TextField
                size="small"
                required
                label={t('shell.common.name')}
                value={row.name}
                onChange={(e) => set(index, { name: e.target.value })}
                error={touched && row.name.trim().length < 2}
                helperText={touched && row.name.trim().length < 2 ? 'Enter the name' : 'Required'}
              />
              <TextField
                size="small"
                required
                label={t('shell.common.phone')}
                inputMode="numeric"
                value={row.phone_number}
                onChange={(e) => set(index, { phone_number: e.target.value })}
                error={touched && !PHONE.test(row.phone_number.trim())}
                helperText={
                  touched && !PHONE.test(row.phone_number.trim())
                    ? 'Enter a phone number — digits only, 6 to 15'
                    : 'Required'
                }
              />
            </Stack>
          ))}
          {touched && !complete && (
            <Alert severity="warning">{t('admin.companions.incomplete')}</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton variant="contained" onClick={submit} disabled={busy}>
          {busy ? 'Marking…' : 'Mark attendance'}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
