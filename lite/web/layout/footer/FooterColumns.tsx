import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Link, Stack, Typography } from '@mui/material';
import { useWebT } from '../../../shared/i18n';
import { useLiteSettings } from '../../app/providers/LiteSettingsProvider';
import { LITE_POLICIES, type LitePolicyLink } from '../../graphql/policies';
import { paths } from '../../lib/paths';

const FOOT_LINK = {
  color: 'text.secondary',
  fontWeight: 600,
  fontSize: '0.95rem',
  width: 'fit-content',
  transition: 'color 150ms, transform 150ms',
  '&:hover': { color: 'text.primary', transform: 'translateX(2px)' },
} as const;

interface Column {
  key: string;
  title: string;
  links: { label: string; to?: string; href?: string; testId: string }[];
}

/** Explore, Host, Help and Legal (the console's live policies): where a visitor goes next (inside the footer's navigation landmark). */
export function FooterColumns() {
  const { t } = useWebT();
  const { support_email: supportEmail } = useLiteSettings();
  // Read once and cached: every page draws the footer.
  const { data } = useQuery<{ litePolicies: LitePolicyLink[] }>(LITE_POLICIES, { fetchPolicy: 'cache-first' });
  const policies = data?.litePolicies ?? [];
  const columns: Column[] = [
    {
      key: 'explore',
      title: t('liteWeb.footer.explore'),
      links: [
        { label: t('liteWeb.nav.discover'), to: paths.discover, testId: 'footer-discover' },
        { label: t('liteWeb.nav.pricing'), to: paths.pricing, testId: 'footer-pricing' },
      ],
    },
    {
      key: 'host',
      title: t('liteWeb.footer.host'),
      links: [
        { label: t('liteWeb.footer.createEvent'), to: paths.create, testId: 'footer-create' },
        { label: t('liteWeb.footer.yourCalendars'), to: paths.calendars, testId: 'footer-calendars' },
      ],
    },
    {
      key: 'help',
      title: t('liteWeb.footer.help'),
      links: supportEmail ? [{ label: t('liteWeb.footer.help'), href: `mailto:${supportEmail}`, testId: 'footer-support' }] : [],
    },
    {
      key: 'legal',
      title: t('liteWeb.footer.legal'),
      links: policies.map((policy) => ({ label: policy.title, to: paths.legal(policy.slug), testId: `footer-policy-${policy.slug}` })),
    },
  ];
  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' } }}>
      {columns
        .filter((column) => column.links.length > 0)
        .map((column) => (
          <Stack key={column.key} spacing={1.25}>
            <Typography component="h2" variant="overline" color="text.primary" sx={{ fontWeight: 800, letterSpacing: '0.08em' }}>
              {column.title}
            </Typography>
            {column.links.map((link) =>
              link.to ? (
                <Link key={link.testId} component={RouterLink} to={link.to} underline="none" sx={FOOT_LINK} data-testid={link.testId}>
                  {link.label}
                </Link>
              ) : (
                <Link key={link.testId} href={link.href} underline="none" sx={FOOT_LINK} data-testid={link.testId}>
                  {link.label}
                </Link>
              ),
            )}
          </Stack>
        ))}
    </Box>
  );
}
