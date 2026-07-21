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
  const invalid = !Number.isInteger(num) || num < min;
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
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="subtitle1">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
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
          inputProps={{ min }}
          helperText={helperText}
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
