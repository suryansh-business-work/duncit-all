import { Spinner, Text, XStack, YStack } from 'tamagui';
import { formatStatementMoney, parseApiError, venueQuoteLines } from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import type { HostVenueQuote } from '@/hooks/useOfferQuote';
import { QuoteRangeRows } from './QuoteRangeRows';

export interface VenueQuoteState {
  quote: HostVenueQuote | null;
  /** The same offer priced at the venue's minimum guests (absent or null: none asked). */
  quoteMin?: HostVenueQuote | null;
  /** Why the offer cannot be sent, as the server put it. */
  message?: string | null;
  loading: boolean;
  error: unknown;
}

interface Props extends VenueQuoteState {
  currencySymbol: string;
}

function Row({
  label,
  value,
  strong = false,
}: Readonly<{ label: string; value: string; strong?: boolean }>) {
  return (
    <XStack justifyContent="space-between" gap={12}>
      <Text
        flex={1}
        fontSize={13}
        fontWeight={strong ? '700' : '400'}
        color={strong ? '$color' : '$muted'}
      >
        {label}
      </Text>
      <Text fontSize={13} fontWeight={strong ? '700' : '500'} color="$color">
        {value}
      </Text>
    </XStack>
  );
}

/**
 * The host's offer, priced exactly as the server quoted it: what the venue
 * receives and what it costs the pod as a range from the venue's minimum
 * guests to the pod's spots (when those differ), then the breakdown at the
 * spots — the offered base, each of the venue's price rules, any min-spend
 * top-up, its fees, taxes and Duncit's fee on top — or why the offer cannot be
 * sent. Read-only: the host changes the offer, not the price. mWeb twin:
 * VenueQuoteCard.
 */
export function VenueQuoteCard({
  quote,
  quoteMin = null,
  message,
  loading,
  error,
  currencySymbol,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = (value: number) => formatStatementMoney(value, currencySymbol);

  if (error) {
    return (
      <Text testID="create-pod-quote-error" role="alert" fontSize={13} color="$danger">
        {parseApiError(error) || t('mweb.createPod.quoteFailed')}
      </Text>
    );
  }
  if (message) {
    return (
      <Text testID="create-pod-offer-problem" role="alert" fontSize={13} color="$warning">
        {message}
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
      <QuoteRangeRows quote={quote} quoteMin={quoteMin} money={money} />
      {lines.map((line) => (
        <Row
          key={line.id}
          label={line.label ?? t(line.labelKey, { vars: line.vars })}
          value={money(line.amount)}
        />
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
