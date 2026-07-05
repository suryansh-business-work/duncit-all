import GroupsIcon from '@mui/icons-material/Groups';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CheckIcon from '@mui/icons-material/Check';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import { Avatar, Box, Button, Chip, Stack, Typography } from '@mui/material';

interface Props {
  club: any;
  featureUrl?: string;
  podCount: number;
  venueCount: number;
  followersCount: number;
  membersCount: number;
  categoryName?: string;
  superCategoryName?: string;
  following: boolean;
  chatUrl?: string | null;
  onToggleFollow: () => void;
}

function Stat({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <Box sx={{ flex: 1, textAlign: 'left' }}>
      <Typography display="block" sx={{ fontWeight: 950, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
        {label}
      </Typography>
    </Box>
  );
}

export default function ClubSummaryHeader({
  club,
  featureUrl,
  podCount,
  venueCount,
  followersCount,
  membersCount,
  categoryName,
  superCategoryName,
  following,
  chatUrl,
  onToggleFollow,
}: Readonly<Props>) {
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
        <Avatar
          src={featureUrl}
          variant="rounded"
          sx={{ width: 72, height: 72, borderRadius: 4, bgcolor: 'primary.main' }}
        >
          <GroupsIcon />
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 950, lineHeight: 1.1 }} noWrap>
            {club.club_name}
          </Typography>
          {(superCategoryName || categoryName) && (
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
              {superCategoryName && (
                <Chip label={superCategoryName} size="small" variant="outlined" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
              )}
              {categoryName && (
                <Chip label={categoryName} size="small" color="primary" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
              )}
            </Stack>
          )}
          {club.club_description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mt: 0.5 }}
            >
              {club.club_description}
            </Typography>
          )}
        </Box>
      </Stack>
      <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
        <Stat label="followers" value={followersCount} />
        <Stat label="members" value={membersCount} />
        <Stat label="pods" value={podCount} />
        <Stat label="moments" value={momentsCount} />
        <Stat label="venues" value={venueCount} />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button
          fullWidth
          variant={following ? 'outlined' : 'contained'}
          startIcon={following ? <CheckIcon /> : <PersonAddAltIcon />}
          onClick={onToggleFollow}
          sx={{ borderRadius: 3, fontWeight: 900 }}
        >
          {following ? 'Following' : 'Follow Club'}
        </Button>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<ChatBubbleOutlineIcon />}
          component={chatUrl ? 'a' : 'button'}
          href={chatUrl || undefined}
          target={chatUrl ? '_blank' : undefined}
          rel={chatUrl ? 'noreferrer' : undefined}
          disabled={!chatUrl}
          sx={{ borderRadius: 3, fontWeight: 900 }}
        >
          Chat
        </Button>
      </Stack>
    </Box>
  );
}
