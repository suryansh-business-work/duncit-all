import { Avatar, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

interface FollowPersonCardProps {
  person: any;
  kind: 'HOST' | 'FRIEND';
}

export default function FollowPersonCard({ person, kind }: Readonly<FollowPersonCardProps>) {
  const name = person.full_name || [person.first_name, person.last_name].filter(Boolean).join(' ') || 'Duncit member';
  const photo = person.passport_photo_url || person.profile_photo;
  const meta = person.full_address || person.email || (kind === 'HOST' ? 'Host' : 'Friend');

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 4,
        bgcolor: 'background.paper',
        background: (theme) => `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Avatar src={photo || undefined} sx={{ width: 52, height: 52, bgcolor: 'primary.main' }}>
            <PersonOutlineIcon />
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }} noWrap>
              {name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {meta}
            </Typography>
            {person.tags?.length > 0 && (
              <Stack direction="row" spacing={0.5} sx={{ mt: 0.65, overflow: 'hidden' }}>
                {person.tags.slice(0, 2).map((tag: string) => (
                  <Chip key={tag} label={tag} size="small" sx={{ height: 22, fontWeight: 800 }} />
                ))}
              </Stack>
            )}
          </Box>
          <Chip label={kind === 'HOST' ? 'Host' : 'Friend'} size="small" color="primary" sx={{ fontWeight: 900 }} />
        </Stack>
      </CardContent>
    </Card>
  );
}