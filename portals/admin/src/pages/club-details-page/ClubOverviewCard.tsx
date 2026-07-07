import { Box, Button, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PeopleIcon from '@mui/icons-material/People';
import StorefrontIcon from '@mui/icons-material/Storefront';
import StarIcon from '@mui/icons-material/Star';
import PlaceIcon from '@mui/icons-material/Place';
import type { ClubDetail } from './types';

interface Props {
  club: ClubDetail;
  podCount: number;
}

function Stat({ icon, label, value }: Readonly<{ icon: React.ReactNode; label: string; value: React.ReactNode }>) {
  return (
    <Stack
      spacing={0.25}
      sx={{ flex: 1, minWidth: 120, p: 1.25, borderRadius: 2, bgcolor: 'action.hover' }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" color="text.secondary">
        {icon}
        <Typography variant="caption" fontWeight={700}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="h6" fontWeight={900}>
        {value}
      </Typography>
    </Stack>
  );
}

/** Left column: club story + reach stats + WhatsApp entry points. */
export default function ClubOverviewCard({ club, podCount }: Readonly<Props>) {
  const ratingLabel = club.ratings_count > 0 ? `${club.rating.toFixed(1)} (${club.ratings_count})` : 'No ratings';

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <GroupsIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={900}>
            Overview
          </Typography>
        </Stack>
        <Divider sx={{ mb: 1.5 }} />

        {club.club_description ? (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
            {club.club_description}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No description added yet.
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Stat icon={<PeopleIcon fontSize="small" />} label="Followers" value={club.followers_count} />
          <Stat icon={<StorefrontIcon fontSize="small" />} label="Venues" value={club.matched_venues_count} />
          <Stat icon={<GroupsIcon fontSize="small" />} label="Pods" value={podCount} />
          <Stat icon={<StarIcon fontSize="small" />} label="Rating" value={ratingLabel} />
        </Box>

        {club.locality && (
          <Stack direction="row" spacing={0.75} alignItems="center" color="text.secondary" sx={{ mb: 1.5 }}>
            <PlaceIcon fontSize="small" />
            <Typography variant="body2">{club.locality}</Typography>
          </Stack>
        )}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {club.club_whats_app_community_link && (
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<WhatsAppIcon />}
              href={club.club_whats_app_community_link}
              target="_blank"
              rel="noreferrer"
            >
              Community
            </Button>
          )}
          {club.club_whats_app_group_link && (
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<WhatsAppIcon />}
              href={club.club_whats_app_group_link}
              target="_blank"
              rel="noreferrer"
            >
              Group chat
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
