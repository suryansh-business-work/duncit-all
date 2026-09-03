import { useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import { StatCard } from '@duncit/ui';
import {
  clubAdminGroupHeadings,
  clubAdminKpiGroups,
  clubAdminKpiLabels,
  clubAdminKpiValue,
  type ClubAdminKpis,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  kpis: ClubAdminKpis;
  loading: boolean;
}

/**
 * The four titled groups of figures, two tiles to a row. Which figures, in
 * what order and how each is written are `@duncit/utils`' answer, so the
 * Partners console and the native app draw the same dashboard (rule 27).
 */
export default function DashboardKpiGroups({ kpis, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useMemo(() => clubAdminKpiLabels(t), [t]);
  const headings = useMemo(() => clubAdminGroupHeadings(t), [t]);

  return (
    <Stack spacing={2}>
      {clubAdminKpiGroups(kpis).map((group) => (
        <Stack key={group.key} spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {headings[group.key]}
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {group.cards.map((card) => (
              <StatCard
                key={card.key}
                label={labels[card.key].label}
                labelVariant="caption"
                labelWeight={700}
                value={clubAdminKpiValue(card, kpis.currency_symbol)}
                valueVariant="h6"
                valueWeight={700}
                hint={labels[card.key].hint}
                loading={loading}
                skeletonProps={{ width: 70, height: 28 }}
                headerSx={{ mb: 0.25 }}
                sx={{ flex: '1 1 45%', minWidth: 140, borderRadius: '16px' }}
                contentSx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}
              />
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
