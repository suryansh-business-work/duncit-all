import { Link as RouterLink } from 'react-router';
import { Link } from '@mui/material';

import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { EARNWITH_URL } from '../../config/env';
import { isInternalLink, paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { useNavigationData } from '../header/navigation';
import { SmartLink } from '../SmartLink';
import { FooterColumn } from './FooterColumn';
import { NewTabHint } from './NewTabHint';
import { POLICY_LINKS } from './policyLinks';

/** How many aisles the Shop column lists. */
const MAX_AISLES = 8;

/** The menu aisles, then Deals and Brands. */
export function ShopColumn() {
  const { t } = useStoreT();
  const { categories } = useNavigationData();
  const aisles = categories.filter((c) => c.show_in_menu).slice(0, MAX_AISLES);
  return (
    <FooterColumn title={t('ecommStore.footer.shop')}>
      {aisles.map((c) => (
        <Link key={c.id} component={RouterLink} to={paths.category(c.slug)}>
          {c.name}
        </Link>
      ))}
      <Link component={RouterLink} to={paths.deals}>
        {t('ecommStore.menu.deals')}
      </Link>
      <Link component={RouterLink} to={paths.brands}>
        {t('ecommStore.menu.brands')}
      </Link>
    </FooterColumn>
  );
}

/** Track an order, contact, the policies (About lives in its own column) and the operator's pages. */
export function HelpColumn() {
  const { t } = useStoreT();
  const { pages } = useNavigationData();
  return (
    <FooterColumn title={t('ecommStore.footer.helpSupport')}>
      <Link component={RouterLink} to={paths.track}>
        {t('ecommStore.menu.trackOrder')}
      </Link>
      <Link component={RouterLink} to={paths.contact}>
        {t('ecommStore.footer.contactUs')}
      </Link>
      {POLICY_LINKS.filter((p) => p.slug !== 'about').map((p) => (
        <Link key={p.slug} component={RouterLink} to={paths.page(p.slug)}>
          {t(p.labelKey)}
        </Link>
      ))}
      {pages.map((page) => (
        <Link key={page.id} component={RouterLink} to={paths.page(page.slug)} data-testid={`footer-page-${page.id}`}>
          {page.title}
        </Link>
      ))}
    </FooterColumn>
  );
}

/** About the store, how to reach it, Earn with Duncit, then the operator's extra links (Settings). */
export function AboutColumn() {
  const { t } = useStoreT();
  const { support_email: email, support_phone: phone, footer_links: extra } = useStoreSettings();
  return (
    <FooterColumn title={t('ecommStore.footer.about')}>
      <Link component={RouterLink} to={paths.page('about')}>
        {t('ecommStore.pages.about')}
      </Link>
      {email ? <Link href={`mailto:${email}`}>{email}</Link> : null}
      {phone ? <Link href={`tel:${phone}`}>{phone}</Link> : null}
      <Link href={EARNWITH_URL} target="_blank" rel="noopener noreferrer" data-testid="footer-earn">
        {t('ecommStore.menu.earnWith')}
        <NewTabHint />
      </Link>
      {extra.map((link) => (
        <SmartLink key={`${link.label}-${link.link}`} to={link.link}>
          {link.label}
          {isInternalLink(link.link) ? null : <NewTabHint />}
        </SmartLink>
      ))}
    </FooterColumn>
  );
}
