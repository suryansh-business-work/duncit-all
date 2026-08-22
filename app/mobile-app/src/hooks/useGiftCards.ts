import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobilePublicFinanceDocument } from '@/graphql/checkout';
import {
  MobileGiftCardCategoriesDocument,
  MobileGiftCardSettingsDocument,
  MobileMyGiftCardsDocument,
} from '@/graphql/gift-cards';
import { graphqlRequest } from '@/services/graphql.client';

export type GiftCardSettings = ResultOf<
  typeof MobileGiftCardSettingsDocument
>['publicGiftCardSettings'];
export type GiftCardCategory = ResultOf<
  typeof MobileGiftCardCategoriesDocument
>['categories'][number];
export type MyGiftCards = ResultOf<typeof MobileMyGiftCardsDocument>['myGiftCards'];
export type GiftCard = MyGiftCards['owned'][number];

/** The configured currency symbol (Finance settings) — gift card amounts carry
 * no symbol of their own, so every gift-card surface reads this one. */
export function useFinanceCurrency(): string {
  const [currency, setCurrency] = useState('');
  useEffect(() => {
    let active = true;
    graphqlRequest(MobilePublicFinanceDocument, undefined, { auth: true })
      .then((d) => active && setCurrency(d.publicFinanceSettings.currency_symbol))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return currency;
}

/**
 * Data layer of the Gift Cards screen — the sales policy (amount chips +
 * bounds), the category tree the themes are built from, and the caller's own
 * cards. The buy context loads once; `refreshCards` re-reads the cards
 * whenever the "My cards" tab is opened, so a purchase shows without a
 * cold restart. RN twin of mWeb's gift-cards data layer (rule 27).
 */
export function useGiftCards() {
  const [settings, setSettings] = useState<GiftCardSettings | null>(null);
  const [categories, setCategories] = useState<GiftCardCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [cards, setCards] = useState<MyGiftCards | null>(null);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      graphqlRequest(MobileGiftCardSettingsDocument, undefined, { auth: true }).then(
        (d) => active && setSettings(d.publicGiftCardSettings),
      ),
      graphqlRequest(MobileGiftCardCategoriesDocument, undefined, { auth: true }).then(
        (d) => active && setCategories(d.categories),
      ),
    ])
      .catch(() => active && setHasError(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const refreshCards = useCallback(async () => {
    setCardsLoading(true);
    setCardsError(false);
    try {
      const data = await graphqlRequest(MobileMyGiftCardsDocument, undefined, { auth: true });
      setCards(data.myGiftCards);
    } catch {
      setCardsError(true);
    } finally {
      setCardsLoading(false);
    }
  }, []);

  return {
    settings,
    categories,
    isLoading,
    hasError,
    cards,
    cardsLoading,
    cardsError,
    refreshCards,
  };
}
