import GroupsIcon from '@mui/icons-material/Groups';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

interface Props {
  count: number;
}

/** Total Members — the club's followers count (single source of truth). */
export default function ClubTotalMembersSection({ count }: Readonly<Props>) {
  return (
    <Stack
      data-testid="club-total-members"
      direction="row"
      spacing={1.5}
      alignItems="center"
      sx={{
        p: 1.75,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          flex: '0 0 auto',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
        }}
      >
        <GroupsIcon sx={{ color: 'primary.main' }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 900, fontSize: 16, lineHeight: 1.2 }}>
          Total Members
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12.5 }}>
          People following this club
        </Typography>
      </Box>
      <Typography sx={{ fontWeight: 900, fontSize: 22, color: 'primary.main' }}>
        {count}
      </Typography>
    </Stack>
  );
}
