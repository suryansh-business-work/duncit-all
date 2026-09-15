import { Stack, Link, Typography } from '@mui/material';
import { useTranslation } from '../i18n/useTranslation';
import { useBrandingAssets } from '../hooks/useBrandingAssets';

export default function LegalLinks({ prefix }: Readonly<{ prefix?: string }>) {
  const { t } = useTranslation();
  const { termsUrl, privacyUrl } = useBrandingAssets();
  // The lead-in is passed in already translated because it names the action of
  // the screen it sits on ("By signing in," / "By signing up,").
  const lead = prefix ?? t('mweb.auth.legalContinue');

  return (
    <Typography
      data-testid="legal-links"
      variant="caption"
      align="center"
      sx={{
        color: "text.secondary",
        display: 'block',
        mt: 1.5,
        lineHeight: 1.5
      }}>
      {lead} {t('mweb.auth.legalAgree')}{' '}
      <Link data-testid="legal-links-terms" href={termsUrl} target="_blank" rel="noopener" underline="hover">
        {t('mweb.auth.terms')}
      </Link>{' '}
      {t('mweb.auth.legalAnd')}{' '}
      <Link data-testid="legal-links-privacy" href={privacyUrl} target="_blank" rel="noopener" underline="hover">
        {t('mweb.auth.privacy')}
      </Link>.
          </Typography>
  );
}

export function LegalLinkRow() {
  const { t } = useTranslation();
  const { termsUrl, privacyUrl } = useBrandingAssets();

  return (
    <Stack
      data-testid="legal-link-row"
      direction="row"
      spacing={2}
      sx={{
        justifyContent: "center",
        mt: 1,
        flexWrap: 'wrap'
      }}>
      <Link
        data-testid="legal-link-row-terms"
        href={termsUrl}
        target="_blank"
        rel="noopener"
        underline="hover"
        variant="caption"
      >
        {t('mweb.auth.terms')}
      </Link>
      <Link
        data-testid="legal-link-row-privacy"
        href={privacyUrl}
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
