import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

interface Props {
  active: any | null;
  notes: string;
  setNotes: (v: string) => void;
  tagsText: string;
  setTagsText: (v: string) => void;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSaveDeductions: (sharePct: number, commissionPct: number) => void;
  savingDeductions: boolean;
}

export default function VenueReviewDialog({
  active,
  notes,
  setNotes,
  tagsText,
  setTagsText,
  onClose,
  onApprove,
  onReject,
  onSaveDeductions,
  savingDeductions,
}: Readonly<Props>) {
  const [share, setShare] = useState('0');
  const [commission, setCommission] = useState('0');
  useEffect(() => {
    setShare(String(active?.venue_share_pct ?? 0));
    setCommission(String(active?.venue_commission_pct ?? 0));
  }, [active]);

  const valid = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 100;
  };
  const saveDeductions = () => {
    if (valid(share) && valid(commission)) onSaveDeductions(Number(share), Number(commission));
  };
  return (
    <Dialog open={!!active} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Review · {active?.venue_name}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <Typography variant="body2">
            Type: {active?.venue_type} · Capacity: {active?.capacity}
          </Typography>
          <Typography variant="body2">
            {[active?.locality, active?.city, active?.state, active?.country].filter(Boolean).join(', ') || '—'} · PIN {active?.postal_code || '—'}
          </Typography>
          <Typography variant="body2">
            GSTIN: {active?.gstin || '—'} · PAN: {active?.pan || '—'}
          </Typography>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Documents
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {(active?.documents ?? []).map((d: any, i: number) => (
                <a key={i} href={d.url} target="_blank" rel="noreferrer">
                  {d.type}
                </a>
              ))}
            </Stack>
          </Box>
          <TextField
            label="Reviewer notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          <TextField
            label="Tags"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            helperText="Comma separated tags for this approved venue."
            fullWidth
          />
          <Box>
            <Typography variant="caption" color="text.secondary">
              Venue deductions: the venue's share, and the commission Duncit takes from the venue payout (after GST).
              Leave at 0 to use the global Default Deductions.
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mt: 0.5 }}>
              <TextField
                label="Venue share"
                type="number"
                value={share}
                onChange={(e) => setShare(e.target.value)}
                inputProps={{ min: 0, max: 100, step: 1, 'aria-label': 'Venue share percentage' }}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                sx={{ maxWidth: 150 }}
              />
              <TextField
                label="Commission from venue"
                type="number"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                inputProps={{ min: 0, max: 100, step: 1, 'aria-label': 'Venue commission percentage' }}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                sx={{ maxWidth: 170 }}
              />
              <Button onClick={saveDeductions} disabled={savingDeductions} sx={{ mt: 0.5 }}>
                Save
              </Button>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button color="error" onClick={onReject} disabled={!notes.trim()}>
          Reject
        </Button>
        <Button variant="contained" color="success" onClick={onApprove}>
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
}
