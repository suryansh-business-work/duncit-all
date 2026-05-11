import {
  Box,
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
  active: any | null;
  notes: string;
  setNotes: (v: string) => void;
  tagsText: string;
  setTagsText: (v: string) => void;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
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
}: Props) {
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
