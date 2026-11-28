import { useMutation } from '@apollo/client/react';
import { Alert, Chip, Stack, Typography } from '@mui/material';
import WebhookIcon from '@mui/icons-material/Webhook';
import { DuncitButton } from '@duncit/buttons';
import { notify, useConfirm } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { REGISTER_SOCIAL_WEBHOOK, type WebhookAppStatus, type WebhookObjectStatus } from './webhooks.queries';

type Translate = ReturnType<typeof useTranslation>['t'];
type ChipColor = 'success' | 'warning' | 'error';

/** Keys written out in full, so the translation gate sees each one. */
const OBJECT_LABEL: Record<string, string> = {
  instagram: 'marketing.socialWebhooks.objectInstagram',
  page: 'marketing.socialWebhooks.objectPage',
};

/** Whether Meta calls us for this object, worst first: nothing registered, another URL, paused, then fine. */
function stateOf(row: WebhookObjectStatus): { label: string; color: ChipColor } {
  if (!row.registered) return { label: 'marketing.socialWebhooks.notRegistered', color: 'error' };
  if (!row.callback_matches) return { label: 'marketing.socialWebhooks.otherUrl', color: 'warning' };
  if (!row.active) return { label: 'marketing.socialWebhooks.paused', color: 'warning' };
  return { label: 'marketing.socialWebhooks.registered', color: 'success' };
}

function ObjectRow({ row, t }: Readonly<{ row: WebhookObjectStatus; t: Translate }>) {
  const state = stateOf(row);
  return (
    <Stack spacing={0.5} data-testid={`webhook-object-${row.object}`}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="subtitle2">{t(OBJECT_LABEL[row.object] ?? 'marketing.socialWebhooks.objectOther', { vars: { object: row.object } })}</Typography>
        <Chip size="small" color={state.color} label={t(state.label)} data-testid={`webhook-state-${row.object}`} />
      </Stack>
      {row.callback_url && (
        <Typography variant="body2" sx={{ color: 'text.secondary', wordBreak: 'break-all' }}>
          {t('marketing.socialWebhooks.metaCalls', { vars: { url: row.callback_url } })}
        </Typography>
      )}
      {row.registered && row.missing_fields.length > 0 && (
        <Typography variant="body2" sx={{ color: 'warning.main' }}>
          {t('marketing.socialWebhooks.missingFields', { vars: { fields: row.missing_fields.join(', ') } })}
        </Typography>
      )}
    </Stack>
  );
}

interface Props {
  app: WebhookAppStatus;
  canRegister: boolean;
  onChanged: () => void;
}

/**
 * One Meta app's webhook as Meta holds it, beside the URL we expect, and the
 * button that points Meta at us. Meta checks the URL on the spot, so a
 * success here means deliveries will arrive.
 */
export default function WebhookAppCard({ app, canRegister, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [register, { loading }] = useMutation(REGISTER_SOCIAL_WEBHOOK);
  const ready = app.secret_set && app.verify_token_set;

  const onRegister = async () => {
    const ok = await confirm({
      title: t('marketing.socialWebhooks.registerTitle'),
      message: t('marketing.socialWebhooks.registerBody', { vars: { url: app.callback_url } }),
      confirmLabel: t('marketing.socialWebhooks.register'),
    });
    if (!ok) return;
    try {
      await register({ variables: { entry_id: app.entry_id } });
      notify(t('marketing.socialWebhooks.registerDone'), 'success');
      onChanged();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <SectionCard title={app.name || app.app_id} subtitle={t('marketing.socialWebhooks.appId', { vars: { id: app.app_id } })}>
      <Stack spacing={2} data-testid={`webhook-app-${app.app_id}`}>
        {!ready && (
          <Alert severity="warning" data-testid="webhook-app-not-ready">
            {t('marketing.socialWebhooks.needsKeys')}
          </Alert>
        )}
        {app.error && (
          <Alert severity="error" data-testid="webhook-app-error">
            {t('marketing.socialWebhooks.readFailed', { vars: { reason: app.error } })}
          </Alert>
        )}
        {app.objects.map((row) => (
          <ObjectRow key={row.object} row={row} t={t} />
        ))}
        {canRegister && (
          <Stack direction="row">
            <DuncitButton variant="contained" startIcon={<WebhookIcon />} onClick={onRegister} disabled={!ready} loading={loading} data-testid={`webhook-register-${app.app_id}`}>
              {t('marketing.socialWebhooks.register')}
            </DuncitButton>
          </Stack>
        )}
      </Stack>
    </SectionCard>
  );
}
