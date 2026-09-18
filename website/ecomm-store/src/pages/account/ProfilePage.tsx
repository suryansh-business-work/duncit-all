import { Avatar, Box, Stack, Typography } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { DuncitButton } from '@duncit/buttons';

import { useStoreSession } from '../../app/providers/SessionProvider';
import { MWEB_URL } from '../../config/env';
import { firstFilled } from '../../lib/text';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';
import { AccountLayout } from './AccountLayout';
import { AccountMenuList } from './AccountMenuList';

/** The profile card from the mock: avatar, name, "{pet}'s parent", and Edit profile. */
function ProfileCard() {
  const { t } = useStoreT();
  const { me } = useStoreSession();
  const name = firstFilled(me?.full_name, [me?.first_name, me?.last_name].filter(Boolean).join(' '));
  const pet = me?.pet_profile?.name;
  return (
    <Stack spacing={1} sx={{ alignItems: 'center', bgcolor: T.brandTint, borderRadius: `${T.radius.card}px`, p: 3, textAlign: 'center' }}>
      <Avatar src={me?.profile_photo ?? undefined} alt="" sx={{ width: 88, height: 88, border: 4, borderColor: T.surface }} />
      <Typography variant="h2" component="p">
        {name}
      </Typography>
      {pet ? <Typography color="text.secondary">{t('ecommStore.account.petParent', { vars: { pet } })}</Typography> : null}
      <DuncitButton
        href={`${MWEB_URL}/profile`}
        target="_blank"
        rel="noopener noreferrer"
        variant="contained"
        startIcon={<EditRoundedIcon />}
        sx={{ bgcolor: T.navBar, color: T.onBrand, '&:hover': { bgcolor: T.ink } }}
      >
        {t('ecommStore.account.editProfile')}
      </DuncitButton>
    </Stack>
  );
}

/** /account — the profile card, then every account page as a list row. */
export function ProfilePage() {
  const { t } = useStoreT();
  return (
    <AccountLayout title={t('ecommStore.account.title')} hideMenu>
      <Box sx={{ maxWidth: 640, mx: 'auto' }}>
        <Stack spacing={2}>
          <ProfileCard />
          <AccountMenuList />
        </Stack>
      </Box>
    </AccountLayout>
  );
}
