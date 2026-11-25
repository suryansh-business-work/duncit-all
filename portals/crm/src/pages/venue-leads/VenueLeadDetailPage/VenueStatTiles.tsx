import { Stack } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import GroupsIcon from '@mui/icons-material/Groups';
import HandymanIcon from '@mui/icons-material/Handyman';
import type { VenueLead } from '../../../api/crm.types';
import LeadStatTile from '../../../components/LeadStatTile';
import { crmServicesHint } from '@duncit/utils';
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
        hint={lead.space_type || t('crm.leadDetail.spaceNotSet')}
        icon={<GroupsIcon fontSize="small" />}
        accent="primary"
      />
      <LeadStatTile
        label={t('crm.common.services')}
        value={lead.services_offered.length}
        hint={crmServicesHint(lead.services_offered) || t('crm.leadDetail.noneTagged')}
        icon={<HandymanIcon fontSize="small" />}
        accent="secondary"
      />
      <LeadStatTile
        label={t('crm.venueLeads.expectedCharges')}
        value={lead.expected_charges ? t('crm.leadDetail.amount', { vars: { amount: lead.expected_charges.toLocaleString() } }) : '—'}
        hint={lead.security_deposit ? t('crm.leadDetail.deposit', { vars: { amount: lead.security_deposit.toLocaleString() } }) : t('crm.leadDetail.noDeposit')}
        icon={<CurrencyRupeeIcon fontSize="small" />}
        accent="success"
      />
      <LeadStatTile
        label={t('crm.common.nextFollowUp')}
        value={followUpLabel}
        hint={lead.assigned_to ? t('crm.prospectLeads.assignedTo', { vars: { name: lead.assigned_to } }) : t('crm.prospectLeads.unassigned')}
        icon={<EventAvailableIcon fontSize="small" />}
        accent="warning"
      />
    </Stack>
  );
}
