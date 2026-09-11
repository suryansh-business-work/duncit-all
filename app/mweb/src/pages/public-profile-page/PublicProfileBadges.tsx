import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Avatar, Box, ButtonBase, Card, CardContent, Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsOutlined';
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

export default function PublicProfileBadges({ userId }: Readonly<Props>) {
  const { data, loading } = useQuery<any>(USER_BADGES, {
    variables: { user_id: userId },
    fetchPolicy: 'cache-and-network',
  });
  const badges = data?.userBadges ?? [];
  const [active, setActive] = useState<any>(null);
  if (loading && !data) return null;
  if (badges.length === 0) return null;

  return (
    <Card>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline', mb: 1.5 }}>
          <Typography component="h2" sx={{ fontSize: '1.05rem', fontWeight: 600 }}>
            Badges
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            ({badges.length})
          </Typography>
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: 'repeat(4,1fr)', sm: 'repeat(6,1fr)' },
          }}
        >
          {badges.map((ub: any) => (
            <ButtonBase
              key={ub.id}
              focusRipple
              onClick={() => setActive(ub)}
              aria-label={`View badge ${ub.badge?.title ?? ''}`}
              sx={{
                borderRadius: '16px',
                p: 0.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minHeight: 44,
                minWidth: 0,
                '&:hover': { bgcolor: 'action.hover' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
              }}
            >
              <Avatar
                src={ub.badge?.image_url || undefined}
                sx={{ width: 56, height: 56, bgcolor: 'action.hover', color: 'secondary.main', mb: 0.75 }}
              >
                {!ub.badge?.image_url && <EmojiEventsIcon />}
              </Avatar>
              <Typography
                noWrap
                sx={{ fontSize: 13, fontWeight: 600, width: '100%', textAlign: 'center' }}
              >
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
