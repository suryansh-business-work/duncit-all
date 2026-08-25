import { useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Switch,
  Typography,
} from '@mui/material';

interface Props {
  title: string;
  description: string;
  /** What the switch means when it is on / off, spelled out under it. */
  onHint: string;
  offHint: string;
  loading: boolean;
  /** Saved value from the server (null until the query resolves). */
  value: boolean | null;
  onSave: (next: boolean) => Promise<void>;
}

/**
 * One boolean platform setting.
 *
 * No Save button, unlike its numeric sibling: a switch that needs confirming
 * reads as already-applied the moment it moves, and the two states are one
 * click apart to undo. The switch is disabled while the write is in flight so
 * a double-tap cannot race itself, and it snaps back if the write fails.
 */
export default function ToggleSettingCard({
  title,
  description,
  onHint,
  offHint,
  loading,
  value,
  onSave,
}: Readonly<Props>) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const checked = value ?? false;

  const flip = async (next: boolean) => {
    setBusy(true);
    setErr(null);
    try {
      await onSave(next);
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
          direction="row"
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: "flex-start"
          }}>
          <Box>
            <Typography variant="subtitle1">{title}</Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {description}
            </Typography>
          </Box>
          {loading && value === null ? (
            <CircularProgress size={20} />
          ) : (
            <Switch
              checked={checked}
              disabled={busy || loading}
              onChange={(e) => {
                flip(e.target.checked).catch(() => undefined);
              }}
              slotProps={{
                input: { 'aria-label': title }
              }}
            />
          )}
        </Stack>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: 'block',
            mt: 1
          }}>
          {checked ? onHint : offHint}
        </Typography>
        {err && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {err}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
