import { Box, Container, Divider, Typography } from '@mui/material';

import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';
import { NewsletterForm } from '../newsletter-form';
import { FooterBottom } from './FooterBottom';
import { FooterBrand } from './FooterBrand';
import { AboutColumn, HelpColumn, ShopColumn } from './FooterLinkColumns';
import { FooterColumn } from './FooterColumn';

export { POLICY_LINKS } from './policyLinks';

const GRID_COLUMNS = {
  xs: 'minmax(0, 1fr)',
  sm: 'repeat(2, minmax(0, 1fr))',
  md: 'minmax(0, 1.3fr) repeat(3, minmax(0, 1fr)) minmax(0, 1.4fr)',
} as const;

/** Footer links read as quiet text until hovered or focused. */
const FOOTER_SX = {
  bgcolor: T.surface,
  borderTop: 1,
  borderColor: T.border,
  mt: 8,
  // On a phone this is the room the floating bottom nav sits in, so it never covers the last links.
  pb: { xs: 12, md: 0 },
  '& a.MuiLink-root': { color: 'text.secondary', fontWeight: 600, width: 'fit-content', '&:hover': { color: T.ink } },
} as const;

/**
 * The brand column, Shop, Help & Support, About and the newsletter; then the
 * copyright, accessibility and cookie controls and the payment marks.
 */
export function Footer() {
  const { t } = useStoreT();
  return (
    <Box component="footer" sx={FOOTER_SX}>
      <Container maxWidth={false} sx={{ maxWidth: T.contentMax, py: { xs: 5, md: 7 } }}>
        <Box sx={{ display: 'grid', columnGap: 4, rowGap: 5, gridTemplateColumns: GRID_COLUMNS }}>
          <FooterBrand />
          <ShopColumn />
          <HelpColumn />
          <AboutColumn />
          <FooterColumn title={t('ecommStore.footer.newsletter')}>
            <Typography variant="body2" color="text.secondary">
              {t('ecommStore.newsletter.pitch')}
            </Typography>
            <NewsletterForm source="WEBSITE_FOOTER" />
          </FooterColumn>
        </Box>
        <Divider sx={{ my: 4 }} />
        <FooterBottom />
      </Container>
    </Box>
  );
}
