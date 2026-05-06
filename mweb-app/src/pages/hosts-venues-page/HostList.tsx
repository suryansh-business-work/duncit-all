import {
  Avatar,
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

interface Host {
  id: string;
  full_name: string;
  email?: string | null;
  passport_photo_url?: string | null;
  full_address?: string | null;
}

export default function HostList({ hosts }: { hosts: Host[] }) {
  if (!hosts.length) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            No approved hosts yet — be the first to apply!
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Grid container spacing={2}>
      {hosts.map((h) => (
        <Grid item xs={12} sm={6} key={h.id}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  src={h.passport_photo_url || undefined}
                  imgProps={{
                    referrerPolicy: 'no-referrer',
                    onError: (e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    },
                  }}
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: 'primary.light',
                    '& img': { objectFit: 'cover' },
                  }}
                >
                  <PersonOutlineIcon />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {h.full_name}
                  </Typography>
                  {h.full_address && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {h.full_address}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
