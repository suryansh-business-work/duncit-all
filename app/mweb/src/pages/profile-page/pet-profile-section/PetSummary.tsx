import { Avatar, Box, Stack, Typography } from '@mui/material';
import PetsIcon from '@mui/icons-material/Pets';
import { PetProfile } from './petQueries';

interface PetSummaryProps {
  pet?: PetProfile | null;
}

export default function PetSummary({ pet }: Readonly<PetSummaryProps>) {
  const hasPet = !!(pet && (pet.name || pet.species || pet.bio || pet.photo_url));
  if (!hasPet) {
    return (
      <Typography variant="body2" color="text.secondary">
        Tell other members about your pet — they may join your pet-friendly pods.
      </Typography>
    );
  }
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
      <Avatar
        src={pet?.photo_url || undefined}
        imgProps={{
          loading: 'lazy',
          referrerPolicy: 'no-referrer',
          onError: (e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          },
        }}
        sx={{
          width: 96,
          height: 96,
          bgcolor: 'primary.light',
          '& img': { objectFit: 'cover' },
        }}
      >
        <PetsIcon />
      </Avatar>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          {pet?.name ?? 'Unnamed pet'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {[pet?.species, pet?.breed, pet?.age != null && `${pet?.age} yrs`]
            .filter(Boolean)
            .join(' · ')}
        </Typography>
        {pet?.bio && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {pet.bio}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
