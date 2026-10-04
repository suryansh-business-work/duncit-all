import { useState } from 'react';
import { Alert, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { IntegrationLogo, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import type { BrandIntegrationProvider } from '../queries';
import { integrationIntro, integrationTitle } from '../brand-wizard/steps/integration-forms';
import ConnectionDialog from './ConnectionDialog';
import ConnectionRow from './ConnectionRow';
import type { PartnerIntegration } from './integrations.queries';

interface Props {
  provider: BrandIntegrationProvider;
  connections: PartnerIntegration[];
}

/** Editing: nothing open, a new connection, or one saved connection. */
type Editing = null | 'new' | PartnerIntegration;

/** One provider's saved accounts on the Integrations page, and the way to add another. */
export default function ProviderConnections({ provider, connections }: Readonly<Props>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Editing>(null);
  const title = integrationTitle(t, provider);
  const key = provider.toLowerCase();

  return (
    <SectionCard
      title={title}
      subtitle={integrationIntro(t, provider)}
      icon={<IntegrationLogo vendor={provider} label={title} />}
      action={
        <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => setEditing('new')} data-testid={`integrations-add-${key}`}>
          {t('partners.integrations.add')}
        </DuncitButton>
      }
    >
      <Stack spacing={1.5} data-testid={`integrations-${key}`}>
        {connections.length === 0 && (
          <Alert severity="info">{t('partners.integrations.empty', { vars: { provider: title } })}</Alert>
        )}
        {connections.map((connection) => (
          <ConnectionRow key={connection.id} connection={connection} onEdit={setEditing} />
        ))}
      </Stack>
      <ConnectionDialog
        open={editing !== null}
        provider={provider}
        connection={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
      />
    </SectionCard>
  );
}
