import { useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Box, ButtonBase, Card, CardContent, Stack, Typography, Avatar } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import BadgeDetailsSheet from './badges/BadgeDetailsSheet';

const MY_BADGES = gql`
  query MyBadges {
    myBadges {
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

export default function MyBadges() {
  const { data, loading } = useQuery(MY_BADGES, { fetchPolicy: 'cache-and-network' });
  const badges = data?.myBadges ?? [];
  const [active, setActive] = useState<any | null>(null);
  if (loading && !data) return null;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <EmojiEventsIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Your badges
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ({badges.length})
          </Typography>
        </Stack>
        {badges.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No badges yet. Join pods, host events and refer friends to earn them!
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)' },
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
                  textAlign: 'center',
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
                  sx={{ width: 56, height: 56, bgcolor: 'primary.light', mb: 0.5 }}
                >
                  {!ub.badge?.image_url && <EmojiEventsIcon />}
                </Avatar>
                <Typography variant="body2" fontWeight={600} noWrap sx={{ width: '100%' }}>
                  {ub.badge?.title}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {ub.badge?.description}
                </Typography>
              </ButtonBase>
            ))}
          </Box>
        )}
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
