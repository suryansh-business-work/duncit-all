import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

interface Props {
  title: string;
  description: string;
  label: string;
  helperText: string;
  invalidText: string;
  min: number;
  /** Optional upper bound, for settings the server itself caps (e.g. a percent). */
  max?: number;
  loading: boolean;
  /** Saved value from the server (null until the query resolves). */
  value: number | null;
  onSave: (next: number) => Promise<void>;
}

/** One numeric platform setting: title/description, whole-number input and its
 * own Save button — shared by the Pod Settings cards. */
export default function NumberSettingCard({
  title,
  description,
  label,
  helperText,
  invalidText,
  min,
  max,
  loading,
  value,
  onSave,
}: Readonly<Props>) {
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (value != null) setRaw(String(value));
  }, [value]);

  const num = Number(raw);
  // `Number('') === 0`, so a card with min 0 would read a cleared box as a legal
  // save of 0. Cards with min 1 already rejected it via `num < min` — the blank
  // guard just makes that explicit for every min.
  // The server silently clamps an out-of-range percent, so the box must refuse
  // it here rather than save a number the admin never sees applied.
  const overMax = max !== undefined && num > max;
  const invalid = raw.trim() === '' || !Number.isInteger(num) || num < min || overMax;
  const dirty = value != null && num !== value;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onSave(num);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: 'flex-start', sm: 'center' },
            mb: 2
          }}>
          <Box>
            <Typography variant="subtitle1">{title}</Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {description}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={submit}
            disabled={busy || !dirty || loading || invalid}
          >
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </Stack>
        <TextField
          label={label}
          type="number"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          fullWidth
          helperText={helperText}
          slotProps={{
            htmlInput: { min, max }
          }}
        />
        {invalid && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {invalidText}
          </Alert>
        )}
        {err && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {err}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
