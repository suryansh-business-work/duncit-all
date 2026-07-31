import { useQuery } from '@apollo/client';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { EM_DASH } from '@duncit/table';
import { InfoRow } from '@duncit/ui';
import CopyableUrl from './CopyableUrl';
import { SHORT_LINK_QR, type ShortLinkRow } from './queries';

interface Props {
  link: ShortLinkRow | null;
  busy: boolean;
  formatDateTime: (value: Date | string) => string;
  onClose: () => void;
  onToggleActive: (link: ShortLinkRow) => void;
}

const GRID = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
} as const;

export default function ShortLinkDetailsDialog({
  link,
  busy,
  formatDateTime,
  onClose,
  onToggleActive,
}: Readonly<Props>) {
  const { data, loading } = useQuery<{ shortLinkQr: string }>(SHORT_LINK_QR, {
    variables: { id: link?.id },
    skip: !link,
  });

  if (!link) return null;

  const when = (value?: string | null) => (value ? formatDateTime(value) : EM_DASH);

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={busy ? undefined : onClose}>
      <DialogTitle sx={{ pb: 0.5 }}>
        {/* DialogTitle is already an h2 — a nested h6 is invalid HTML. */}
        <Typography variant="h6" component="div" fontWeight={700}>
          {link.label}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <CopyableUrl url={link.short_url} label="Share this" />

          <Stack direction="row" spacing={2} alignItems="center">
            {loading && <Skeleton variant="rectangular" width={140} height={140} />}
            {data?.shortLinkQr && (
              <Box
                component="img"
                src={data.shortLinkQr}
                alt={`QR code for ${link.label}`}
                sx={{ width: 140, height: 140, borderRadius: 1, border: 1, borderColor: 'divider' }}
              />
            )}
            <Typography variant="body2" color="text.secondary">
              Scanning this opens the same short link, so a poster and a post are counted the same
              way.
            </Typography>
          </Stack>

          <Divider />

          <Box sx={GRID}>
            <InfoRow label="Clicks" value={String(link.click_count)} />
            <InfoRow label="First click" value={when(link.first_clicked_at)} />
            <InfoRow label="Last click" value={when(link.last_clicked_at)} />
            <InfoRow label="utm_source" value={link.utm_source} />
            <InfoRow label="utm_medium" value={link.utm_medium} />
            <InfoRow label="utm_campaign" value={link.utm_campaign ?? EM_DASH} />
          </Box>

          <CopyableUrl url={link.tagged_url} label="Where it lands" />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
        <Button
          color={link.is_active ? 'warning' : 'primary'}
          variant="outlined"
          disabled={busy}
          onClick={() => onToggleActive(link)}
        >
          {link.is_active ? 'Retire link' : 'Reactivate link'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
