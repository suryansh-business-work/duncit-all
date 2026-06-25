import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

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

const STATUS_COLOR: Record<string, 'default' | 'info' | 'success' | 'error' | 'warning'> = {
  DRAFT: 'warning',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
};

function InfoRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="baseline">
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>{value}</Typography>
    </Stack>
  );
}

function DocButton({ href, label }: Readonly<{ href: string; label: string }>) {
  return (
    <Button
      size="small"
      variant="outlined"
      href={href}
      target="_blank"
      rel="noreferrer"
      startIcon={<OpenInNewIcon fontSize="small" />}
    >
      {label}
    </Button>
  );
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
  const hasDocs = !!(active?.passport_photo_url || active?.police_verification_url);
  return (
    <Dialog open={!!active} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ display: 'block', lineHeight: 1 }}>
          Review host
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={900} sx={{ flex: 1, minWidth: 0 }} noWrap>
            {active?.full_name || 'Host'}
          </Typography>
          {active?.status && (
            <Chip size="small" color={STATUS_COLOR[active.status] ?? 'default'} label={active.status} sx={{ fontWeight: 800 }} />
          )}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack spacing={0.75}>
            <InfoRow label="Aadhar" value={active?.aadhar_number || '—'} />
            <InfoRow label="PAN" value={active?.pan_number || '—'} />
            <InfoRow label="DOB" value={active?.dob?.slice(0, 10) || '—'} />
            <InfoRow label="Address" value={active?.full_address || '—'} />
          </Stack>

          {hasDocs && (
            <>
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary">Documents</Typography>
              </Divider>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {active?.passport_photo_url && <DocButton href={active.passport_photo_url} label="Passport photo" />}
                {active?.police_verification_url && <DocButton href={active.police_verification_url} label="Police verification" />}
              </Stack>
            </>
          )}

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
            helperText="Comma-separated tags applied when this host is approved."
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
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
