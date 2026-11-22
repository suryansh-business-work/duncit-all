import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import type { useTranslation } from '@duncit/shell';
import type { LeadTab } from '../LeadTabs';
import type { LeadReminderEntity } from '../../api/reminders.gql';
import RemindersTab from './index';

type Translate = ReturnType<typeof useTranslation>['t'];

/** The Reminders tab for a lead page — the same list the venue and host pages show. */
export function remindersTab(entity: LeadReminderEntity, leadId: string, t: Translate): LeadTab {
  return {
    value: 'reminders',
    label: t('shell.nav.reminders'),
    icon: <EventAvailableIcon fontSize="small" />,
    render: () => <RemindersTab entity={entity} leadId={leadId} />,
  };
}
