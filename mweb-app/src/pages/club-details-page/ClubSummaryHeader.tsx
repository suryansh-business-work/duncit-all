import GroupsIcon from '@mui/icons-material/Groups';
import { Avatar, Box, Stack, Typography } from '@mui/material';

interface Props {
  club: any;
  featureUrl?: string;
  podCount: number;
  venueCount: number;
}

export default function ClubSummaryHeader({ club, featureUrl, podCount, venueCount }: Props) {
  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <Avatar src={featureUrl} variant="rounded" sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
        <GroupsIcon />
      </Avatar>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h4" fontWeight={700}>{club.club_name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {podCount} active pods {venueCount > 0 ? `\u00b7 ${venueCount} venues` : ''}
        </Typography>
      </Box>
    </Stack>
  );
}