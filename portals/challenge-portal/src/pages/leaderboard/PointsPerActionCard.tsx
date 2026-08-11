import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { ADMIN_UPDATE_LEADERBOARD_SETTINGS, type LeaderboardSettings } from './queries';

type PointsField =
  | 'points_per_join'
  | 'points_per_host'
  | 'points_per_club_pod'
  | 'points_per_venue_pod'
  | 'points_per_product_sale';

const POINT_FIELDS: ReadonlyArray<{ field: PointsField; labelKey: string }> = [
  { field: 'points_per_join', labelKey: 'admin.leaderboard.pointsJoin' },
  { field: 'points_per_host', labelKey: 'admin.leaderboard.pointsHost' },
  { field: 'points_per_club_pod', labelKey: 'admin.leaderboard.pointsClubPod' },
  { field: 'points_per_venue_pod', labelKey: 'admin.leaderboard.pointsVenuePod' },
  { field: 'points_per_product_sale', labelKey: 'admin.leaderboard.pointsProductSale' },
];

type PointsFormState = Record<PointsField, string>;

const toFormState = (settings: LeaderboardSettings): PointsFormState => ({
  points_per_join: String(settings.points_per_join),
  points_per_host: String(settings.points_per_host),
  points_per_club_pod: String(settings.points_per_club_pod),
  points_per_venue_pod: String(settings.points_per_venue_pod),
  points_per_product_sale: String(settings.points_per_product_sale),
});

/** Integers >= 0 — a blank or negative entry saves as 0. */
const toPoints = (raw: string): number => {
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, parsed);
};

interface Props {
  settings: LeaderboardSettings;
}

/** The five points-per-action scalars, saved on their own — the mutation input
 * carries only the scalars, so the rewards list is left untouched. */
export default function PointsPerActionCard({ settings }: Readonly<Props>) {
  const { t } = useTranslation();
  const [save] = useMutation(ADMIN_UPDATE_LEADERBOARD_SETTINGS, {
    refetchQueries: ['AdminLeaderboardSettings'],
  });
  const [form, setForm] = useState<PointsFormState>(() => toFormState(settings));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(toFormState(settings));
  }, [settings]);

  const submit = async () => {
    setBusy(true);
    try {
      await save({
        variables: {
          input: {
            points_per_join: toPoints(form.points_per_join),
            points_per_host: toPoints(form.points_per_host),
            points_per_club_pod: toPoints(form.points_per_club_pod),
            points_per_venue_pod: toPoints(form.points_per_venue_pod),
            points_per_product_sale: toPoints(form.points_per_product_sale),
          },
        },
      });
      notifySuccess(t('admin.leaderboard.saved'));
    } catch {
      notifyError(t('admin.leaderboard.loadError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Stack>
          <Typography variant="h6" fontWeight={700}>
            {t('admin.leaderboard.pointsCardTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('admin.leaderboard.pointsCardSubtitle')}
          </Typography>
        </Stack>

        {POINT_FIELDS.map((item) => (
          <TextField
            key={item.field}
            label={t(item.labelKey)}
            type="number"
            value={form[item.field]}
            onChange={(e) => setForm((current) => ({ ...current, [item.field]: e.target.value }))}
            inputProps={{ min: 0, step: 1 }}
            fullWidth
          />
        ))}

        <Stack direction="row" justifyContent="flex-end">
          <Button variant="contained" onClick={submit} disabled={busy}>
            {busy ? t('admin.leaderboard.saving') : t('admin.leaderboard.save')}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
