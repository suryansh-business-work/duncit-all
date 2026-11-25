import { Stack } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import HandymanIcon from '@mui/icons-material/Handyman';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import type { HostLead } from '../../../api/crm.types';
import LeadStatTile from '../../../components/LeadStatTile';
import { crmServicesHint } from '@duncit/utils';
import type { TranslateFn } from './helpers';

interface Props {
  lead: HostLead;
  t: TranslateFn;
  followUpLabel: string;
}

export default function HostStatTiles({ lead, t, followUpLabel }: Readonly<Props>) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <LeadStatTile
        label={t('crm.hostLeads.audience')}
        value={lead.expected_audience_size || '—'}
        hint={lead.frequency || t('crm.leadDetail.frequencyNotSet')}
        icon={<GroupsIcon fontSize="small" />}
        accent="info"
      />
      <LeadStatTile
        label={t('crm.common.services')}
        value={lead.services_offered.length}
        hint={crmServicesHint(lead.services_offered) || t('crm.leadDetail.noneTagged')}
        icon={<HandymanIcon fontSize="small" />}
        accent="secondary"
      />
      <LeadStatTile
        label={t('crm.common.community')}
        value={lead.community_size ?? '—'}
        hint={
          lead.previous_events_hosted
            ? t('crm.leadDetail.pastEvents', { vars: { attendees: lead.past_attendees ?? '—' } })
            : t('crm.leadDetail.noPastEvents')
        }
        icon={<EventIcon fontSize="small" />}
        accent="primary"
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
