import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

interface Props {
  open: boolean;
  website: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: (limit: number) => void;
}

const MIN = 1;
const MAX = 200;

/** Asks how many pages to discover, then triggers the scrape. */
export default function ScrapeDialog({ open, website, loading, onClose, onConfirm }: Props) {
  const [value, setValue] = useState('20');
  const parsed = Number.parseInt(value, 10);
  const valid = Number.isFinite(parsed) && parsed >= MIN && parsed <= MAX;

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Scrape website pages</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
            Discovers pages from <strong>{website}</strong> (sitemap first, then homepage links) and saves them.
          </Typography>
          <TextField
            size="small"
            type="number"
            label="Max pages to discover"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputProps={{ min: MIN, max: MAX, inputMode: 'numeric' }}
            helperText={`Between ${MIN} and ${MAX}.`}
            error={!!value && !valid}
            autoFocus
            fullWidth
          />
          {!valid && !!value && <Alert severity="warning" sx={{ py: 0 }}>Enter a number from {MIN} to {MAX}.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={() => onConfirm(parsed)} disabled={!valid || loading}>
          {loading ? 'Scraping…' : 'Scrape pages'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
