import { Link as RouterLink } from 'react-router';
import { Box, Container, Divider, Link, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';

import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { useNavigationData } from '../header/navigation';
import { NewsletterForm } from '../newsletter-form';
import { FooterColumn } from './FooterColumn';

const POLICY_LINKS = [
  { slug: 'shipping', labelKey: 'ecommStore.pages.shipping' },
  { slug: 'returns', labelKey: 'ecommStore.pages.returns' },
  { slug: 'terms', labelKey: 'ecommStore.pages.terms' },
  { slug: 'about', labelKey: 'ecommStore.pages.about' },
] as const;

function SupportColumn() {
  const { t } = useStoreT();
  const s = useStoreSettings();
  return (
    <FooterColumn title={t('ecommStore.footer.help')}>
      <Link component={RouterLink} to={paths.contact}>
        {t('ecommStore.footer.contactUs')}
      </Link>
      <Link component={RouterLink} to={paths.track}>
        {t('ecommStore.menu.trackOrder')}
      </Link>
      {s.support_email ? <Link href={`mailto:${s.support_email}`}>{s.support_email}</Link> : null}
      {s.support_phone ? <Link href={`tel:${s.support_phone}`}>{s.support_phone}</Link> : null}
    </FooterColumn>
  );
}

/**
 * Aisles, policies, support contacts, social links and the newsletter. On a
 * phone its bottom padding is the room the floating bottom nav sits in, so the
 * nav never covers the last links.
 */
export function Footer() {
  const { t } = useStoreT();
  const s = useStoreSettings();
  const { categories } = useNavigationData();
  const dates = useDateFormat();
  const aisles = categories.filter((c) => c.show_in_menu).slice(0, 8);
  return (
    <Box component="footer" sx={{ bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', mt: 6, pb: { xs: 12, md: 0 } }}>
      <Container maxWidth="xl" sx={{ py: 5 }}>
        <Box sx={{ display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
          <FooterColumn title={t('ecommStore.footer.shop')}>
            {aisles.map((c) => (
              <Link key={c.id} component={RouterLink} to={paths.category(c.slug)}>
                {c.name}
              </Link>
            ))}
            <Link component={RouterLink} to={paths.brands}>
              {t('ecommStore.menu.brands')}
            </Link>
          </FooterColumn>
          <FooterColumn title={t('ecommStore.footer.policies')}>
            {POLICY_LINKS.map((p) => (
              <Link key={p.slug} component={RouterLink} to={paths.page(p.slug)}>
                {t(p.labelKey)}
              </Link>
            ))}
          </FooterColumn>
          <SupportColumn />
          <FooterColumn title={t('ecommStore.footer.newsletter')}>
            <Typography variant="body2" color="text.secondary">
              {t('ecommStore.newsletter.pitch')}
            </Typography>
            <NewsletterForm source="WEBSITE_FOOTER" />
          </FooterColumn>
        </Box>
        <Divider sx={{ my: 3 }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {t('ecommStore.footer.copyright', { vars: { year: dates.now().getFullYear(), name: s.store_name } })}
          </Typography>
          <Stack direction="row" spacing={2} component="ul" aria-label={t('ecommStore.footer.social')} sx={{ listStyle: 'none', p: 0, m: 0 }}>
            {s.social_links.map((l) => (
              <Box component="li" key={l.url}>
                <Link href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.label}
                </Link>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
