import { MenuItem, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type {
  LeaderboardCategory,
  LeaderboardReward,
  LeaderboardRewardPeriod,
} from './queries';
import {
  CATEGORIES,
  CATEGORY_LABEL_KEYS,
  REWARD_PERIODS,
  REWARD_PERIOD_LABEL_KEYS,
} from './labels';

/** Ranks are 1-based integers — a blank or negative entry snaps to 1. */
const toRank = (raw: string): number => {
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.max(1, parsed);
};

interface Props {
  row: LeaderboardReward;
  index: number;
  onChange: (index: number, patch: Partial<LeaderboardReward>) => void;
  onRemove: (index: number) => void;
}

/** One reward row: which board and window it covers, the rank range it pays,
 * and the prize copy the apps show. */
export default function RewardRowFields({ row, index, onChange, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1.5} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label={t('admin.leaderboard.rewardCategory')}
          value={row.category}
          onChange={(e) => onChange(index, { category: e.target.value as LeaderboardCategory })}
          fullWidth
        >
          {CATEGORIES.map((value) => (
            <MenuItem key={value} value={value}>
              {t(CATEGORY_LABEL_KEYS[value])}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={t('admin.leaderboard.rewardPeriod')}
          value={row.period}
          onChange={(e) => onChange(index, { period: e.target.value as LeaderboardRewardPeriod })}
          fullWidth
        >
          {REWARD_PERIODS.map((value) => (
            <MenuItem key={value} value={value}>
              {t(REWARD_PERIOD_LABEL_KEYS[value])}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={t('admin.leaderboard.rewardRankFrom')}
          type="number"
          value={row.rank_from}
          onChange={(e) => onChange(index, { rank_from: toRank(e.target.value) })}
          sx={{ minWidth: 120 }}
          slotProps={{
            htmlInput: { min: 1, step: 1 }
          }}
        />
        <TextField
          label={t('admin.leaderboard.rewardRankTo')}
          type="number"
          value={row.rank_to}
          onChange={(e) => onChange(index, { rank_to: toRank(e.target.value) })}
          sx={{ minWidth: 120 }}
          slotProps={{
            htmlInput: { min: 1, step: 1 }
          }}
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('admin.leaderboard.rewardTitle')}
          value={row.title}
          onChange={(e) => onChange(index, { title: e.target.value })}
          fullWidth
          error={row.title.trim().length === 0}
        />
        <TextField
          label={t('admin.leaderboard.rewardDescription')}
          value={row.description}
          onChange={(e) => onChange(index, { description: e.target.value })}
          fullWidth
        />
      </Stack>

      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between"
        }}>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <Switch checked={row.is_active} onChange={(_, value) => onChange(index, { is_active: value })} />
          <Typography variant="body2">{t('admin.leaderboard.rewardActive')}</Typography>
        </Stack>
        <Tooltip title={t('admin.leaderboard.removeReward')}>
          <DuncitIconButton
            aria-label={t('admin.leaderboard.removeReward')}
            color="error"
            onClick={() => onRemove(index)}
          >
            <DeleteOutlineIcon />
          </DuncitIconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
