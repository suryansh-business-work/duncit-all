import { useId, useState } from 'react';
import { Chip, ListItemText, Menu, MenuItem } from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { SocialApp, SocialPlatform, SocialProvider } from '../queries';

/** One way to connect: an app of a provider that can bring this platform's accounts. */
export interface ConnectOption {
  provider: SocialProvider;
  app: SocialApp;
}

interface Props {
  platform: SocialPlatform;
  options: ConnectOption[];
  label: string;
  primary: boolean;
  onConnect: (provider: SocialProvider, appId: string) => Promise<void>;
}

/**
 * Connect, through one of the apps that can bring this platform's accounts.
 * With one it goes straight to the consent screen; with several (the Instagram
 * app, or the Meta app that brings a Page with its Instagram account; a second
 * Meta app for another brand) it first asks which, so the accounts come in
 * under that app and post and message through it.
 */
export default function ConnectButton({ platform, options, label, primary, onConnect }: Readonly<Props>) {
  const { t } = useTranslation();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const testId = `social-connect-${platform.toLowerCase()}`;
  const choose = options.length > 1;

  const pick = (option: ConnectOption) => {
    setAnchor(null);
    return onConnect(option.provider, option.app.id);
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
        onClick={(event) => (choose ? setAnchor(event.currentTarget) : pick(options[0]))}
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
          {options.map((option) => (
            <MenuItem key={`${option.provider}-${option.app.id}`} onClick={() => pick(option)} data-testid={`${testId}-app-${option.app.id}`}>
              <ListItemText primary={t('marketing.social.connectVia', { vars: { name: option.app.name } })} />
              {option.app.is_default && <Chip size="small" variant="outlined" label={t('marketing.social.defaultApp')} sx={{ ml: 1 }} />}
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
}
