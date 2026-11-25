import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { crmServiceLabel } from '@duncit/utils';

import { SURFACE } from '@/components/surface';
import { LEAD_QUERY_FIELD } from '@/features/leads/leadKinds';
import { CrmAppLeadServicesDocument } from '@/graphql/leadTabs';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { Chip } from './parts/Chips';
import { DetailCard } from './parts/DetailCard';
import { TabLoad } from './parts/TabLoad';
import { kindVars, type LeadTabProps } from './parts/tabTypes';

interface Service {
  service: string;
  custom_name?: string | null;
  description?: string | null;
}

function ServiceCard({ service, index }: Readonly<{ service: Service; index: number }>) {
  const { t } = useTranslation();
  return (
    <YStack {...SURFACE} gap="$1" testID={`lead-service-${index}`}>
      <XStack alignItems="center" gap="$2" flexWrap="wrap">
        <Text fontWeight="700" flexShrink={1}>
          {crmServiceLabel(service)}
        </Text>
        {service.service === 'Other' ? <Chip label={t('crm.common.custom')} /> : null}
      </XStack>
      <Text color="$muted" fontSize={service.description ? '$3' : '$2'}>
        {service.description || t('crm.components.noServiceDescription')}
      </Text>
    </YStack>
  );
}

/**
 * The portal's Services tab: the services the lead offers, each with its
 * description. They are edited on the lead's form (Services Offered section).
 */
export function LeadServicesTab({ kind, id }: Readonly<LeadTabProps>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const query = useGqlQuery(CrmAppLeadServicesDocument, kindVars(kind, id), {
    fallbackError: t('crmApp.common.loadFailed'),
  });
  const entry = query.data?.[LEAD_QUERY_FIELD[kind]];
  if (!entry) return <TabLoad query={query} />;
  const services: readonly Service[] = entry.services_offered;
  const count = services.length;
  return (
    <DetailCard
      title={t('crm.common.servicesOffered')}
      subtitle={count ? t('crm.services.taggedCount', { count }) : t('crm.services.emptySubtitle')}
      icon="handyman"
      testID="lead-services-tab"
    >
      {count === 0 ? (
        <XStack alignItems="center" gap="$2" paddingVertical="$1">
          <MaterialIcons
            name="handyman"
            size={18}
            color={theme.muted?.val}
            accessibilityElementsHidden
          />
          <Text color="$muted">{t('crm.components.noServicesTaggedYet')}</Text>
        </XStack>
      ) : null}
      <YStack gap="$2">
        {services.map((service, index) => (
          <ServiceCard
            key={`${crmServiceLabel(service)}-${index}`}
            service={service}
            index={index}
          />
        ))}
      </YStack>
    </DetailCard>
  );
}
