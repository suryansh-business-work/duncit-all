import {
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

export default function HostReviewDialog({
  active,
  notes,
  setNotes,
  tagsText,
  setTagsText,
  onClose,
  onApprove,
  onReject,
}: Readonly<Props>) {
  return (
    <Dialog open={!!active} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Review · {active?.full_name}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <Typography variant="body2">
            Aadhar: {active?.aadhar_number || '—'} · PAN: {active?.pan_number || '—'}
          </Typography>
          <Typography variant="body2">DOB: {active?.dob?.slice(0, 10) || '—'}</Typography>
          <Typography variant="body2">Address: {active?.full_address || '—'}</Typography>
          <Stack direction="row" spacing={2}>
            {active?.passport_photo_url && (
              <a href={active.passport_photo_url} target="_blank" rel="noreferrer">
                Passport photo
              </a>
            )}
            {active?.police_verification_url && (
              <a href={active.police_verification_url} target="_blank" rel="noreferrer">
                Police verification
              </a>
            )}
          </Stack>
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
            helperText="Comma separated tags for this approved host."
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
