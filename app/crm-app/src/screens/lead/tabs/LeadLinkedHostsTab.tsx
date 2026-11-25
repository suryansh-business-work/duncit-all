import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';
import { CRM_DASH } from '@duncit/utils';

import { SURFACE } from '@/components/surface';
import { CrmAppLeadLinkedHostsDocument } from '@/graphql/leadTabs';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { PriorityChip, StatusChip } from './parts/Chips';
import { DetailCard } from './parts/DetailCard';
import { TabLoad } from './parts/TabLoad';
import type { LeadTabProps } from './parts/tabTypes';

/**
 * The portal's Linked Hosts tab (venue leads): the host leads tied to this
 * venue; tapping one opens that host lead. They are set on the Edit form.
 */
export function LeadLinkedHostsTab({ id }: Readonly<LeadTabProps>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const query = useGqlQuery(
    CrmAppLeadLinkedHostsDocument,
    { id },
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const venue = query.data?.venueLead;
  if (!venue) return <TabLoad query={query} />;
  const hosts = venue.linked_hosts;
  return (
    <DetailCard
      title={t('crm.venueLeads.linkedHosts')}
      subtitle={t('crm.venueLeads.hostLeadsAssociatedWithThisVenue')}
      icon="link"
      testID="lead-linked-hosts-tab"
    >
      {hosts.length === 0 ? (
        <Text color="$muted" testID="lead-linked-hosts-empty">
          {t('crm.leadDetail.noLinkedHosts')}
        </Text>
      ) : null}
      {hosts.map((host) => (
        <YStack
          key={host.id}
          {...SURFACE}
          gap="$1"
          role="button"
          aria-label={host.host_name}
          pressStyle={{ borderColor: '$accentText' }}
          onPress={() => navigation.push('LeadDetail', { kind: 'HOST_LEAD', id: host.id })}
          testID={`lead-linked-host-${host.id}`}
        >
          <XStack alignItems="center" gap="$2" flexWrap="wrap">
            <Text fontWeight="700">{host.host_name}</Text>
            <StatusChip value={host.lead_status} />
            <PriorityChip value={host.priority} />
          </XStack>
          <Text color="$muted" fontSize="$2">
            {[host.host_type, host.city].filter(Boolean).join(' · ') || CRM_DASH}
          </Text>
        </YStack>
      ))}
    </DetailCard>
  );
}
