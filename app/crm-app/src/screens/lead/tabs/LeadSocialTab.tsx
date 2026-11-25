import { Text } from 'tamagui';
import { crmSocialCount } from '@duncit/utils';

import { LEAD_QUERY_FIELD } from '@/features/leads/leadKinds';
import { CrmAppLeadSocialDocument } from '@/graphql/leadTabs';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { DetailCard } from './parts/DetailCard';
import { DetailRow } from './parts/DetailRow';
import { TabLoad } from './parts/TabLoad';
import { kindVars, type LeadTabProps } from './parts/tabTypes';

/**
 * The portal's Social tab: every social channel the lead has, as links. View
 * only on purpose — channels change on the lead's form (Social step).
 */
export function LeadSocialTab({ kind, id }: Readonly<LeadTabProps>) {
  const { t } = useTranslation();
  const query = useGqlQuery(CrmAppLeadSocialDocument, kindVars(kind, id), {
    fallbackError: t('crmApp.common.loadFailed'),
  });
  const entry = query.data?.[LEAD_QUERY_FIELD[kind]];
  if (!entry) return <TabLoad query={query} />;
  const links = entry.social_links;
  return (
    <DetailCard
      title={t('crm.common.social')}
      subtitle={t('crm.social.viewOnlyHint')}
      icon="share"
      testID="lead-social-tab"
    >
      {crmSocialCount(entry) === 0 ? (
        <Text color="$muted" testID="lead-social-empty">
          {t('crm.social.empty')}
        </Text>
      ) : null}
      {entry.instagram_link ? (
        <DetailRow label={t('crm.common.instagram')} value={{ href: entry.instagram_link }} />
      ) : null}
      {links.map((link) => (
        <DetailRow
          key={`${link.name}-${link.url}`}
          label={link.name || link.url}
          value={{ href: link.url }}
        />
      ))}
    </DetailCard>
  );
}
