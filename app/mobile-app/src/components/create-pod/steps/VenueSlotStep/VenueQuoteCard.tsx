import { Spinner, Text, XStack, YStack } from 'tamagui';
import { formatStatementMoney, parseApiError, venueQuoteLines } from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import type { HostVenueQuote } from '@/hooks/useVenueQuote';

export interface VenueQuoteState {
  quote: HostVenueQuote | null;
  loading: boolean;
  error: unknown;
}

interface Props extends VenueQuoteState {
  currencySymbol: string;
}

function Row({ label, value, strong = false }: Readonly<{ label: string; value: string; strong?: boolean }>) {
  return (
    <XStack justifyContent="space-between" gap={12}>
      <Text flex={1} fontSize={13} fontWeight={strong ? '700' : '400'} color={strong ? '$color' : '$muted'}>
        {label}
      </Text>
      <Text fontSize={13} fontWeight={strong ? '700' : '500'} color="$color">
        {value}
      </Text>
    </XStack>
  );
}

/**
 * The venue's price for the picked window, exactly as the server quoted it:
 * base, each rule applied, any min-spend top-up, fees, taxes and Duncit's fee
 * on top. Read-only — the host cannot change it. mWeb twin: VenueQuoteCard.
 */
export function VenueQuoteCard({ quote, loading, error, currencySymbol }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = (value: number) => formatStatementMoney(value, currencySymbol);

  if (error) {
    return (
      <Text testID="create-pod-quote-error" role="alert" fontSize={13} color="$danger">
        {parseApiError(error) || t('mweb.createPod.quoteFailed')}
      </Text>
    );
  }
  if (!quote) {
    return loading ? <Spinner color="$primary" aria-label={t('mweb.a11y.loading')} /> : null;
  }
  const { lines, total, deposit } = venueQuoteLines(quote, money);
  return (
    <SurfaceCard gap={8} testID="create-pod-venue-quote">
      <Text fontSize={14} fontWeight="700" color="$color">
        {t('mweb.createPod.quoteTitle')}
      </Text>
      {lines.map((line) => (
        <Row key={line.id} label={line.label ?? t(line.labelKey, { vars: line.vars })} value={money(line.amount)} />
      ))}
      <YStack height={1} backgroundColor="$borderColor" />
      <Row label={t('mweb.createPod.quote.total')} value={money(total)} strong />
      {deposit > 0 ? (
        <Text fontSize={12} color="$muted">
          {t('mweb.createPod.quote.deposit', { vars: { amount: money(deposit) } })}
        </Text>
      ) : null}
      <Text fontSize={12} color="$muted">
        {t('mweb.createPod.quoteHint')}
      </Text>
    </SurfaceCard>
  );
}
