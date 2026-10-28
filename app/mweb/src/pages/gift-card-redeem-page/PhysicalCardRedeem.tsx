import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import type { MutationRedeemPhysicalGiftCardArgs, PhysicalGiftCardRedeemResult } from '@duncit/gql-types';
import { buildPhysicalGiftCardInput, physicalGiftCardErrorKey } from '@duncit/forms/schemas';
import { logs } from '@duncit/logs';
import { firstGraphQLError } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import GiftCardRedeemSuccess from '../gift-cards-page/GiftCardRedeemSuccess';
import { REDEEM_PHYSICAL_GIFT_CARD } from '../gift-cards-page/queries';
import { MY_COIN_BALANCE } from '../duncit-coin-page/queries';
import { PhysicalCardForm, type PhysicalGiftCardValues } from './physical-card-form';

type RedeemOutcome = Pick<PhysicalGiftCardRedeemResult, 'coins_added' | 'coin_balance'>;

/**
 * The "Physical card" door of the Redeem page: the printed card's number and
 * passcode go straight to `redeemPhysicalGiftCard` (a printed card has no
 * lookup), and success lands on the same card the emailed-code flow ends on.
 * Native twin: components/gift-cards/GiftCardPhysicalRedeem.
 */
export default function PhysicalCardRedeem() {
  const { t } = useTranslation();
  // The card turns into coins, so the cached balance (menu, checkout) is re-read.
  const [redeem, { loading }] = useMutation<{ redeemPhysicalGiftCard: RedeemOutcome }, MutationRedeemPhysicalGiftCardArgs>(
    REDEEM_PHYSICAL_GIFT_CARD,
    { refetchQueries: [{ query: MY_COIN_BALANCE }] },
  );
  const [result, setResult] = useState<RedeemOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (values: PhysicalGiftCardValues) => {
    setError(null);
    try {
      const res = await redeem({ variables: buildPhysicalGiftCardInput(values) });
      const outcome = res.data?.redeemPhysicalGiftCard ?? null;
      if (outcome) setResult(outcome);
      else setError(t('mweb.giftCards.redeemError'));
    } catch (e) {
      // Each refusal has its own sentence; the server's English never shows.
      const reason = firstGraphQLError(e)?.extensions?.reason;
      if (typeof reason !== 'string') logs.mWeb.warn('gift-card-redeem', 'physical', { error: e });
      setError(t(physicalGiftCardErrorKey(reason)));
    }
  };

  if (result) return <GiftCardRedeemSuccess coinsAdded={result.coins_added} coinBalance={result.coin_balance} />;
  return <PhysicalCardForm saving={loading} errorMessage={error} onSubmit={submit} />;
}
