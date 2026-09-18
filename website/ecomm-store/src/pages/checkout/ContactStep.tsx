import { Alert, Divider, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

import { useStoreSession } from '../../app/providers/SessionProvider';
import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { useStoreT } from '../../i18n';
import { ContactForm } from './contact-form';
import type { CheckoutControls } from './useCheckoutState';

/** Step 1: sign in, or — when the store allows it — carry on as a guest. */
export function ContactStep({ controls }: Readonly<{ controls: CheckoutControls }>) {
  const { t } = useStoreT();
  const { signedIn, me, openSignIn } = useStoreSession();
  const { guest_checkout_enabled: guestAllowed } = useStoreSettings();
  const initial = controls.state.contact ?? {
    name: me ? [me.first_name, me.last_name].filter(Boolean).join(' ') : '',
    email: me?.email ?? '',
    phone: me?.phone_number ?? '',
  };
  if (signedIn) return <ContactForm initial={initial} onDone={controls.setContact} />;
  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <Typography>{t('ecommStore.checkout.signInPitch')}</Typography>
        <DuncitButton variant="contained" onClick={openSignIn} sx={{ alignSelf: 'flex-start' }}>
          {t('ecommStore.auth.signIn')}
        </DuncitButton>
      </Stack>
      {guestAllowed ? (
        <>
          <Divider>{t('ecommStore.auth.or')}</Divider>
          <Typography variant="h4" component="h3">
            {t('ecommStore.checkout.asGuest')}
          </Typography>
          <ContactForm initial={initial} onDone={controls.setContact} />
        </>
      ) : (
        <Alert severity="info">{t('ecommStore.checkout.signInRequired')}</Alert>
      )}
    </Stack>
  );
}
