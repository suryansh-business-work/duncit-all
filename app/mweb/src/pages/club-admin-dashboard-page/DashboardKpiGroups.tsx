import { useMemo } from 'react';
import { Stack } from '@mui/material';
import { StatCard } from '@duncit/ui';
import {
  clubAdminGroupHeadings,
  clubAdminKpiGroups,
  clubAdminKpiLabels,
  clubAdminKpiValue,
  type ClubAdminKpis,
} from '@duncit/utils';
import SectionHeader from '../../components/SectionHeader';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  kpis: ClubAdminKpis;
  loading: boolean;
}

/** A short count reads big; money, a rate or a rating is kept from truncating.
 * The same 24 / 20 the native StatTile's `lg` / `md` draw. */
const VALUE_SIZE = { lg: '1.5rem', md: '1.25rem' } as const;

/**
 * The four titled groups of figures, two tiles to a row: a muted label over a
 * big number. Which figures, in what order and how each is written are
 * `@duncit/utils`' answer, so the Partners console and the native app draw the
 * same dashboard (rule 27).
 */
export default function DashboardKpiGroups({ kpis, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useMemo(() => clubAdminKpiLabels(t), [t]);
  const headings = useMemo(() => clubAdminGroupHeadings(t), [t]);

  return (
    <Stack spacing={3}>
      {clubAdminKpiGroups(kpis).map((group) => (
        <Stack key={group.key} spacing={1.5}>
          <SectionHeader title={headings[group.key]} />
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.25 }}>
            {group.cards.map((card) => (
              <StatCard
                key={card.key}
                cardVariant="elevation"
                label={labels[card.key].label}
                labelVariant="caption"
                labelWeight={600}
                value={clubAdminKpiValue(card, kpis.currency_symbol)}
                valueWeight={700}
                valueNoWrap
                valueSx={{ fontSize: VALUE_SIZE[card.kind === 'count' ? 'lg' : 'md'], lineHeight: 1.2 }}
                loading={loading}
                skeletonProps={{ width: 70, height: 32 }}
                headerSx={{ mb: 0.5 }}
                sx={{ flex: '1 1 45%', minWidth: 140 }}
                contentSx={{ p: 2, '&:last-child': { pb: 2 } }}
              />
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
