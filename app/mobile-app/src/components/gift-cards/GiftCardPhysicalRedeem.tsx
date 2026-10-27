import { useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { buildPhysicalGiftCardInput, physicalGiftCardErrorKey } from '@duncit/forms/schemas';
import { logs } from '@duncit/logs';

import { PhysicalGiftCardForm, type PhysicalGiftCardValues } from '@/forms/physical-gift-card';
import { MobileRedeemPhysicalGiftCardDocument } from '@/graphql/gift-cards';
import { refreshCoinBalance } from '@/hooks/useCoins';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { errorReason } from '@/utils/errors';
import { GiftCardRedeemSuccess } from './GiftCardRedeemSuccess';

type RedeemResult = ResultOf<typeof MobileRedeemPhysicalGiftCardDocument>['redeemPhysicalGiftCard'];

/**
 * The "Physical card" door of the Redeem screen: the printed card's number and
 * passcode go straight to `redeemPhysicalGiftCard` (a printed card has no
 * lookup), and success lands on the same card the emailed-code flow ends on.
 * mWeb twin: gift-card-redeem-page/PhysicalCardRedeem.
 */
export function GiftCardPhysicalRedeem() {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (values: PhysicalGiftCardValues) => {
    setSaving(true);
    setError(null);
    try {
      const data = await graphqlRequest(
        MobileRedeemPhysicalGiftCardDocument,
        buildPhysicalGiftCardInput(values),
        { auth: true },
      );
      setResult(data.redeemPhysicalGiftCard);
      // The card turned into coins — the sidebar and checkout read the store.
      refreshCoinBalance();
    } catch (e) {
      // Each refusal has its own sentence; the server's English never shows.
      const reason = errorReason(e);
      if (reason === null) logs.mobileApp.warn('GiftCardPhysicalRedeem', 'redeem', { error: e });
      setError(t(physicalGiftCardErrorKey(reason)));
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return <GiftCardRedeemSuccess coinsAdded={result.coins_added} coinBalance={result.coin_balance} />;
  }
  return <PhysicalGiftCardForm saving={saving} errorMessage={error} onSubmit={submit} />;
}
