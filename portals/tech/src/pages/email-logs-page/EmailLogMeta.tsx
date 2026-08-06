import { Box, Chip, Divider, Link, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Link as RouterLink } from 'react-router-dom';
import { STATUS_COLOR, type EmailLogDetail } from './queries';

interface Props {
  row: EmailLogDetail;
}

/** One label/value pair. Absent values read as an em dash, not as nothing. */
function Field({ label, value }: Readonly<{ label: string; value?: string | null }>) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '');

export default function EmailLogMeta({ row }: Readonly<Props>) {
  const recipients = [row.to, ...(row.cc ?? []), ...(row.bcc ?? [])].filter(Boolean).join(', ');

  return (
    <Stack spacing={1.5} sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip size="small" label={row.status} color={STATUS_COLOR[row.status] ?? 'default'} />
        <Chip size="small" variant="outlined" label={row.category} />
        <Chip size="small" variant="outlined" label={row.source_detail || row.source} />
        <Typography variant="caption" color="text.secondary">
          {when(row.created_at)} · {row.duration_ms} ms
        </Typography>
      </Stack>

      {/* The reason is the whole point of a row that is not SENT. */}
      {row.reason && (
        <Typography variant="body2" color="error.main" sx={{ lineHeight: 1.4 }}>
          {row.reason}
        </Typography>
      )}

      <Divider />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1.5,
        }}
      >
        <Field label="To" value={row.to} />
        <Field label="Subject" value={row.subject} />
        {row.cc?.length > 0 && <Field label="CC" value={row.cc.join(', ')} />}
        {row.bcc?.length > 0 && <Field label="BCC" value={row.bcc.join(', ')} />}
        <Field label="Provider" value={row.provider} />
        <Field label="Message ID" value={row.message_id} />
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Template
          </Typography>
          {row.template ? (
            // Straight to the template this email came from — the next thing
            // anyone wants after reading a body that looks wrong.
            <Link
              component={RouterLink}
              to={`/emails/templates?slug=${encodeURIComponent(row.template)}`}
              variant="body2"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              {row.template}
              <OpenInNewIcon sx={{ fontSize: 14 }} />
            </Link>
          ) : (
            <Typography variant="body2">— raw HTML send</Typography>
          )}
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Header / footer
          </Typography>
          {row.fragment_key ? (
            <Link
              component={RouterLink}
              to={`/emails/fragments?key=${encodeURIComponent(row.fragment_key)}`}
              variant="body2"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              {row.fragment_key}
              <OpenInNewIcon sx={{ fontSize: 14 }} />
            </Link>
          ) : (
            <Typography variant="body2">—</Typography>
          )}
        </Box>
      </Box>

      {recipients.length > 120 && (
        <Typography variant="caption" color="text.secondary">
          {recipients.split(',').length} recipients on this message.
        </Typography>
      )}
    </Stack>
  );
}
