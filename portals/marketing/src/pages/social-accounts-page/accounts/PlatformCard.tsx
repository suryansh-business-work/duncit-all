import { Alert, Card, CardContent, Divider, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import { useTranslation } from '@duncit/app-settings';
import PlatformIcon from '../PlatformIcon';
import { PROVIDER_ADDS, PROVIDER_LABEL } from '../copy';
import type { SocialAccount, SocialApp, SocialPlatform, SocialProvider } from '../queries';
import AccountRow, { type AccountApp } from './AccountRow';
import ConnectButton, { type ConnectOption } from './ConnectButton';

interface Props {
  platform: SocialPlatform;
  /** Every app that can bring this platform's accounts, its own provider's first. */
  options: ConnectOption[];
  /** Each provider's apps, so a row can name the app its account came through. */
  appsByProvider: ReadonlyMap<SocialProvider, SocialApp[]>;
  accounts: SocialAccount[];
  /** Where this platform's app is set up — the Settings › Integrations tab for it. */
  settingsTo?: string;
  onConnect: (provider: SocialProvider, appId?: string | null, reconnect?: boolean) => Promise<void>;
  onSync: (account: SocialAccount) => Promise<void>;
  onSetOwner: (account: SocialAccount) => void;
  onDisconnect: (account: SocialAccount) => void;
}

/**
 * The app an account row names: only once its provider has more than one app,
 * or when the account's own app is gone (then it must be brought back through
 * another). An account with no app was connected through the default.
 */
function appOf(account: SocialAccount, apps: SocialApp[]): AccountApp | null {
  const app = account.app_id ? apps.find((candidate) => candidate.id === account.app_id) : apps.find((candidate) => candidate.is_default);
  if (account.app_id && !app) return { name: '', missing: true };
  return apps.length > 1 && app ? { name: app.name, missing: false } : null;
}

/**
 * One platform — what an account IS, whichever app brought it — with every
 * account of it, however many: a second Instagram account is a second row,
 * so "Connect another" is always there once one is. Until no app can bring
 * the platform there is nothing to press: the card says where that is set up.
 */
export default function PlatformCard({ platform, options, appsByProvider, accounts, settingsTo, onConnect, onSync, onSetOwner, onDisconnect }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = `social-platform-title-${platform.toLowerCase()}`;
  const slug = platform.toLowerCase();
  const configured = options.length > 0;
  const connectLabel = accounts.length > 0 ? t('marketing.social.connectAnother') : t('marketing.social.connect');

  return (
    <Card variant="outlined" component="section" aria-labelledby={titleId} data-testid={`social-provider-${slug}`}>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            <PlatformIcon platform={platform} sx={{ color: 'text.secondary' }} />
            <div>
              <Typography id={titleId} variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
                {t(PROVIDER_LABEL[platform])}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t(PROVIDER_ADDS[platform])}
              </Typography>
            </div>
          </Stack>
          {configured && <ConnectButton platform={platform} options={options} label={connectLabel} primary={accounts.length === 0} onConnect={onConnect} />}
        </Stack>

        {!configured && (
          <Alert severity="info" variant="outlined" sx={{ mt: 2 }} data-testid={`social-not-set-up-${slug}`}>
            {t('marketing.social.notSetUp')}
            {settingsTo && (
              <>
                {' '}
                <Link component={RouterLink} to={settingsTo} data-testid={`social-open-settings-${slug}`}>
                  {t('marketing.social.openSettings')}
                </Link>
              </>
            )}
          </Alert>
        )}

        {configured && accounts.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }} data-testid={`social-no-account-${slug}`}>
            {t('marketing.social.noAccountYet')}
          </Typography>
        )}

        {accounts.length > 0 && (
          <Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>
            {accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                app={appOf(account, appsByProvider.get(account.provider) ?? [])}
                onSync={onSync}
                // A reconnect goes through the account's own app (its tokens only work with that app) and asks again for declined permissions.
                onReconnect={() => onConnect(account.provider, account.app_id, true)}
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
