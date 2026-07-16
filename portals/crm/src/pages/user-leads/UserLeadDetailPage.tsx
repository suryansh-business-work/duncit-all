import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { BackHeader, InfoRow, QueryGuard } from '@duncit/ui';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { WA_USER_LEAD } from '../tools/whatsapp/whatsappQueries';

function Field({ label, value }: Readonly<{ label: string; value?: string | null }>) {
  return <InfoRow label={label} value={value || '—'} />;
}

/** User Lead detail — mirrors the Venue/Host detail layout. Shows the imported
 * number, source WhatsApp account, and the communities/groups it came from. */
export default function UserLeadDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(WA_USER_LEAD, { variables: { id } });
  const lead = data?.waUserLead;

  const body = (
    <QueryGuard
      loading={loading && !lead}
      error={error}
      errorText={error?.message}
      notFound={!lead}
      notFoundText="Lead not found."
      notFoundSeverity="warning"
    >
      {() => (
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <WhatsAppIcon sx={{ color: '#25D366' }} />
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  {lead.name || `+${lead.phone}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  +{lead.phone}
                </Typography>
              </Box>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={1.5}>
              <Field label="Source WhatsApp account" value={lead.source_account ? `+${lead.source_account}` : null} />
              <Field
                label="Imported"
                value={lead.imported_at ? new Date(lead.imported_at).toLocaleString() : null}
              />
              <Field label="Contact JID" value={lead.contact_jid} />
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography fontWeight={800} sx={{ mb: 1 }}>
              Communities ({lead.source_communities?.length ?? 0})
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {(lead.source_communities ?? []).map((c: any) => (
                <Chip key={c.jid} label={c.name || c.jid} color="primary" variant="outlined" />
              ))}
              {(lead.source_communities ?? []).length === 0 && (
                <Typography variant="body2" color="text.secondary">None</Typography>
              )}
            </Stack>
            <Typography fontWeight={800} sx={{ mt: 2, mb: 1 }}>
              Groups ({lead.source_groups?.length ?? 0})
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {(lead.source_groups ?? []).map((g: any) => (
                <Chip key={g.jid} label={g.name || g.jid} />
              ))}
              {(lead.source_groups ?? []).length === 0 && (
                <Typography variant="body2" color="text.secondary">None</Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
      )}
    </QueryGuard>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 760, mx: 'auto' }}>
      <BackHeader
        onBack={() => navigate(-1)}
        backAriaLabel="Go back"
        backSize="medium"
        title="WhatsApp Lead"
        titleVariant="h6"
        titleWeight={800}
        sx={{ mb: 2 }}
      />

      {body}
    </Box>
  );
}
