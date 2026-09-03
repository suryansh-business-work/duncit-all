import { useMemo } from 'react';
import { Grid, Stack, Typography } from '@mui/material';
import { StatCard } from '@duncit/ui';
import {
  clubAdminGroupHeadings,
  clubAdminKpiGroups,
  clubAdminKpiLabels,
  clubAdminKpiValue,
  type ClubAdminKpis,
} from '@duncit/utils';
import { useTranslation } from '@duncit/shell';

interface Props {
  kpis: ClubAdminKpis;
  loading: boolean;
}

/** The four titled groups of stat cards. Which figures, in what order and how
 * each is written are `@duncit/utils`' answer, so the apps draw the same. */
export default function ClubAdminKpiCards({ kpis, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useMemo(() => clubAdminKpiLabels(t), [t]);
  const headings = useMemo(() => clubAdminGroupHeadings(t), [t]);
  const groups = clubAdminKpiGroups(kpis);
  return (
    <Stack spacing={2.5}>
      {groups.map((group) => (
        <Stack key={group.key} spacing={1.25}>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              fontWeight: 800,
              letterSpacing: 0.4
            }}>
            {headings[group.key]}
          </Typography>
          <Grid container spacing={2}>
            {group.cards.map((card) => (
              <Grid
                key={card.key}
                size={{
                  xs: 12,
                  sm: 6,
                  md: 3
                }}>
                <StatCard
                  label={labels[card.key].label}
                  labelWeight={800}
                  labelSx={{ lineHeight: 1.4 }}
                  value={clubAdminKpiValue(card, kpis.currency_symbol)}
                  valueWeight={950}
                  hint={labels[card.key].hint}
                  loading={loading}
                  skeletonProps={{ width: 90, height: 36 }}
                  headerSx={{ mb: 0.75 }}
                  sx={{ height: '100%', borderRadius: 2 }}
                />
              </Grid>
            ))}
          </Grid>
        </Stack>
      ))}
    </Stack>
  );
}
