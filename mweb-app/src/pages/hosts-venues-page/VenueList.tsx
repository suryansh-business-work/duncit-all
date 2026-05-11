import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import FollowButton from '../../components/FollowButton';

interface Venue {
  id: string;
  owner_user_id: string;
  venue_name: string;
  venue_type?: string | null;
  capacity?: number | null;
  description?: string | null;
  cover_image_url?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  locality?: string | null;
  postal_code?: string | null;
  amenities?: string[] | null;
  tags?: string[] | null;
}

interface Props {
  venues: Venue[];
  meId?: string;
  followingIds: Set<string>;
  pendingUserId: string | null;
  onToggleFollow: (userId: string) => void;
}

export default function VenueList({ venues, meId, followingIds, pendingUserId, onToggleFollow }: Props) {
  if (!venues.length) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            No approved venues yet — list yours to be featured here.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Grid container spacing={2}>
      {venues.map((v) => (
        <Grid item xs={12} sm={6} key={v.id}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            {v.cover_image_url ? (
              <CardMedia
                component="img"
                image={v.cover_image_url}
                alt={v.venue_name}
                sx={{ height: 160, objectFit: 'cover' }}
              />
            ) : (
              <Box
                sx={{
                  height: 160,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  No image
                </Typography>
              </Box>
            )}
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {v.venue_name}
                  </Typography>
                </Box>
                <FollowButton
                  following={followingIds.has(v.owner_user_id)}
                  disabled={v.owner_user_id === meId}
                  loading={pendingUserId === v.owner_user_id}
                  onToggle={() => onToggleFollow(v.owner_user_id)}
                />
              </Stack>
              {v.venue_type && (
                <Typography variant="caption" color="text.secondary">
                  {v.venue_type}
                </Typography>
              )}
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}
              >
                {(v.city || v.state) && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <LocationOnIcon fontSize="inherit" />
                    <span>{[v.locality, v.city, v.state].filter(Boolean).join(', ')}</span>
                  </Stack>
                )}
                {v.capacity != null && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <PeopleIcon fontSize="inherit" />
                    <span>{v.capacity}</span>
                  </Stack>
                )}
              </Stack>
              {v.description && (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {v.description}
                </Typography>
              )}
              {v.postal_code && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  PIN: {v.postal_code}
                </Typography>
              )}
              {v.tags && v.tags.length > 0 && (
                <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                  {v.tags.slice(0, 4).map((tag) => <Chip key={tag} label={tag} size="small" />)}
                </Stack>
              )}
              {v.amenities && v.amenities.length > 0 && (
                <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                  {v.amenities.slice(0, 4).map((a) => (
                    <Chip key={a} label={a} size="small" sx={{ mb: 0.5 }} />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
