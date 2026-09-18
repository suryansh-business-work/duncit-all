import { Avatar, Paper, Stack, Typography } from '@mui/material';

import { useStoreSession } from '../../../app/providers/SessionProvider';
import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T } from '../../../theme/tokens';
import { AccountLayout } from '../AccountLayout';
import { PetProfileForm } from './pet-profile-form';

/** /account/pet — the pet the home page greets ("For Buddy"). */
export function PetProfilePage() {
  const { t } = useStoreT();
  const { me } = useStoreSession();
  const pet = me?.pet_profile;
  return (
    <AccountLayout title={t('ecommStore.account.petProfile')}>
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Avatar src={pet?.photo_url ?? undefined} alt="" sx={{ width: 64, height: 64, bgcolor: T.brandTint }} />
            <Typography color="text.secondary">{t('ecommStore.pet.intro')}</Typography>
          </Stack>
          <PetProfileForm pet={pet} />
        </Stack>
      </Paper>
    </AccountLayout>
  );
}
