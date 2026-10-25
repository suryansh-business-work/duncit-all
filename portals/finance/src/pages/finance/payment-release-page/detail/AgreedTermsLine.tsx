import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { venueOfferTermsLine } from '@duncit/utils';
import { money } from '../../pod-finance-page/queries';
import type { ReleaseAgreedTerms } from './release-terms';

interface Props {
  agreed: ReleaseAgreedTerms;
  symbol: string;
}

/**
 * The booking offer the venue's amount was agreed at — "Per guest · ₹300.00
 * per guest" — frozen on the release at completion, so Finance approves the
 * venue's side against the terms both sides accepted. The words are the venue
 * booking's own (`availability.offers.*`, shipped by every portal).
 */
export default function AgreedTermsLine({ agreed, symbol }: Readonly<Props>) {
  const { t } = useTranslation();
  const value = venueOfferTermsLine(t, agreed.model, money(symbol, agreed.rate));

  return (
    <Stack direction="row" spacing={2} data-testid="release-agreed-terms" sx={{ justifyContent: 'space-between', mb: 0.75 }}>
      <Typography variant="body2">{t('availability.offers.agreedTerms')}</Typography>
      <Typography variant="body2" sx={{ textAlign: 'end' }}>
        {value}
      </Typography>
    </Stack>
  );
}
