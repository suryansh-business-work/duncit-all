import { Link as RouterLink } from 'react-router';
import { List, ListItem, ListItemButton, ListItemText, ListSubheader } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

import { useStoreSession } from '../../../app/providers/SessionProvider';
import { useStoreSettings } from '../../../app/providers/StoreSettingsProvider';
import type { StoreNavigation, StorePageLink } from '../../../graphql/settings';
import { logFailure } from '../../../lib/log';
import { paths } from '../../../lib/paths';
import { useStoreT } from '../../../i18n';
import { POLICY_LINKS } from '../../footer';
import { ACCOUNT_LINKS } from '../AccountMenu';

interface MenuLinkProps {
  to: string;
  label: string;
  onNavigate: () => void;
  testId: string;
  /** A sub-aisle, drawn under its aisle. */
  indent?: boolean;
}

/** One row of the menu: a real link that closes the drawer as it goes. */
export function MenuLink({ to, label, onNavigate, testId, indent = false }: Readonly<MenuLinkProps>) {
  return (
    <ListItem disablePadding>
      <ListItemButton component={RouterLink} to={to} onClick={onNavigate} sx={{ minHeight: 44, pl: indent ? 4 : 2 }} data-testid={testId}>
        <ListItemText primary={label} />
      </ListItemButton>
    </ListItem>
  );
}

function Heading({ children }: Readonly<{ children: string }>) {
  return (
    <ListSubheader component="h3" disableSticky sx={{ lineHeight: '40px', fontWeight: 700 }}>
      {children}
    </ListSubheader>
  );
}

interface NavProps {
  nav: StoreNavigation;
  onNavigate: () => void;
}

/** All products, brands, Autoship when it is on, then the collections. */
export function ShopLinks({ nav, onNavigate }: Readonly<NavProps>) {
  const { t } = useStoreT();
  const { autoship_enabled: autoship } = useStoreSettings();
  return (
    <>
      <List disablePadding>
        <MenuLink to={paths.shop} label={t('ecommStore.menu.shopAll')} onNavigate={onNavigate} testId="mobile-menu-shop-all" />
        <MenuLink to={paths.brands} label={t('ecommStore.menu.brands')} onNavigate={onNavigate} testId="mobile-menu-brands" />
        {autoship ? <MenuLink to={paths.autoship} label={t('ecommStore.nav.autoship')} onNavigate={onNavigate} testId="mobile-menu-autoship" /> : null}
      </List>
      {nav.collections.length > 0 ? (
        <List disablePadding subheader={<Heading>{t('ecommStore.menu.collections')}</Heading>}>
          {nav.collections.map((c) => (
            <MenuLink key={c.id} to={paths.collection(c.slug)} label={c.name} onNavigate={onNavigate} testId={`mobile-menu-collection-${c.id}`} />
          ))}
        </List>
      ) : null}
    </>
  );
}

const keyTail = (key: string): string => key.slice(key.lastIndexOf('.') + 1);

/** Signed in: the account pages and sign out. Signed out: one button that opens sign-in. */
export function AccountSection({ onNavigate }: Readonly<{ onNavigate: () => void }>) {
  const { t } = useStoreT();
  const { signedIn, openSignIn, signOut } = useStoreSession();
  const heading = <Heading>{t('ecommStore.menu.account')}</Heading>;
  if (!signedIn) {
    return (
      <List disablePadding subheader={heading}>
        <ListItem>
          <DuncitButton
            variant="contained"
            fullWidth
            onClick={() => {
              onNavigate();
              openSignIn();
            }}
            data-testid="mobile-menu-sign-in"
          >
            {t('ecommStore.auth.signIn')}
          </DuncitButton>
        </ListItem>
      </List>
    );
  }
  return (
    <List disablePadding subheader={heading}>
      {ACCOUNT_LINKS.map((link) => (
        <MenuLink key={link.to} to={link.to} label={t(link.labelKey)} onNavigate={onNavigate} testId={`mobile-menu-account-${keyTail(link.labelKey)}`} />
      ))}
      <ListItem disablePadding>
        <ListItemButton
          onClick={() => {
            onNavigate();
            signOut().catch(logFailure('mobile-menu', 'signOut'));
          }}
          sx={{ minHeight: 44 }}
          data-testid="mobile-menu-sign-out"
        >
          <ListItemText primary={t('ecommStore.auth.signOut')} />
        </ListItemButton>
      </ListItem>
    </List>
  );
}

interface HelpSectionProps {
  pages: StorePageLink[];
  onNavigate: () => void;
}

/** Track an order, contact, the four built-in policies, and every page the operator wrote. */
export function HelpSection({ pages, onNavigate }: Readonly<HelpSectionProps>) {
  const { t } = useStoreT();
  return (
    <List disablePadding subheader={<Heading>{t('ecommStore.menu.help')}</Heading>}>
      <MenuLink to={paths.track} label={t('ecommStore.menu.trackOrder')} onNavigate={onNavigate} testId="mobile-menu-track" />
      <MenuLink to={paths.contact} label={t('ecommStore.footer.contactUs')} onNavigate={onNavigate} testId="mobile-menu-contact" />
      {POLICY_LINKS.map((p) => (
        <MenuLink key={p.slug} to={paths.page(p.slug)} label={t(p.labelKey)} onNavigate={onNavigate} testId={`mobile-menu-policy-${p.slug}`} />
      ))}
      {pages.map((page) => (
        <MenuLink key={page.id} to={paths.page(page.slug)} label={page.title} onNavigate={onNavigate} testId={`mobile-menu-page-${page.id}`} />
      ))}
    </List>
  );
}
