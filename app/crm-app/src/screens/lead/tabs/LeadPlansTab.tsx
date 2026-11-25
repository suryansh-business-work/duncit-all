import { crmJoinList } from '@duncit/utils';

import { CrmAppLeadPlansDocument } from '@/graphql/leadTabs';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { displayDate } from './parts/dates';
import { DetailCard } from './parts/DetailCard';
import { DetailRow } from './parts/DetailRow';
import { TabLoad } from './parts/TabLoad';
import type { LeadTabProps } from './parts/tabTypes';

/** The portal's Plans & Timeline tab (host leads): budget, revenue models, needs and the preferred date. */
export function LeadPlansTab({ id }: Readonly<LeadTabProps>) {
  const { t } = useTranslation();
  const query = useGqlQuery(
    CrmAppLeadPlansDocument,
    { id },
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const host = query.data?.hostLead;
  if (!host) return <TabLoad query={query} />;
  const yesNo = (value: boolean | null | undefined) =>
    value ? t('shell.common.yes') : t('shell.common.no');
  return (
    <DetailCard title={t('crm.hostLeads.plansAndTimeline')} icon="event" testID="lead-plans-tab">
      <DetailRow label={t('crm.hostLeads.budget')} value={host.budget_range} />
      <DetailRow
        label={t('crm.hostLeads.revenueModels')}
        value={crmJoinList(host.revenue_models)}
      />
      <DetailRow label={t('crm.hostLeads.needsVenue')} value={yesNo(host.need_venue)} />
      <DetailRow label={t('crm.hostLeads.needsVendor')} value={yesNo(host.need_vendor)} />
      <DetailRow
        label={t('crm.hostLeads.preferredDate')}
        value={displayDate(host.preferred_event_date)}
      />
      <DetailRow label={t('crm.hostLeads.preferredDay')} value={host.preferred_day} />
      <DetailRow label={t('crm.hostLeads.preferredSlot')} value={host.preferred_time_slot} />
    </DetailCard>
  );
}
