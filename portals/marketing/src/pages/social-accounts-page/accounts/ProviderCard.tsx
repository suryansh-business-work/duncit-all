import { Alert, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import PlatformIcon from '../PlatformIcon';
import { PROVIDER_ADDS, PROVIDER_LABEL, PROVIDER_PLATFORMS } from '../copy';
import type { SocialAccount, SocialProvider } from '../queries';
import AccountRow from './AccountRow';

interface Props {
  provider: SocialProvider;
  configured: boolean;
  accounts: SocialAccount[];
  onConnect: (provider: SocialProvider) => Promise<void>;
  onSync: (account: SocialAccount) => Promise<void>;
  onDisconnect: (account: SocialAccount) => void;
}

/**
 * One network: what connecting it adds, and the accounts it already brought
 * in. Until Tech has set its app up there is nothing to press — the card says
 * who can fix that and where, instead of offering a button that would fail.
 */
export default function ProviderCard({ provider, configured, accounts, onConnect, onSync, onDisconnect }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = `social-provider-title-${provider.toLowerCase()}`;
  const connect = () => onConnect(provider);
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
          {configured && (
            <DuncitButton
              size="small"
              variant={accounts.length > 0 ? 'outlined' : 'contained'}
              startIcon={<AddLinkIcon />}
              onClick={connect}
              data-testid={`social-connect-${provider.toLowerCase()}`}
            >
              {connectLabel}
            </DuncitButton>
          )}
        </Stack>

        {configured ? null : (
          <Alert severity="info" variant="outlined" sx={{ mt: 2 }} data-testid={`social-not-set-up-${provider.toLowerCase()}`}>
            {t('marketing.social.notSetUp')}
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
              <AccountRow key={account.id} account={account} onSync={onSync} onReconnect={connect} onDisconnect={onDisconnect} />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
