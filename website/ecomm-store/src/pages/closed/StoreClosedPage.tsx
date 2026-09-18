import { Container, Link, Stack, Typography } from '@mui/material';
import PetsRoundedIcon from '@mui/icons-material/PetsRounded';

import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { StoreLogo } from '../../components/StoreLogo';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';

/** Every route while the operator has the store switched off. */
export function StoreClosedPage() {
  const { t } = useStoreT();
  const s = useStoreSettings();
  usePageSeo(t('ecommStore.closed.title'));
  return (
    <Container component="main" maxWidth="sm" sx={{ py: 10 }}>
      <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center', bgcolor: T.brandTint, borderRadius: `${T.radius.card}px`, p: { xs: 3, md: 6 } }}>
        <StoreLogo height={56} />
        <PetsRoundedIcon sx={{ fontSize: 56, color: T.brand }} aria-hidden />
        <Typography variant="h1">{t('ecommStore.closed.title')}</Typography>
        <Typography color="text.secondary">{t('ecommStore.closed.body', { vars: { name: s.store_name } })}</Typography>
        {s.support_email ? (
          <Typography>
            {t('ecommStore.closed.contact')} <Link href={`mailto:${s.support_email}`}>{s.support_email}</Link>
          </Typography>
        ) : null}
      </Stack>
    </Container>
  );
}
