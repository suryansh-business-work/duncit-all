import { useState } from 'react';
import { Box } from '@mui/material';
import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { PROVIDERS } from '../copy';
import type { SocialAccount, SocialProviderStatus } from '../queries';
import ProviderCard from './ProviderCard';
import { useSocialAccountActions } from './useSocialAccountActions';

interface Props {
  providers: SocialProviderStatus[];
  accounts: SocialAccount[];
  onChanged: () => void;
}

/** A card per network, in a fixed order, with its connected accounts inside. */
export default function AccountsTab({ providers, accounts, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const actions = useSocialAccountActions(onChanged);
  const [leaving, setLeaving] = useState<SocialAccount | null>(null);
  const configured = new Set(providers.filter((p) => p.configured).map((p) => p.provider));

  const confirmDisconnect = async (account: SocialAccount) => {
    if (await actions.disconnect(account)) setLeaving(null);
  };

  return (
    <>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
        {PROVIDERS.map((provider) => (
          <ProviderCard
            key={provider}
            provider={provider}
            configured={configured.has(provider)}
            accounts={accounts.filter((account) => account.provider === provider)}
            onConnect={actions.connect}
            onSync={actions.sync}
            onDisconnect={setLeaving}
          />
        ))}
      </Box>

      {/* Rendered only once an account is picked, so confirming needs no null guard. */}
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
