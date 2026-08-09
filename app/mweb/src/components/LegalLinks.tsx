import { Stack, Link, Typography } from '@mui/material';
import { useTranslation } from '../i18n/useTranslation';

const TERMS_URL = 'https://duncit.com/terms';
const PRIVACY_URL = 'https://duncit.com/privacy/policy';

export default function LegalLinks({ prefix }: Readonly<{ prefix?: string }>) {
  const { t } = useTranslation();
  // The lead-in is passed in already translated because it names the action of
  // the screen it sits on ("By signing in," / "By signing up,").
  const lead = prefix ?? t('mweb.auth.legalContinue');

  return (
    <Typography
      variant="caption"
      color="text.secondary"
      align="center"
      sx={{ display: 'block', mt: 1.5, lineHeight: 1.5 }}
    >
      {lead} {t('mweb.auth.legalAgree')}{' '}
      <Link href={TERMS_URL} target="_blank" rel="noopener" underline="hover">
        {t('mweb.auth.terms')}
      </Link>{' '}
      {t('mweb.auth.legalAnd')}{' '}
      <Link href={PRIVACY_URL} target="_blank" rel="noopener" underline="hover">
        {t('mweb.auth.privacy')}
      </Link>
      .
    </Typography>
  );
}

export function LegalLinkRow() {
  const { t } = useTranslation();

  return (
    <Stack
      direction="row"
      spacing={2}
      justifyContent="center"
      sx={{ mt: 1, flexWrap: 'wrap' }}
    >
      <Link
        href={TERMS_URL}
        target="_blank"
        rel="noopener"
        underline="hover"
        variant="caption"
      >
        {t('mweb.auth.terms')}
      </Link>
      <Link
        href={PRIVACY_URL}
        target="_blank"
        rel="noopener"
        underline="hover"
        variant="caption"
      >
        {t('mweb.auth.privacy')}
      </Link>
    </Stack>
  );
}
