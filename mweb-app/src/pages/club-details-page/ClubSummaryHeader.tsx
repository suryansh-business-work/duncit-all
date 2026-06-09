import GroupsIcon from '@mui/icons-material/Groups';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { Avatar, Box, Button, Stack, Typography } from '@mui/material';

interface Props {
  club: any;
  featureUrl?: string;
  podCount: number;
  venueCount: number;
  following: boolean;
  chatUrl?: string | null;
  onToggleFollow: () => void;
}

function Stat({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <Box sx={{ flex: 1, textAlign: 'center' }}>
      <Typography display="block" sx={{ fontWeight: 950, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
        {label}
      </Typography>
    </Box>
  );
}

export default function ClubSummaryHeader({ club, featureUrl, podCount, venueCount, following, chatUrl, onToggleFollow }: Readonly<Props>) {
  const momentsCount = club.club_moments?.length ?? 0;

  return (
    <Box
      sx={{
        mt: -8,
        mx: { xs: 1, sm: 2 },
        p: 2,
        position: 'relative',
        zIndex: 2,
        borderRadius: 4,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        boxShadow: '0 24px 54px rgba(9,7,18,0.34)',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar src={featureUrl} variant="rounded" sx={{ width: 72, height: 72, borderRadius: 4, bgcolor: 'primary.main' }}>
          <GroupsIcon />
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 950, lineHeight: 1.1 }} noWrap>
            {club.club_name}
          </Typography>
          {club.club_description && (
            <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {club.club_description}
            </Typography>
          )}
        </Box>
      </Stack>
      <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
        <Stat label="pods" value={podCount} />
        <Stat label="moments" value={momentsCount} />
        <Stat label="venues" value={venueCount} />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button fullWidth variant="contained" startIcon={following ? <FavoriteIcon /> : <FavoriteBorderIcon />} onClick={onToggleFollow} sx={{ borderRadius: 3, fontWeight: 900 }}>
          {following ? 'Following' : 'Join Club'}
        </Button>
        <Button fullWidth variant="outlined" startIcon={<ChatBubbleOutlineIcon />} component={chatUrl ? 'a' : 'button'} href={chatUrl || undefined} target={chatUrl ? '_blank' : undefined} rel={chatUrl ? 'noreferrer' : undefined} disabled={!chatUrl} sx={{ borderRadius: 3, fontWeight: 900 }}>
          Chat
        </Button>
      </Stack>
    </Box>
  );
}