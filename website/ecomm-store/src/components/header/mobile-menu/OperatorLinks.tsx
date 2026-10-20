import { List, ListItem, ListItemButton, ListItemText } from '@mui/material';

import { useStoreSettings } from '../../../app/providers/StoreSettingsProvider';
import { isInternalLink } from '../../../lib/paths';
import { NewTabHint } from '../../footer/NewTabHint';
import { MenuLink } from './MenuSections';

const testIdOf = (label: string): string => label.toLowerCase().replaceAll(/\W+/g, '-');

/** The header links the operator set (Settings), when it set any: store paths close the drawer, the rest open a new tab. */
export function OperatorLinks({ onNavigate }: Readonly<{ onNavigate: () => void }>) {
  const { nav_links: links } = useStoreSettings();
  if (links.length === 0) return null;
  return (
    <List disablePadding data-testid="mobile-menu-operator-links">
      {links.map((link) =>
        isInternalLink(link.link) ? (
          <MenuLink key={`${link.label}-${link.link}`} to={link.link} label={link.label} onNavigate={onNavigate} testId={`mobile-menu-link-${testIdOf(link.label)}`} />
        ) : (
          <ListItem key={`${link.label}-${link.link}`} disablePadding>
            <ListItemButton component="a" href={link.link} target="_blank" rel="noopener noreferrer" onClick={onNavigate} sx={{ minHeight: 44 }} data-testid={`mobile-menu-link-${testIdOf(link.label)}`}>
              <ListItemText
                primary={
                  <>
                    {link.label}
                    <NewTabHint />
                  </>
                }
              />
            </ListItemButton>
          </ListItem>
        ),
      )}
    </List>
  );
}
