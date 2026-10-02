import { Box, Card, Stack, Typography } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import type { NavigateFunction } from 'react-router';
import type { VenueLead } from '../../../api/crm.types';
import { PriorityChip, StatusChip } from '../../../components/StatusChips';
import { LeadDetailCard } from '../../../components/LeadDetailCard';
import type { TranslateFn } from './helpers';

interface Props {
  lead: VenueLead;
  t: TranslateFn;
  navigate: NavigateFunction;
}

export default function VenueLinkedHostsTab({ lead, t, navigate }: Readonly<Props>) {
  return (
    <LeadDetailCard
      title={t('crm.venueLeads.linkedHosts')}
      subtitle={t('crm.venueLeads.hostLeadsAssociatedWithThisVenue')}
      icon={<LinkIcon color="primary" />}
    >
      {lead.linked_hosts.length === 0 ? (
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          No hosts linked yet. Open Edit → "Linked Hosts" to associate host leads.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 1.25,
          }}
        >
          {lead.linked_hosts.map((h) => (
            <Card
              key={h.id}
              variant="outlined"
              sx={{
                p: 1.5,
                cursor: 'pointer',
                transition: 'border-color 120ms',
                '&:hover': { borderColor: 'primary.main' },
              }}
              onClick={() => navigate(`/host-leads/${h.id}/view`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                // A role=button answers Space as well as Enter (2.1.1).
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/host-leads/${h.id}/view`);
                }
              }}
              data-testid="venue-lead-linked-host"
            >
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{
                  alignItems: "center",
                  flexWrap: "wrap",
                  mb: 0.5
                }}>
                <Typography component="p" variant="subtitle2" sx={{
                  fontWeight: 700
                }}>
                  {h.host_name}
                </Typography>
                <StatusChip value={h.lead_status} />
                <PriorityChip value={h.priority} />
              </Stack>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {[h.host_type, h.city].filter(Boolean).join(' · ') || '—'}
              </Typography>
            </Card>
          ))}
        </Box>
      )}
    </LeadDetailCard>
  );
}
