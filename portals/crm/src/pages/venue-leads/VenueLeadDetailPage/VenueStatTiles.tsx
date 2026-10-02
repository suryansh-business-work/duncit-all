import { Stack } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import GroupsIcon from '@mui/icons-material/Groups';
import HandymanIcon from '@mui/icons-material/Handyman';
import type { VenueLead } from '../../../api/crm.types';
import LeadStatTile from '../../../components/LeadStatTile';
import { formatCapacity, type TranslateFn } from './helpers';

interface Props {
  lead: VenueLead;
  t: TranslateFn;
  followUpLabel: string;
}

export default function VenueStatTiles({ lead, t, followUpLabel }: Readonly<Props>) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <LeadStatTile
        label={t('crm.venueLeads.capacity')}
        value={formatCapacity(lead.capacity_min, lead.capacity_max)}
        hint={lead.space_type ? lead.space_type : 'Indoor / outdoor not set'}
        icon={<GroupsIcon fontSize="small" />}
        accent="primary"
      />
      <LeadStatTile
        label={t('crm.common.services')}
        value={lead.services_offered.length}
        hint={
          lead.services_offered.length
            ? lead.services_offered
                .slice(0, 2)
                .map((s) => (s.service === 'Other' ? s.custom_name || 'Other' : s.service))
                .join(', ')
            : 'None tagged'
        }
        icon={<HandymanIcon fontSize="small" />}
        accent="secondary"
      />
      <LeadStatTile
        label={t('crm.venueLeads.expectedCharges')}
        value={lead.expected_charges ? `₹${lead.expected_charges.toLocaleString()}` : '—'}
        hint={lead.security_deposit ? `Deposit ₹${lead.security_deposit.toLocaleString()}` : 'No deposit set'}
        icon={<CurrencyRupeeIcon fontSize="small" />}
        accent="success"
      />
      <LeadStatTile
        label={t('crm.common.nextFollowUp')}
        value={followUpLabel}
        hint={lead.assigned_to ? `Assigned to ${lead.assigned_to}` : 'Unassigned'}
        icon={<EventAvailableIcon fontSize="small" />}
        accent="warning"
      />
    </Stack>
  );
}
