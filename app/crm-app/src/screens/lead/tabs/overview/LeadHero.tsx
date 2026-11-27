import { Image } from 'react-native';
import { XStack, YStack } from 'tamagui';

import { RADII } from '@/constants/design';
import type { LeadKind } from '@/features/leads/leadKinds';
import { useTranslation } from '@/hooks/useTranslation';
import { Chip, PriorityChip, StatusChip } from '../parts/Chips';
import { LeadQualityRing } from '../quality/LeadQualityRing';
import { MatchedUserChip } from './MatchedUser';
import type { CardLead, HeroModel } from './overviewTypes';

interface Props {
  kind: LeadKind;
  id: string;
  lead: CardLead;
  hero: HeroModel;
  onOpenQuality?: () => void;
}

const PHOTO_SIZE = 56;

/**
 * The portal's hero card under the lead's name: the logo or photo, status,
 * priority, city and the kind's own chips, the tags and the quality score
 * ring. The contact actions live in the page's bottom bar, on every tab.
 */
export function LeadHero({ kind, id, lead, hero, onOpenQuality }: Readonly<Props>) {
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
    </YStack>
  );
}
