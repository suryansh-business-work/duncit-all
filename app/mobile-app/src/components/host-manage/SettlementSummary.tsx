import { Spinner, Text, YStack } from 'tamagui';
import { buildEarningsSplit, formatStatementMoney } from '@duncit/utils';

import { EarningsSplitAccordion } from '@/components/create-pod/price-panel/EarningsSplitAccordion';
import type { PodSettlement } from '@/hooks/useSettlementPreview';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  settlement: PodSettlement | null;
  isLoading: boolean;
}

/** "Host Share" preview: the pod's money split four ways for the entered venue
 * bill, the host's earning first. */
export function SettlementSummary({ settlement, isLoading }: Readonly<Props>) {
  const { t } = useTranslation();
  let body;
  if (settlement) {
    const symbol = settlement.currency_symbol;
    // The same four-way split as Create Pod and every portal, the host's own
    // earning first. Where the release pays less than the engine's host figure
    // (an expired window, or a host side below zero) the notes below say so.
    const split = buildEarningsSplit(settlement.waterfall, { symbol, t, viewer: 'host' });
    body = (
      <YStack gap={4}>
        {/* The head count these figures come from. A completed pod settles on
            what it actually collected, so this is real attendance, not the
            spots the host planned for — and their own seat was free. mWeb twin. */}
        <Text testID="settlement-attendees" fontSize={12} color="$muted">
          Based on {settlement.paying_attendees} paying{' '}
          {settlement.paying_attendees === 1 ? 'attendee' : 'attendees'} — your own spot is free.
        </Text>
        <EarningsSplitAccordion
          split={split}
          money={(value) => formatStatementMoney(value, symbol)}
          venueShortfall={false}
        />
        {settlement.complete_expired ? (
          <Text testID="settlement-expired" fontSize={12} color="$danger">
            {t('mweb.hostShare.expired')}
          </Text>
        ) : null}
        {settlement.waterfall.host_receives < 0 ? (
          <Text testID="settlement-shortfall" fontSize={12} color="$danger">
            {t('mweb.hostShare.shortfall')}
          </Text>
        ) : null}
      </YStack>
    );
  } else {
    body = isLoading ? (
      <Spinner
        role="progressbar"
        aria-label={t('mweb.a11y.loading')}
        testID="settlement-loading"
        size="small"
        color="$primary"
      />
    ) : (
      <Text testID="settlement-empty" fontSize={12} color="$muted">
        Enter a bill to preview your share.
      </Text>
    );
  }

  return (
    <YStack
      gap={6}
      padding={14}
      borderRadius={16}
      backgroundColor="$primarySoft"
      testID="settlement-summary"
    >
      <Text fontSize={14} fontWeight="600" color="$color">
        Your share (credited to your wallet on completion)
      </Text>
      {body}
    </YStack>
  );
}
