import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import { InfoRow } from '@duncit/ui';
import CopyableUrl from '../CopyableUrl';
import type { ShortLinkRow, ShortLinkStats } from '../queries';

interface Props {
  link: ShortLinkRow;
  stats: ShortLinkStats;
  qr?: string | null;
  formatDateTime: (value: Date | string) => string;
}

interface StatProps {
  label: string;
  value: string;
}

function Stat({ label, value }: Readonly<StatProps>) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" component="div">
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={800} component="div">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

/** The headline numbers, the link itself and its tagging. */
export default function ShortLinkSummary({ link, stats, qr, formatDateTime }: Readonly<Props>) {
  const when = (value?: string | null) => (value ? formatDateTime(value) : EM_DASH);

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        }}
      >
        <Stat label="Total clicks" value={stats.total_clicks.toLocaleString()} />
        <Stat label="Unique visitors" value={stats.unique_visitors.toLocaleString()} />
        <Stat label="Countries" value={stats.countries_reached.toLocaleString()} />
        <Stat label="Last click" value={when(link.last_clicked_at)} />
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
              <CopyableUrl url={link.short_url} label="Share this" />
              <CopyableUrl url={link.tagged_url} label="Where it lands" />
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
                }}
              >
                <InfoRow label="utm_source" value={link.utm_source} />
                <InfoRow label="utm_medium" value={link.utm_medium} />
                <InfoRow label="utm_campaign" value={link.utm_campaign ?? EM_DASH} />
                <InfoRow label="Status" value={link.is_active ? 'Active' : 'Retired'} />
                <InfoRow label="First click" value={when(link.first_clicked_at)} />
                <InfoRow label="Created" value={when(link.created_at)} />
              </Box>
            </Stack>
            {qr && (
              // flexShrink 0 so the code stays scannable rather than being
              // squeezed by a long destination beside it.
              <Stack alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                <Box
                  component="img"
                  src={qr}
                  alt={`QR code for ${link.label}`}
                  sx={{ width: 148, height: 148, borderRadius: 1, border: 1, borderColor: 'divider' }}
                />
                <Chip size="small" label={`/${link.code}`} sx={{ fontFamily: 'monospace' }} />
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
