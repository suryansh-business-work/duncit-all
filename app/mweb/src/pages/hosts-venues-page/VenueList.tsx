import type { FollowStatus } from '@duncit/utils';
import { Box, Card, CardContent, CardMedia, Chip, Grid, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { DuncitButton } from '@duncit/buttons';
import EmptyState from '../../components/EmptyState';
import FollowButton from '../../components/FollowButton';
import { venueUrl } from '../../utils/seoUrls';

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
  statusFor: (userId: string) => FollowStatus;
  pendingUserId: string | null;
  onToggleFollow: (userId: string) => void;
}

export default function VenueList({ venues, meId, statusFor, pendingUserId, onToggleFollow }: Readonly<Props>) {
  if (!venues.length) {
    return <EmptyState icon={<StorefrontOutlinedIcon />} title="No approved venues yet." />;
  }

  return (
    <Grid container spacing={1.5}>
      {venues.map((v) => (
        <Grid
          key={v.id}
          size={{
            xs: 12,
            sm: 6
          }}>
          <Card sx={{ height: '100%', p: 1 }}>
            {v.cover_image_url ? (
              <CardMedia
                component="img"
                image={v.cover_image_url}
                alt={v.venue_name}
                sx={{ height: 168, objectFit: 'cover', borderRadius: '18px' }}
              />
            ) : (
              <Box
                sx={{
                  height: 160,
                  borderRadius: '18px',
                  bgcolor: 'action.hover',
                  color: 'secondary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <StorefrontOutlinedIcon sx={{ fontSize: 40 }} />
              </Box>
            )}
            <CardContent sx={{ px: 1, pt: 1.5, '&:last-child': { pb: 1 } }}>
              <Stack direction="row" spacing={1} sx={{
                alignItems: "center"
              }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 600 }} noWrap>
                    {v.venue_name}
                  </Typography>
                </Box>
                <FollowButton
                  status={statusFor(v.owner_user_id)}
                  disabled={v.owner_user_id === meId}
                  loading={pendingUserId === v.owner_user_id}
                  onToggle={() => onToggleFollow(v.owner_user_id)}
                />
              </Stack>
              {v.venue_type && (
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  {v.venue_type}
                </Typography>
              )}
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}
              >
                {(v.city || v.state) && (
                  <Stack direction="row" spacing={0.5} sx={{
                    alignItems: "center"
                  }}>
                    <LocationOnIcon fontSize="inherit" />
                    <span>{[v.locality, v.city, v.state].filter(Boolean).join(', ')}</span>
                  </Stack>
                )}
                {v.capacity != null && (
                  <Stack direction="row" spacing={0.5} sx={{
                    alignItems: "center"
                  }}>
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
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    display: "block",
                    mt: 0.5
                  }}>
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
              <DuncitButton component={RouterLink} to={venueUrl(v.id)} fullWidth variant="contained" sx={{ mt: 1.5 }}>
                View venue
              </DuncitButton>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
