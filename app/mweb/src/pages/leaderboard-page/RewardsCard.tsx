import { Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import type { LeaderboardCategory } from '@duncit/utils';
import SectionHeader from '../../components/SectionHeader';
import IconDisc from '../account-page/IconDisc';
import type { LeaderboardConfigData, LeaderboardReward } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  config: LeaderboardConfigData;
  category: LeaderboardCategory;
}

function RewardRow({ reward }: Readonly<{ reward: LeaderboardReward }>) {
  const { t } = useTranslation();
  const rankLabel =
    reward.rank_from === reward.rank_to
      ? t('mweb.leaderboard.rewardRankOne', { vars: { from: reward.rank_from } })
      : t('mweb.leaderboard.rewardRankRange', {
          vars: { from: reward.rank_from, to: reward.rank_to },
        });
  return (
    <Stack direction="row" spacing={1.5} sx={{
      alignItems: "flex-start"
    }}>
      <Chip size="small" label={rankLabel} sx={{ height: 24, fontSize: 12 }} />
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {reward.title}
        </Typography>
        {reward.description !== '' && (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {reward.description}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

function RewardGroup({ title, rewards }: Readonly<{ title: string; rewards: LeaderboardReward[] }>) {
  if (rewards.length === 0) return null;
  return (
    <Stack spacing={1}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.6
        }}>
        {title}
      </Typography>
      {rewards.map((reward) => (
        <RewardRow key={`${reward.period}-${reward.rank_from}-${reward.rank_to}-${reward.title}`} reward={reward} />
      ))}
    </Stack>
  );
}

/** The prizes promised for this board — month-end and year-end, admin-curated. */
export default function RewardsCard({ config, category }: Readonly<Props>) {
  const { t } = useTranslation();
  const rewards = config.rewards.filter((reward) => reward.category === category);
  const monthly = rewards.filter((reward) => reward.period === 'MONTHLY');
  const yearly = rewards.filter((reward) => reward.period === 'YEARLY');

  return (
    <Card>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5} sx={{
            alignItems: "center"
          }}>
            <IconDisc>
              <CardGiftcardIcon />
            </IconDisc>
            <SectionHeader title={t('mweb.leaderboard.rewardsTitle')} />
          </Stack>
          {rewards.length === 0 ? (
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {t('mweb.leaderboard.rewardsEmpty')}
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              <RewardGroup title={t('mweb.leaderboard.rewardsMonthly')} rewards={monthly} />
              {monthly.length > 0 && yearly.length > 0 && <Divider />}
              <RewardGroup title={t('mweb.leaderboard.rewardsYearly')} rewards={yearly} />
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
