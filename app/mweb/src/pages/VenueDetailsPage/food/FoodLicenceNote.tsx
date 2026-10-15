import { Typography } from '@mui/material';
import { useTranslation } from '../../../i18n/useTranslation';

/**
 * The venue's FSSAI licence number at the foot of its menu — Indian food law
 * asks every menu to show it. Nothing renders while the venue has not given one.
 */
export default function FoodLicenceNote({ fssai }: Readonly<{ fssai?: string | null }>) {
  const { t } = useTranslation();
  const number = (fssai ?? '').trim();
  if (!number) return null;

  return (
    <Typography variant="caption" component="p" sx={{ color: 'text.secondary', textAlign: 'center' }} data-testid="venue-food-fssai">
      {t('mweb.venueFood.fssai', { vars: { number } })}
    </Typography>
  );
}
