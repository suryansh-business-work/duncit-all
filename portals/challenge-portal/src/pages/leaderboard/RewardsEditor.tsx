import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Paper, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import RewardRowFields from './RewardRowFields';
import { ADMIN_UPDATE_LEADERBOARD_SETTINGS, type LeaderboardReward } from './queries';

/** Rows are edited positionally and a title may be blank while typing, so each
 * carries a client-only uid for a stable React key. */
type EditableReward = LeaderboardReward & { uid: string };

const newUid = () => globalThis.crypto.randomUUID();

const blankReward = (): EditableReward => ({
  uid: newUid(),
  category: 'USER',
  period: 'MONTHLY',
  rank_from: 1,
  rank_to: 1,
  title: '',
  description: '',
  is_active: true,
  sort_order: 0,
});

interface Props {
  savedRewards: LeaderboardReward[];
}

/** Whole-list rewards editor with its own Save — a present rewards array
 * replaces the server's list, so every kept row is submitted every time. */
export default function RewardsEditor({ savedRewards }: Readonly<Props>) {
  const { t } = useTranslation();
  const [save] = useMutation(ADMIN_UPDATE_LEADERBOARD_SETTINGS, {
    refetchQueries: ['AdminLeaderboardSettings'],
  });
  const [rows, setRows] = useState<EditableReward[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRows(savedRewards.map((reward) => ({ ...reward, uid: newUid() })));
  }, [savedRewards]);

  const update = (index: number, patch: Partial<LeaderboardReward>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const remove = (index: number) => setRows((current) => current.filter((_, i) => i !== index));

  const submit = async () => {
    setBusy(true);
    try {
      // Explicit field picks: rows seeded from the query carry Apollo's
      // __typename, which LeaderboardRewardInput rejects. Blank-title rows are
      // dropped and sort_order comes from the array position.
      const rewards = rows
        .filter((row) => row.title.trim().length > 0)
        .map((row, index) => ({
          category: row.category,
          period: row.period,
          rank_from: row.rank_from,
          rank_to: row.rank_to,
          title: row.title.trim(),
          description: row.description,
          is_active: row.is_active,
          sort_order: index,
        }));
      await save({ variables: { input: { rewards } } });
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
          <Typography variant="h6" sx={{
            fontWeight: 700
          }}>
            {t('admin.leaderboard.rewardsCardTitle')}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('admin.leaderboard.rewardsCardSubtitle')}
          </Typography>
        </Stack>

        {rows.length === 0 && <Alert severity="info">{t('admin.leaderboard.rewardsEmpty')}</Alert>}
        {rows.map((row, index) => (
          <RewardRowFields key={row.uid} row={row} index={index} onChange={update} onRemove={remove} />
        ))}

        <Stack direction="row" sx={{
          justifyContent: "space-between"
        }}>
          <DuncitButton
            startIcon={<AddIcon />}
            onClick={() => setRows((current) => [...current, blankReward()])}
          >
            {t('admin.leaderboard.addReward')}
          </DuncitButton>
          <DuncitButton variant="contained" onClick={submit} disabled={busy}>
            {busy ? t('admin.leaderboard.saving') : t('admin.leaderboard.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </Paper>
  );
}
