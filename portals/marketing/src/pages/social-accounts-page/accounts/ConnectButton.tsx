import { useId, useState } from 'react';
import { Chip, ListItemText, Menu, MenuItem } from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { SocialApp, SocialProvider } from '../queries';

interface Props {
  provider: SocialProvider;
  apps: SocialApp[];
  label: string;
  primary: boolean;
  onConnect: (provider: SocialProvider, appId: string) => Promise<void>;
}

/**
 * Connect, through one of the network's apps. With one app it goes straight
 * to the consent screen; with several (a second Meta app for another brand's
 * Pages, say) it first asks which app, so the accounts come in under that app
 * and post and message through it.
 */
export default function ConnectButton({ provider, apps, label, primary, onConnect }: Readonly<Props>) {
  const { t } = useTranslation();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const testId = `social-connect-${provider.toLowerCase()}`;
  const choose = apps.length > 1;

  const pick = (appId: string) => {
    setAnchor(null);
    return onConnect(provider, appId);
  };

  return (
    <>
      <DuncitButton
        size="small"
        variant={primary ? 'contained' : 'outlined'}
        startIcon={<AddLinkIcon />}
        endIcon={choose ? <ArrowDropDownIcon /> : undefined}
        aria-haspopup={choose ? 'menu' : undefined}
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(event) => (choose ? setAnchor(event.currentTarget) : pick(apps[0].id))}
        data-testid={testId}
      >
        {label}
      </DuncitButton>
      {choose && (
        <Menu
          id={menuId}
          anchorEl={anchor}
          open={!!anchor}
          onClose={() => setAnchor(null)}
          slotProps={{ list: { 'aria-label': t('marketing.social.chooseApp') } }}
        >
          {apps.map((app) => (
            <MenuItem key={app.id} onClick={() => pick(app.id)} data-testid={`${testId}-app-${app.id}`}>
              <ListItemText primary={t('marketing.social.connectVia', { vars: { name: app.name } })} />
              {app.is_default && <Chip size="small" variant="outlined" label={t('marketing.social.defaultApp')} sx={{ ml: 1 }} />}
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
}
