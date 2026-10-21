import { useMemo } from 'react';
import { Divider, Stack, Typography } from '@mui/material';
import { weekdayLabels } from '@duncit/slots';
import { formatStatementMoney, venuePricingTerms, type VenueTermsSource } from '@duncit/utils';
import { usePricing } from '../../../../hooks/usePricing';
import { useTranslation } from '../../../../i18n/useTranslation';
import { useDateFormat } from '../../../../utils/dateFormat';
import { SURFACE_SX } from '../../../../theme';

interface Props {
  pricing: VenueTermsSource;
}

/**
 * The venue's pricing as its owner set it — model, rate, limits, price
 * changes, fees, deposit and open hours — shown before a time is picked, so
 * the host books knowing the terms. Read-only; the exact price is the quote
 * that follows a pick. Native twin: VenueTermsCard.
 */
export default function VenueTermsCard({ pricing }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { currency } = usePricing();
  const sections = useMemo(() => {
    const weekdays = weekdayLabels(t).short;
    return venuePricingTerms(pricing, {
      t,
      money: (value) => formatStatementMoney(value, currency),
      clock: fmt.formatClock,
      date: fmt.formatDay,
      weekday: (day) => weekdays[day] ?? '',
      today: fmt.dayKey(fmt.clock.nowMs()),
    });
  }, [pricing, t, fmt, currency]);

  return (
    <Stack component="section" spacing={1.5} sx={{ ...SURFACE_SX, p: 2 }} data-testid="create-pod-venue-terms" aria-labelledby="create-pod-venue-terms-title">
      <Stack spacing={0.25}>
        <Typography id="create-pod-venue-terms-title" variant="subtitle2" component="h3">
          {t('mweb.createPod.venueTerms.title')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('mweb.createPod.venueTerms.hint')}
        </Typography>
      </Stack>
      {sections.map((section, index) => (
        <Stack key={section.id} spacing={0.75} data-testid={`create-pod-venue-terms-${section.id}`}>
          {index > 0 && <Divider />}
          <Typography variant="overline" component="h4" sx={{ color: 'text.secondary' }}>
            {section.title}
          </Typography>
          <Stack component="dl" spacing={0.5} sx={{ m: 0 }}>
            {section.rows.map((row) => (
              <Stack key={row.id} direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                <Typography component="dt" variant="body2" sx={{ color: 'text.secondary' }}>
                  {row.label}
                </Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0, textAlign: 'end' }}>
                  {row.value}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
