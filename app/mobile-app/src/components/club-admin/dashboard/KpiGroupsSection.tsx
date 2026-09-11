import { XStack, YStack } from 'tamagui';
import {
  clubAdminGroupHeadings,
  clubAdminKpiGroups,
  clubAdminKpiLabels,
  clubAdminKpiValue,
  type ClubAdminKpiCard,
  type ClubAdminKpis,
} from '@duncit/utils';

import { SectionHeader } from '@/components/SectionHeader';
import { StatTile } from '@/components/studio';
import { useTranslation } from '@/hooks/useTranslation';

/** Two tiles a row, so each figure has room for its en-IN grouping. */
function pairs(cards: ClubAdminKpiCard[]): ClubAdminKpiCard[][] {
  const rows: ClubAdminKpiCard[][] = [];
  for (let index = 0; index < cards.length; index += 2) {
    rows.push(cards.slice(index, index + 2));
  }
  return rows;
}

/**
 * The four titled KPI groups — which figures become tiles, in what order and
 * how each is written all come from @duncit/utils, so the Partners console,
 * mWeb and this screen read the same dashboard (rule 27). A short count reads
 * big; money, a rate or a rating keeps the size that never truncates.
 */
export function KpiGroupsSection({ kpis }: Readonly<{ kpis: ClubAdminKpis }>) {
  const { t } = useTranslation();
  const headings = clubAdminGroupHeadings(t);
  const labels = clubAdminKpiLabels(t);

  return (
    <YStack gap={24} testID="club-dashboard-kpis">
      {clubAdminKpiGroups(kpis).map((group) => (
        <YStack key={group.key} gap={12} testID={`club-dashboard-group-${group.key}`}>
          <SectionHeader title={headings[group.key]} />
          {pairs(group.cards).map((row) => (
            <XStack key={row[0]?.key ?? group.key} gap={10}>
              {row.map((card) => (
                <StatTile
                  key={card.key}
                  label={labels[card.key].label}
                  value={clubAdminKpiValue(card, kpis.currency_symbol)}
                  size={card.kind === 'count' ? 'lg' : 'md'}
                />
              ))}
            </XStack>
          ))}
        </YStack>
      ))}
    </YStack>
  );
}
