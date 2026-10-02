import { Box, Link, Stack, Typography } from '@mui/material';
import type { SessionTranslate } from '../i18n';
import type { LoginScreenConfig } from './login.types';

const DEFAULT_PRIVACY = 'https://duncit.com/policy/privacy-policy';
const DEFAULT_TERMS = 'https://duncit.com/policy/terms-and-conditions';
const DEFAULT_CONTACT = 'admin@duncit.com';

const legalLink = { fontSize: 12, fontWeight: 600 } as const;

interface LoginLegalLinksProps {
  config: LoginScreenConfig;
  t: SessionTranslate;
  onOpenPortals: () => void;
}

/** Privacy, terms, the other-portals switch and the support address under the form. */
export default function LoginLegalLinks({ config, t, onOpenPortals }: Readonly<LoginLegalLinksProps>) {
  const contact = config.contactEmail ?? DEFAULT_CONTACT;
  return (
    <>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          flexWrap: "wrap",
          mt: 2.5
        }}>
        <Link
          href={config.privacyUrl ?? DEFAULT_PRIVACY}
          target="_blank"
          rel="noopener"
          underline="none"
          sx={[{
            color: "text.secondary"
          }, legalLink]}>
          {t('session.login.privacyPolicy')}
        </Link>
        <Box aria-hidden sx={{ color: 'text.disabled' }}>·</Box>
        <Link
          href={config.termsUrl ?? DEFAULT_TERMS}
          target="_blank"
          rel="noopener"
          underline="none"
          sx={[{
            color: "text.secondary"
          }, legalLink]}>
          {t('session.login.termsOfUse')}
        </Link>
        <Box aria-hidden sx={{ color: 'text.disabled' }}>·</Box>
        <Link component="button" type="button" onClick={onOpenPortals} underline="none" color="primary" sx={legalLink}>
          {t('session.login.otherPortals')}
        </Link>
      </Stack>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          display: 'block',
          mt: 1
        }}>
        {t('session.login.supportPrefix')}{' '}
        <Link href={`mailto:${contact}`} underline="none" color="primary" sx={{
          fontWeight: 700
        }}>
          {contact}
        </Link>{' '}
        {t('session.login.supportSuffix')}
      </Typography>
    </>
  );
}
