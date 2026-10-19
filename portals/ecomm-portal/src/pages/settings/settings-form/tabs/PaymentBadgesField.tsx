import type { Control } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import RhfFieldList from '../../../../components/form/FieldList';
import { PAYMENT_BADGE_FIT } from '../../../home-page/image-presets';
import type { GeneralValues } from './general';

/** The server keeps at most this many marks. */
export const MAX_PAYMENT_BADGES = 12;

const BLANK_PAYMENT_BADGE = { label: '', image_url: '' };

/** The accepted payment methods the store footer shows — a name and a mark each. */
export default function PaymentBadgesField({ control }: Readonly<{ control: Control<GeneralValues> }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1} data-testid="settings-payment-badges">
      <Typography component="h3" variant="subtitle2">
        {t('ecommPortal.settings.paymentBadges')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('ecommPortal.settings.paymentBadgesHint')}
      </Typography>
      <RhfFieldList
        control={control}
        name="payment_badges"
        blank={BLANK_PAYMENT_BADGE}
        max={MAX_PAYMENT_BADGES}
        columns={[
          { key: 'label', label: t('ecommPortal.settings.paymentBadgeLabel'), required: true },
          { key: 'image_url', label: t('ecommPortal.settings.paymentBadgeImage'), kind: 'image', required: true, fit: PAYMENT_BADGE_FIT },
        ]}
        addLabel={t('ecommPortal.settings.addPaymentBadge')}
        itemLabel={(position) => t('ecommPortal.settings.paymentBadgeN', { vars: { n: position } })}
      />
    </Stack>
  );
}
