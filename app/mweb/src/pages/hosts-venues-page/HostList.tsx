import type { FollowStatus } from '@duncit/utils';
import {
  Avatar,
  Box,
  Card,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import EmptyState from '../../components/EmptyState';
import FollowButton from '../../components/FollowButton';

interface Host {
  id: string;
  user_id: string;
  full_name: string;
  email?: string | null;
  passport_photo_url?: string | null;
  full_address?: string | null;
  tags?: string[] | null;
}

interface Props {
  hosts: Host[];
  meId?: string;
  statusFor: (userId: string) => FollowStatus;
  pendingUserId: string | null;
  onToggleFollow: (userId: string) => void;
}

export default function HostList({ hosts, meId, statusFor, pendingUserId, onToggleFollow }: Readonly<Props>) {
  if (!hosts.length) {
    return <EmptyState icon={<PersonOutlineIcon />} title="No approved hosts yet — be the first to apply!" />;
  }

  return (
    <Grid container spacing={1.5}>
      {hosts.map((h) => (
        <Grid
          key={h.id}
          size={{
            xs: 12,
            sm: 6
          }}>
          <Card sx={{ height: '100%', p: 2 }}>
            <Stack direction="row" spacing={1.5} sx={{
              alignItems: "center"
            }}>
              <Avatar
                src={h.passport_photo_url || undefined}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: 'action.hover',
                  color: 'secondary.main',
                  '& img': { objectFit: 'cover' },
                }}
                slotProps={{
                  img: {
                    referrerPolicy: 'no-referrer',
                    onError: (e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    },
                  }
                }}
              >
                <PersonOutlineIcon />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '1rem', fontWeight: 600 }} noWrap>
                  {h.full_name}
                </Typography>
                {h.full_address && (
                  <Typography variant="body2" noWrap sx={{
                    color: "text.secondary"
                  }}>
                    {h.full_address}
                  </Typography>
                )}
                {h.tags && h.tags.length > 0 && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                    {h.tags.slice(0, 3).map((tag) => <Chip key={tag} label={tag} size="small" sx={{ height: 24 }} />)}
                  </Stack>
                )}
              </Box>
              <FollowButton
                status={statusFor(h.user_id)}
                disabled={h.user_id === meId}
                loading={pendingUserId === h.user_id}
                onToggle={() => onToggleFollow(h.user_id)}
              />
            </Stack>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
