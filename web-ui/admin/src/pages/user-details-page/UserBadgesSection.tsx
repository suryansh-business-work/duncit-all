import { gql, useQuery } from '@apollo/client';
import { Avatar, Box, Card, CardContent, Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const USER_BADGES = gql`
  query AdminUserBadges($user_id: ID!) {
    userBadges(user_id: $user_id) {
      id
      awarded_at
      badge {
        id
        title
        description
        image_url
      }
    }
  }
`;

export default function UserBadgesSection({ userId }: { userId: string }) {
  const { data, loading } = useQuery(USER_BADGES, { variables: { user_id: userId }, skip: !userId });
  if (loading) return null;
  const badges = data?.userBadges ?? [];
  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
          <EmojiEventsIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1">Badges ({badges.length})</Typography>
        </Stack>
        {badges.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No badges earned yet.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill,minmax(96px,1fr))' }}>
            {badges.map((ub: any) => (
              <Stack key={ub.id} alignItems="center" spacing={0.5} sx={{ textAlign: 'center' }}>
                <Avatar src={ub.badge?.image_url || undefined} sx={{ width: 48, height: 48, bgcolor: 'primary.light' }}>
                  {!ub.badge?.image_url && <EmojiEventsIcon fontSize="small" />}
                </Avatar>
                <Typography variant="caption" fontWeight={600} noWrap sx={{ width: '100%' }}>
                  {ub.badge?.title}
                </Typography>
              </Stack>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
