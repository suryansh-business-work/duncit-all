import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import TablePageHeader from '../../../components/TablePageHeader';
import { useCanWrite } from '../../../lib/roles';
import GiftCardSettingsCard from '../virtual/GiftCardSettingsCard';
import DeliverySettingsForm from './delivery-settings';
import {
  GIFT_CARD_DELIVERY_SETTINGS,
  UPDATE_GIFT_CARD_DELIVERY_SETTINGS,
  toDeliverySettings,
  type DeliveryData,
  type GiftCardDeliverySettings,
} from './queries';

/**
 * Loyalty > Gift Card Settings — one place for the whole sales policy: the
 * amounts members may choose (validated the same way in mWeb and the app), how
 * long a card lives, and how printed cards are delivered.
 */
export default function GiftCardSettingsPage() {
  const { t } = useTranslation();
  const canWrite = useCanWrite();
  const { data, error, refetch } = useQuery<DeliveryData>(GIFT_CARD_DELIVERY_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [save, saving] = useMutation(UPDATE_GIFT_CARD_DELIVERY_SETTINGS);

  const submit = async (input: GiftCardDeliverySettings) => {
    try {
      await save({ variables: { input } });
      notifySuccess(t('loyalty.giftSettings.saved'));
      await refetch();
    } catch (e) {
      // The server names the rule (a fee before switching printed cards on).
      notifyError((e as { message?: string })?.message || t('loyalty.giftSettings.saveError'));
    }
  };

  return (
    <Stack spacing={2.5}>
      <TablePageHeader icon={<TuneIcon color="primary" />} title={t('loyalty.giftSettings.title')} total={null} />
      <GiftCardSettingsCard />
      {error && <Alert severity="error">{t('loyalty.giftSettings.loadError')}</Alert>}
      <DeliverySettingsForm settings={toDeliverySettings(data)} busy={saving.loading} readOnly={!canWrite} onSubmit={submit} />
    </Stack>
  );
}
