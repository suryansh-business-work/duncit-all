import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import { ADJUST_HEALTH, type AdminHealthScore } from './queries';

interface Props {
  open: boolean;
  subjectType: 'USER' | 'VENUE';
  subjectId: string;
  subjectLabel: string;
  currentScore: number;
  onClose: () => void;
  onSaved: (next: AdminHealthScore) => void;
}

export default function AdjustHealthDialog({
  open,
  subjectType,
  subjectId,
  subjectLabel,
  currentScore,
  onClose,
  onSaved,
}: Readonly<Props>) {
  const [direction, setDirection] = useState<'plus' | 'minus'>('plus');
  const [magnitude, setMagnitude] = useState<number>(5);
  const [remark, setRemark] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [save, { loading }] = useMutation(ADJUST_HEALTH);

  useEffect(() => {
    if (open) {
      setDirection('plus');
      setMagnitude(5);
      setRemark('');
      setError(null);
    }
  }, [open]);

  const delta = direction === 'plus' ? Math.abs(magnitude) : -Math.abs(magnitude);
  const projected = Math.max(0, Math.min(100, currentScore + delta));

  const submit = async () => {
    setError(null);
    if (!magnitude || magnitude < 1) {
      setError('Enter an adjustment between 1 and 100.');
      return;
    }
    if (remark.trim().length < 3) {
      setError('A remark of at least 3 characters is required.');
      return;
    }
    try {
      const { data } = await save({
        variables: {
          input: { subject_type: subjectType, subject_id: subjectId, delta, remark: remark.trim() },
        },
      });
      if (data?.adjustHealth) onSaved(data.adjustHealth);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Could not save adjustment.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 900 }}>
        Adjust {subjectType === 'USER' ? 'user' : 'venue'} health
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {subjectLabel} · current {currentScore}/100
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <ToggleButtonGroup
            value={direction}
            exclusive
            color={direction === 'plus' ? 'success' : 'error'}
            onChange={(_e, v) => v && setDirection(v)}
            fullWidth
          >
            <ToggleButton value="minus">
              <RemoveIcon fontSize="small" /> Decrease
            </ToggleButton>
            <ToggleButton value="plus">
              <AddIcon fontSize="small" /> Increase
            </ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label="Magnitude"
            type="number"
            inputProps={{ min: 1, max: 100, step: 1 }}
            size="small"
            value={magnitude}
            onChange={(e) => setMagnitude(Number(e.target.value) || 0)}
            helperText={`Applied as ${delta > 0 ? `+${delta}` : delta}. Projected score: ${projected}/100.`}
          />

          <TextField
            label="Remark (visible to the user)"
            multiline
            minRows={3}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            inputProps={{ maxLength: 500 }}
            helperText={`${remark.length}/500 · The user sees this when they tap the meter.`}
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={loading}>
          {loading ? 'Saving…' : 'Save adjustment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
