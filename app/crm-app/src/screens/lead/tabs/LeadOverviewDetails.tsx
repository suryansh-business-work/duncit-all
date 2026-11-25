import { useMemo } from 'react';
import { YStack } from 'tamagui';
import { CRM_DASH } from '@duncit/utils';

import { CrmAppLeadOverviewDocument } from '@/graphql/leadTabs';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { heroModel } from './overview/heroModel';
import { kindOverview, templateValues } from './overview/kindOverview';
import { LeadHero } from './overview/LeadHero';
import { MatchedUserCard } from './overview/MatchedUser';
import { OverviewSections, TrackingCard } from './overview/OverviewSections';
import { sectionModel } from './overview/sectionModel';
import { statModel } from './overview/statModel';
import { trackingModel } from './overview/trackingModel';
import { displayDate } from './parts/dates';
import { StatTiles } from './parts/StatTiles';
import { TabLoad } from './parts/TabLoad';
import { kindVars, type LeadTabProps } from './parts/tabTypes';

interface Props extends LeadTabProps {
  /** Opens another tab of the lead page (the score ring opens 'quality'). */
  onOpenTab?: (tab: string) => void;
}

/**
 * The portal's lead page above and in its Overview tab, for every kind: the
 * hero (photo, chips, tags, quick contact actions, score ring), the "Also a
 * Duncit user" box, the stat tiles, the kind's overview cards and the Lead
 * tracking card.
 */
export function LeadOverviewDetails({ kind, id, lead, onOpenTab }: Readonly<Props>) {
  const { t } = useTranslation();
  const query = useGqlQuery(CrmAppLeadOverviewDocument, kindVars(kind, id), {
    fallbackError: t('crmApp.common.loadFailed'),
  });
  const { data } = query;
  const overview = useMemo(() => (data ? kindOverview(kind, data) : null), [kind, data]);
  const leadValues = useMemo(
    () => (overview ? templateValues(overview, lead, lead.name) : undefined),
    [overview, lead],
  );
  if (!overview) return <TabLoad query={query} />;

  const hero = heroModel(overview);
  return (
    <YStack gap="$3" testID="lead-overview-details">
      <LeadHero
        kind={kind}
        id={id}
        name={lead.name}
        lead={lead}
        hero={hero}
        leadValues={leadValues}
        onOpenQuality={onOpenTab ? () => onOpenTab('quality') : undefined}
      />
      {hero.matched ? <MatchedUserCard matched={hero.matched} /> : null}
      <StatTiles items={statModel(overview, lead, t)} />
      <OverviewSections sections={sectionModel(overview, lead, t)} />
      <TrackingCard
        tracking={trackingModel(overview, t)}
        lead={lead}
        followUp={displayDate(lead.next_follow_up_date) || CRM_DASH}
      />
    </YStack>
  );
}
