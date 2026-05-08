import { useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Avatar, Box, ButtonBase, Card, CardContent, Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import BadgeDetailsSheet from '../../components/badges/BadgeDetailsSheet';

const USER_BADGES = gql`
  query UserBadgesPublic($user_id: ID!) {
    userBadges(user_id: $user_id) {
      id
      awarded_at
      awarded_reason
      badge {
        id
        title
        description
        image_url
        condition_type
        threshold
      }
    }
  }
`;

interface Props {
  userId: string;
}

export default function PublicProfileBadges({ userId }: Props) {
  const { data, loading } = useQuery(USER_BADGES, {
    variables: { user_id: userId },
    fetchPolicy: 'cache-and-network',
  });
  const badges = data?.userBadges ?? [];
  const [active, setActive] = useState<any | null>(null);
  if (loading && !data) return null;
  if (badges.length === 0) return null;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
          <EmojiEventsIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Badges
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ({badges.length})
          </Typography>
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: 'repeat(3,1fr)', sm: 'repeat(4,1fr)' },
          }}
        >
          {badges.map((ub: any) => (
            <ButtonBase
              key={ub.id}
              focusRipple
              onClick={() => setActive(ub)}
              aria-label={`View badge ${ub.badge?.title ?? ''}`}
              sx={{
                borderRadius: 2,
                p: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minHeight: 44,
                '&:hover': { bgcolor: 'action.hover' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
              }}
            >
              <Avatar
                src={ub.badge?.image_url || undefined}
                sx={{ width: 48, height: 48, bgcolor: 'primary.light', mb: 0.5 }}
              >
                {!ub.badge?.image_url && <EmojiEventsIcon fontSize="small" />}
              </Avatar>
              <Typography variant="caption" fontWeight={600} noWrap sx={{ width: '100%', textAlign: 'center' }}>
                {ub.badge?.title}
              </Typography>
            </ButtonBase>
          ))}
        </Box>
      </CardContent>
      <BadgeDetailsSheet
        open={!!active}
        onClose={() => setActive(null)}
        badge={active?.badge}
        awardedAt={active?.awarded_at}
        awardedReason={active?.awarded_reason}
      />
    </Card>
  );
}
