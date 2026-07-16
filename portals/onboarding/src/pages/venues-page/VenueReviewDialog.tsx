import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { StatusChip, type StatusColorMap } from '@duncit/ui';

interface Props {
  active: any;
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

const STATUS_COLOR: StatusColorMap = {
  DRAFT: 'warning',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
};

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

  const documents = active?.documents ?? [];
  const capacityItems = active?.capacity_items ?? [];
  const locationLine =
    [active?.locality, active?.city, active?.state, active?.country].filter(Boolean).join(', ') || '—';
  const categoryPath = [
    active?.venue_category?.super_category_name,
    active?.venue_category?.category_name,
    active?.venue_category?.sub_category_name,
  ]
    .filter(Boolean)
    .join(' › ');

  return (
    <Dialog open={!!active} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ display: 'block', lineHeight: 1 }}>
          Review venue
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={900} sx={{ flex: 1, minWidth: 0 }} noWrap>
            {active?.venue_name || 'Venue'}
          </Typography>
          {active?.status && (
            <StatusChip status={active.status} colorMap={STATUS_COLOR} sx={{ fontWeight: 800 }} />
          )}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1} sx={{ mb: 1 }}>
              {active?.venue_type && <Chip size="small" variant="outlined" label={active.venue_type} />}
              {typeof active?.capacity === 'number' && (
                <Chip size="small" variant="outlined" label={`Capacity ${active.capacity}`} />
              )}
              <Chip size="small" variant="outlined" label={`GSTIN ${active?.gstin || '—'}`} />
              <Chip size="small" variant="outlined" label={`PAN ${active?.pan || '—'}`} />
            </Stack>
            {categoryPath && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Hosts in: <strong>{categoryPath}</strong>
              </Typography>
            )}
            {capacityItems.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1} sx={{ mb: 1 }}>
                {capacityItems.map((item: any) => (
                  <Chip key={item.label} size="small" label={`${item.label}: ${item.capacity}`} />
                ))}
              </Stack>
            )}
            <Typography variant="body2">
              {locationLine}
              {active?.postal_code ? ` · PIN ${active.postal_code}` : ''}
            </Typography>
          </Paper>

          {documents.length > 0 && (
            <Box>
              <Typography variant="overline" color="text.secondary" fontWeight={800}>
                Documents
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1} sx={{ mt: 0.5 }}>
                {documents.map((doc: any) => (
                  <Chip
                    key={doc.url}
                    size="small"
                    component={Link}
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    clickable
                    label={doc.type}
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}

          <TextField label="Reviewer notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={3} fullWidth />
          <TextField
            label="Tags"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            helperText="Comma separated tags for this approved venue."
            fullWidth
          />

          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={800}>
              Venue deductions
            </Typography>
            <Typography variant="caption" color="text.secondary">
              The venue&apos;s share, and the commission Duncit takes from the venue payout (after GST). Leave
              at 0 to use the global Default Deductions.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1.5 }}>
              <TextField
                label="Venue share"
                type="number"
                size="small"
                value={share}
                onChange={(e) => setShare(e.target.value)}
                error={!valid(share)}
                inputProps={{ min: 0, max: 100, step: 1, 'aria-label': 'Venue share percentage' }}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                fullWidth
              />
              <TextField
                label="Commission from venue"
                type="number"
                size="small"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                error={!valid(commission)}
                inputProps={{ min: 0, max: 100, step: 1, 'aria-label': 'Venue commission percentage' }}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                fullWidth
              />
            </Stack>
            <Button
              variant="outlined"
              size="small"
              onClick={saveDeductions}
              disabled={savingDeductions || !valid(share) || !valid(commission)}
              sx={{ mt: 1.5 }}
            >
              {savingDeductions ? 'Saving…' : 'Save deductions'}
            </Button>
          </Paper>
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Box sx={{ flex: 1 }} />
        <Button color="error" variant="outlined" onClick={onReject} disabled={!notes.trim()}>
          Reject
        </Button>
        <Button variant="contained" color="success" onClick={onApprove}>
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
}
