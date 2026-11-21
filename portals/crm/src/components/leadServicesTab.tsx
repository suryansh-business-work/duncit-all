import type { useTranslation } from '@duncit/shell';
import HandymanIcon from '@mui/icons-material/Handyman';
import type { LeadTab } from './LeadTabs';
import type { CrmServiceOffered } from '../api/crm.types';
import { LeadDetailCard } from './LeadDetailCard';
import ServicesGrid from './ServicesGrid';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * The "Services" tab every lead detail page shows: the services the lead
 * offers, each with its description. They are edited on the lead's form
 * (Services Offered section), from titles curated in CRM › Data › Services Offered.
 */
export function leadServicesTab(services: CrmServiceOffered[], t: Translate): LeadTab {
  const count = services.length;
  return {
    value: 'services',
    label: t('crm.services.tabLabel', { vars: { count } }),
    icon: <HandymanIcon fontSize="small" />,
    render: () => (
      <LeadDetailCard
        title={t('crm.common.servicesOffered')}
        subtitle={count ? t('crm.services.taggedCount', { count }) : t('crm.services.emptySubtitle')}
        icon={<HandymanIcon color="primary" />}
      >
        <ServicesGrid services={services} />
      </LeadDetailCard>
    ),
  };
}
