import { useState } from 'react';
import { Box } from '@mui/material';
import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { integrationsPath } from '../../../lib/routes';
import { CONNECT_PROVIDERS, PLATFORMS } from '../copy';
import type { SocialAccount, SocialApp, SocialConnectReturn, SocialPlatform, SocialProvider, SocialProviderStatus } from '../queries';
import type { ConnectOption } from './ConnectButton';
import OwnerDialog from './OwnerDialog';
import PlatformCard from './PlatformCard';
import { useSocialAccountActions } from './useSocialAccountActions';

interface Props {
  providers: SocialProviderStatus[];
  accounts: SocialAccount[];
  onChanged: () => void;
  /** The page this is shown on, so a connection lands back on it. */
  returnTo: SocialConnectReturn;
  /** One column, for a drawer; two side by side on a wide page otherwise. */
  narrow?: boolean;
}

/**
 * A card per platform, in a fixed order, with every account OF that platform
 * inside — however it arrived. One Meta login brings a Facebook Page and its
 * Instagram account; the Page lands under Facebook and the account under
 * Instagram, each card saying which app it came through.
 */
export default function AccountsTab({ providers, accounts, onChanged, returnTo, narrow = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const actions = useSocialAccountActions(onChanged, returnTo);
  const columns = narrow ? '1fr' : { xs: '1fr', lg: '1fr 1fr' };
  const [leaving, setLeaving] = useState<SocialAccount | null>(null);
  const [owning, setOwning] = useState<SocialAccount | null>(null);
  const status = new Map(providers.map((p) => [p.provider, p]));
  const appsByProvider = new Map<SocialProvider, SocialApp[]>(providers.map((p) => [p.provider, p.configured ? p.apps : []]));
  const optionsFor = (platform: SocialPlatform): ConnectOption[] =>
    CONNECT_PROVIDERS[platform].flatMap((provider) => (appsByProvider.get(provider) ?? []).map((app) => ({ provider, app })));

  const confirmDisconnect = async (account: SocialAccount) => {
    if (await actions.disconnect(account)) setLeaving(null);
  };

  return (
    <>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: columns, alignItems: 'start' }}>
        {PLATFORMS.map((platform) => (
          <PlatformCard
            key={platform}
            platform={platform}
            options={optionsFor(platform)}
            appsByProvider={appsByProvider}
            settingsTo={integrationsPath(status.get(CONNECT_PROVIDERS[platform][0])?.category)}
            accounts={accounts.filter((account) => account.platform === platform)}
            onConnect={actions.connect}
            onSync={actions.sync}
            onSetOwner={setOwning}
            onDisconnect={setLeaving}
          />
        ))}
      </Box>

      {/* Each dialog is rendered only once an account is picked, so it mounts fresh for that account and needs no null guard. */}
      {owning && <OwnerDialog account={owning} onClose={() => setOwning(null)} onSaved={onChanged} />}
      {leaving && (
        <ConfirmDialog
          open
          title={t('marketing.social.disconnectTitle')}
          message={t('marketing.social.disconnectMessage', { vars: { name: leaving.name } })}
          confirmLabel={t('marketing.social.disconnect')}
          confirmColor="error"
          loading={actions.disconnecting}
          busyLabel={t('marketing.social.disconnecting')}
          onClose={() => setLeaving(null)}
          onConfirm={() => confirmDisconnect(leaving)}
        />
      )}
    </>
  );
}
