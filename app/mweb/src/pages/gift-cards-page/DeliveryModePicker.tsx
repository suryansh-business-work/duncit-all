import { Card, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import type { GiftCardDeliveryMode } from '@duncit/forms/schemas';
import SectionHeader from '../../components/SectionHeader';
import { useTranslation } from '../../i18n/useTranslation';
import { SEGMENTED_TOGGLE_SX } from './segmentedSx';

interface DeliveryModePickerProps {
  value: GiftCardDeliveryMode;
  /** False while printed cards are switched off or out of stock. */
  physicalAvailable: boolean;
  shippingFee: number;
  currencySymbol: string;
  onChange: (next: GiftCardDeliveryMode) => void;
}

/** Email (the code arrives in an inbox) or a printed card delivered by courier for a flat fee. */
export default function DeliveryModePicker({ value, physicalAvailable, shippingFee, currencySymbol, onChange }: Readonly<DeliveryModePickerProps>) {
  const { t } = useTranslation();
  const fee = formatMoney(shippingFee, { symbol: currencySymbol });
  const caption =
    value === 'PHYSICAL' ? t('mweb.giftCards.deliveryPhysicalHint', { vars: { fee } }) : t('mweb.giftCards.deliveryDigitalHint');

  return (
    <Card data-testid="gift-card-delivery-picker" sx={{ p: 2 }}>
      <SectionHeader testId="gift-card-delivery-header" title={t('mweb.giftCards.deliveryHeading')} />
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={value}
        onChange={(_event, next: GiftCardDeliveryMode | null) => next && onChange(next)}
        aria-label={t('mweb.giftCards.deliveryHeading')}
        sx={{ ...SEGMENTED_TOGGLE_SX, mt: 1.5 }}
      >
        <ToggleButton data-testid="gift-card-delivery-digital" value="DIGITAL">
          {t('mweb.giftCards.deliveryDigital')}
        </ToggleButton>
        <ToggleButton data-testid="gift-card-delivery-physical" value="PHYSICAL" disabled={!physicalAvailable}>
          {t('mweb.giftCards.deliveryPhysical')}
        </ToggleButton>
      </ToggleButtonGroup>
      <Typography data-testid="gift-card-delivery-caption" variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1 }}>
        {physicalAvailable ? caption : t('mweb.giftCards.physicalUnavailable')}
      </Typography>
    </Card>
  );
}
