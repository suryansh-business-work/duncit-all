import { Stack, Link, Typography } from '@mui/material';

const TERMS_URL = 'https://duncit.com/terms';
const PRIVACY_URL = 'https://duncit.com/privacy/policy';

export default function LegalLinks({ prefix }: { prefix?: string }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      align="center"
      sx={{ display: 'block', mt: 1.5, lineHeight: 1.5 }}
    >
      {prefix ? `${prefix} ` : ''}you agree to our{' '}
      <Link href={TERMS_URL} target="_blank" rel="noopener" underline="hover">
        Terms &amp; Conditions
      </Link>{' '}
      and{' '}
      <Link href={PRIVACY_URL} target="_blank" rel="noopener" underline="hover">
        Privacy Policy
      </Link>
      .
    </Typography>
  );
}

export function LegalLinkRow() {
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
        Terms &amp; Conditions
      </Link>
      <Link
        href={PRIVACY_URL}
        target="_blank"
        rel="noopener"
        underline="hover"
        variant="caption"
      >
        Privacy Policy
      </Link>
    </Stack>
  );
}
