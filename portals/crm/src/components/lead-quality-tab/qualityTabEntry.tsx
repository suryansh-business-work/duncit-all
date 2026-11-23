import type { useTranslation } from '@duncit/shell';
import InsightsIcon from '@mui/icons-material/Insights';
import type { CrmLeadEntityType } from '../../api/crm.types';
import type { LeadTab } from '../LeadTabs';
import { QUALITY_TAB } from './useLeadQuality';
import LeadQualityTab from './LeadQualityTab';

type Translate = ReturnType<typeof useTranslation>['t'];

/** The "Quality Score" tab every lead detail page shows. */
export function leadQualityTab(entity: CrmLeadEntityType, leadId: string, t: Translate): LeadTab {
  return {
    value: QUALITY_TAB,
    label: t('crm.leadQualityTab.title'),
    icon: <InsightsIcon fontSize="small" />,
    render: () => <LeadQualityTab entity={entity} leadId={leadId} />,
  };
}
