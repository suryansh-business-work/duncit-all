import { Alert, Card, CardContent, Divider, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import { useTranslation } from '@duncit/app-settings';
import PlatformIcon from '../PlatformIcon';
import { PROVIDER_ADDS, PROVIDER_LABEL, PROVIDER_PLATFORMS } from '../copy';
import type { SocialAccount, SocialApp, SocialProvider } from '../queries';
import AccountRow, { type AccountApp } from './AccountRow';
import ConnectButton from './ConnectButton';

interface Props {
  provider: SocialProvider;
  configured: boolean;
  /** Every app the network can be connected through, the default first. */
  apps: SocialApp[];
  accounts: SocialAccount[];
  /** Where this network's app is set up — the Settings › Integrations tab for it. */
  settingsTo?: string;
  onConnect: (provider: SocialProvider, appId?: string | null) => Promise<void>;
  onSync: (account: SocialAccount) => Promise<void>;
  onSetOwner: (account: SocialAccount) => void;
  onDisconnect: (account: SocialAccount) => void;
}

/**
 * The app an account row names: only once the network has more than one app,
 * or when the account's own app is gone (then it must be brought back through
 * another). An account with no app was connected through the default.
 */
function appOf(account: SocialAccount, apps: SocialApp[]): AccountApp | null {
  const app = account.app_id ? apps.find((candidate) => candidate.id === account.app_id) : apps.find((candidate) => candidate.is_default);
  if (account.app_id && !app) return { name: '', missing: true };
  return apps.length > 1 && app ? { name: app.name, missing: false } : null;
}

/**
 * One network: what connecting it adds, and the accounts it already brought
 * in. Until its app is set up there is nothing to press — the card says where
 * that happens and links there, instead of offering a button that would fail.
 */
export default function ProviderCard({
  provider,
  configured,
  apps,
  accounts,
  settingsTo,
  onConnect,
  onSync,
  onSetOwner,
  onDisconnect,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = `social-provider-title-${provider.toLowerCase()}`;
  const connectLabel = accounts.length > 0 ? t('marketing.social.connectAnother') : t('marketing.social.connect');

  return (
    <Card variant="outlined" component="section" aria-labelledby={titleId} data-testid={`social-provider-${provider.toLowerCase()}`}>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Stack direction="row" spacing={0.5} sx={{ color: 'text.secondary' }}>
              {PROVIDER_PLATFORMS[provider].map((platform) => (
                <PlatformIcon key={platform} platform={platform} />
              ))}
            </Stack>
            <div>
              <Typography id={titleId} variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
                {t(PROVIDER_LABEL[provider])}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t(PROVIDER_ADDS[provider])}
              </Typography>
            </div>
          </Stack>
          {configured && apps.length > 0 && (
            <ConnectButton provider={provider} apps={apps} label={connectLabel} primary={accounts.length === 0} onConnect={onConnect} />
          )}
        </Stack>

        {configured ? null : (
          <Alert severity="info" variant="outlined" sx={{ mt: 2 }} data-testid={`social-not-set-up-${provider.toLowerCase()}`}>
            {t('marketing.social.notSetUp')}
            {settingsTo && (
              <>
                {' '}
                <Link component={RouterLink} to={settingsTo} data-testid={`social-open-settings-${provider.toLowerCase()}`}>
                  {t('marketing.social.openSettings')}
                </Link>
              </>
            )}
          </Alert>
        )}

        {configured && accounts.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>
            {t('marketing.social.noAccountYet')}
          </Typography>
        )}

        {accounts.length > 0 && (
          <Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>
            {accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                app={appOf(account, apps)}
                onSync={onSync}
                // A reconnect goes through the account's own app: its tokens only work with that app.
                onReconnect={() => onConnect(provider, account.app_id)}
                onSetOwner={onSetOwner}
                onDisconnect={onDisconnect}
              />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
