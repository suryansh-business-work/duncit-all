import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
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

const STATUS_COLOR: Record<string, 'default' | 'info' | 'success' | 'error' | 'warning'> = {
  DRAFT: 'warning',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
};

function DetailRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        {label}
      </Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Box>
  );
}

export default function EcommBrandReviewDialog({
  active,
  notes,
  setNotes,
  tagsText,
  setTagsText,
  onClose,
  onApprove,
  onReject,
}: Readonly<Props>) {
  const documents = active?.documents ?? [];
  const address = [active?.address_line1, active?.city, active?.state, active?.postal_code, active?.country]
    .filter(Boolean)
    .join(', ');
  const business = [
    active?.registered_business_name && `Business: ${active.registered_business_name}`,
    active?.gstin && `GSTIN: ${active.gstin}`,
    active?.pan && `PAN: ${active.pan}`,
    active?.established_year && `Est. ${active.established_year}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const bank = [
    active?.account_holder_name,
    active?.account_number,
    active?.ifsc_code,
    active?.upi_id,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Dialog open={!!active} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ display: 'block', lineHeight: 1 }}>
          Review brand
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={900} sx={{ flex: 1, minWidth: 0 }} noWrap>
            {active?.brand_name || 'Brand'}
          </Typography>
          {active?.status && (
            <Chip size="small" color={STATUS_COLOR[active.status] ?? 'default'} label={active.status} sx={{ fontWeight: 800 }} />
          )}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.75}>
          {active?.cover_image_url && (
            <Box
              component="img"
              src={active.cover_image_url}
              alt={active.brand_name}
              sx={{ width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 1.5 }}
            />
          )}
          {active?.tagline && <Typography variant="body2" fontStyle="italic">{active.tagline}</Typography>}
          <DetailRow label="Description" value={active?.description ?? ''} />
          <DetailRow label="Categories" value={(active?.product_categories ?? []).join(', ')} />
          <DetailRow label="Owner" value={[active?.contact_person, active?.contact_email, active?.contact_phone].filter(Boolean).join(' · ')} />
          <DetailRow label="Business & legal" value={business} />
          <DetailRow label="Address" value={address} />
          {(active?.website_url || active?.instagram_url) && (
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {active?.website_url && <Link href={active.website_url} target="_blank" rel="noreferrer" variant="body2">Website</Link>}
              {active?.instagram_url && <Link href={active.instagram_url} target="_blank" rel="noreferrer" variant="body2">Instagram</Link>}
            </Stack>
          )}
          {bank && <DetailRow label="Payout" value={bank} />}
          {documents.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>Documents</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1} sx={{ mt: 0.5 }}>
                {documents.map((doc: any) => (
                  <Chip key={doc.url} size="small" component={Link} href={doc.url} target="_blank" rel="noreferrer" clickable label={doc.type} variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}

          <Divider />
          <TextField label="Reviewer notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth />
          <TextField
            label="Tags"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            helperText="Comma separated tags for this approved brand."
            fullWidth
          />
        </Stack>
      </DialogContent>
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
