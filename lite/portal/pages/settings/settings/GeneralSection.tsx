import type { Control } from 'react-hook-form';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { usePortalT } from '../../../../shared/i18n';
import type { SettingsFormValues } from './settings.types';

interface Props {
  control: Control<SettingsFormValues>;
  busy: boolean;
}

/** Site name, support address, currency, ticket ceiling. */
export function GeneralSection({ control, busy }: Readonly<Props>) {
  const { t } = usePortalT();
  return (
    <SectionCard title={t('litePortal.settings.general')}>
      <Stack spacing={1.5}>
        <RhfTextField control={control} name="site_name" label={t('litePortal.settings.siteName')} hint={t('litePortal.settings.siteNameHint')} required disabled={busy} slotProps={{ htmlInput: { 'data-testid': 'settings-site-name' } }} />
        <RhfTextField
          control={control}
          name="support_email"
          type="email"
          label={t('litePortal.settings.supportEmail')}
          hint={t('litePortal.settings.supportEmailHint')}
          required
          disabled={busy}
          slotProps={{ htmlInput: { 'data-testid': 'settings-support-email' } }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <RhfTextField control={control} name="currency" label={t('litePortal.settings.currency')} hint={t('litePortal.settings.currencyHint')} required disabled={busy} slotProps={{ htmlInput: { 'data-testid': 'settings-currency', maxLength: 3 } }} />
          <RhfTextField
            control={control}
            name="max_ticket_price"
            label={t('litePortal.settings.maxTicketPrice')}
            hint={t('litePortal.settings.maxTicketPriceHint')}
            required
            disabled={busy}
            slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': 'settings-max-ticket-price' } }}
          />
        </Stack>
      </Stack>
    </SectionCard>
  );
}
