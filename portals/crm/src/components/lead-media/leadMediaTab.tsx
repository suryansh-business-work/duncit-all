import type { useTranslation } from '@duncit/shell';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import type { LeadTab } from '../LeadTabs';
import type { CrmLeadMediaEntity } from '../../api/leadMedia.gql';
import { LeadDetailCard } from '../LeadDetailCard';
import LeadMediaSection from './LeadMediaSection';

type Translate = ReturnType<typeof useTranslation>['t'];

/** The "Logos & Images" tab every lead detail page shows. */
export function leadMediaTab(entity: CrmLeadMediaEntity, leadId: string, t: Translate): LeadTab {
  return {
    value: 'media',
    label: t('crm.media.tabLabel'),
    icon: <PhotoLibraryIcon fontSize="small" />,
    render: () => (
      <LeadDetailCard
        title={t('crm.media.tabLabel')}
        subtitle={t('crm.media.tabSubtitle')}
        icon={<PhotoLibraryIcon color="primary" />}
      >
        <LeadMediaSection entity={entity} leadId={leadId} />
      </LeadDetailCard>
    ),
  };
}
