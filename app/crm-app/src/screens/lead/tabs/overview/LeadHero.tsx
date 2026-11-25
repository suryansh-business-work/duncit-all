import { Image } from 'react-native';
import { XStack, YStack } from 'tamagui';

import { RADII } from '@/constants/design';
import type { LeadKind } from '@/features/leads/leadKinds';
import { useTranslation } from '@/hooks/useTranslation';
import { LeadContactActions } from '../contacts/LeadContactActions';
import { Chip, PriorityChip, StatusChip } from '../parts/Chips';
import { LeadQualityRing } from '../quality/LeadQualityRing';
import { MatchedUserChip } from './MatchedUser';
import type { CardLead, HeroModel } from './overviewTypes';

interface Props {
  kind: LeadKind;
  id: string;
  name: string;
  lead: CardLead;
  hero: HeroModel;
  leadValues?: Readonly<Record<string, string>>;
  onOpenQuality?: () => void;
}

const PHOTO_SIZE = 56;

/**
 * The portal's hero card under the lead's name: the logo or photo, status,
 * priority, city and the kind's own chips, the tags, the quick contact
 * actions and the quality score ring.
 */
export function LeadHero({
  kind,
  id,
  name,
  lead,
  hero,
  leadValues,
  onOpenQuality,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap="$3" testID="lead-hero">
      <XStack gap="$3" alignItems="center">
        {hero.photo ? (
          <Image
            source={{ uri: hero.photo }}
            style={{
              width: PHOTO_SIZE,
              height: PHOTO_SIZE,
              borderRadius: kind === 'VENUE_LEAD' ? RADII.md : PHOTO_SIZE / 2,
            }}
            accessibilityIgnoresInvertColors
            testID="lead-hero-photo"
          />
        ) : null}
        <XStack flex={1} flexWrap="wrap" gap="$2" alignItems="center">
          <StatusChip value={lead.lead_status} />
          <PriorityChip value={lead.priority} />
          {lead.city ? <Chip label={lead.city} icon="location-on" /> : null}
          {hero.kindChip ? <Chip label={hero.kindChip} /> : null}
          {hero.superCategory ? <Chip label={hero.superCategory} accent /> : null}
          {hero.matched ? <MatchedUserChip matched={hero.matched} /> : null}
          {hero.extras.map((extra) => (
            <Chip key={extra} label={extra} />
          ))}
          {hero.more > 0 ? (
            <Chip label={t('crm.leadDetail.moreCount', { vars: { count: hero.more } })} />
          ) : null}
        </XStack>
        <LeadQualityRing kind={kind} id={id} onOpen={onOpenQuality} />
      </XStack>
      {hero.tags.length > 0 ? (
        <XStack flexWrap="wrap" gap="$1.5" testID="lead-hero-tags">
          {hero.tags.map((tag) => (
            <Chip key={tag} label={`#${tag}`} />
          ))}
        </XStack>
      ) : null}
      <LeadContactActions kind={kind} id={id} name={name} lead={lead} leadValues={leadValues} />
    </YStack>
  );
}
