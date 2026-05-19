import { Avatar, Box, ButtonBase, Chip, Stack, Typography } from '@mui/material';
import { useRoleLabels } from '../../../hooks/useRoleLabels';

interface UserSummaryProps {
  me: any;
  roles: string[];
  onClick: () => void;
}

export default function UserSummary({ me, roles, onClick }: UserSummaryProps) {
  const { labelFor } = useRoleLabels();
  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Stack component={ButtonBase} onClick={onClick} direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', p: 1.35, borderRadius: 3, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}>
        <Avatar
          src={me?.profile_photo || undefined}
          sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 20 }}
        >
          {(me?.first_name?.[0] ?? me?.full_name?.[0] ?? 'U').toUpperCase()}
        </Avatar>
        <Box
          sx={{
            minWidth: 0,
            flex: 1,
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {me?.full_name ?? 'User'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {me?.email ?? '—'}
          </Typography>
          {roles.length > 0 && (
            <Stack
              direction="row"
              useFlexGap
              sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.75 }}
            >
              {roles.map((r) => (
                <Chip
                  key={r}
                  size="small"
                  label={labelFor(r)}
                  color={
                    ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'].includes(r)
                      ? 'primary'
                      : r === 'HOST' || r === 'VENUE_OWNER'
                        ? 'secondary'
                        : 'default'
                  }
                  variant={r === 'USER' ? 'outlined' : 'filled'}
                  sx={{ height: 22, fontSize: 11 }}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
