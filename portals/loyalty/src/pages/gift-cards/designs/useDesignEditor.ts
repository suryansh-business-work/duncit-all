import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import {
  ADJUST_GIFT_CARD_DESIGN_STOCK,
  CREATE_GIFT_CARD_DESIGN,
  GIFT_CARD_DESIGN,
  GIFT_CARD_DESIGN_CATEGORIES,
  SET_DEFAULT_GIFT_CARD_DESIGN,
  UPDATE_GIFT_CARD_DESIGN,
  type GiftCardDesignInput,
  type GiftCardDesignRow,
} from './queries';

/** The server says exactly why a write was refused; the fallback is for a dropped connection. */
const messageOf = (e: unknown, fallback: string) => (e as { message?: string })?.message || fallback;

/**
 * Everything the design editor does: load the design (none when adding), save
 * it, make it the default, switch it on or off, and correct its stock. Each
 * action reports its own refusal so the form can show it where it happened.
 */
export function useDesignEditor(id: string | null) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const design = useQuery<{ giftCardDesign: GiftCardDesignRow }>(GIFT_CARD_DESIGN, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const categories = useQuery<{ giftCardDesignCategories: string[] }>(GIFT_CARD_DESIGN_CATEGORIES);
  const [create, creating] = useMutation<{ createGiftCardDesign: GiftCardDesignRow }>(CREATE_GIFT_CARD_DESIGN);
  const [update, updating] = useMutation(UPDATE_GIFT_CARD_DESIGN);
  const [setDefault, defaulting] = useMutation(SET_DEFAULT_GIFT_CARD_DESIGN);
  const [adjust, adjusting] = useMutation(ADJUST_GIFT_CARD_DESIGN_STOCK);

  const save = async (input: GiftCardDesignInput) => {
    setFormError(null);
    try {
      if (id) {
        await update({ variables: { id, input } });
        notifySuccess(t('loyalty.designs.saved'));
        return;
      }
      const res = await create({ variables: { input } });
      notifySuccess(t('loyalty.designs.created'));
      const newId = res.data?.createGiftCardDesign.id;
      if (newId) navigate(`/gift-cards/designs/${newId}`, { replace: true });
    } catch (e) {
      setFormError(messageOf(e, t('loyalty.designs.saveError')));
    }
  };

  const runAction = async (action: () => Promise<unknown>, done: string) => {
    setFormError(null);
    try {
      await action();
      notifySuccess(done);
    } catch (e) {
      setFormError(messageOf(e, t('loyalty.designs.saveError')));
    }
  };

  const makeDefault = () =>
    runAction(() => setDefault({ variables: { id } }), t('loyalty.designs.madeDefault'));

  const toggleActive = (next: boolean) =>
    runAction(
      () => update({ variables: { id, input: { is_active: next } } }),
      next ? t('loyalty.designs.switchedOn') : t('loyalty.designs.switchedOff')
    );

  /** True once the stock changed, so the dialog can close. */
  const adjustStock = async (delta: number, reason: string): Promise<boolean> => {
    setStockError(null);
    try {
      await adjust({ variables: { id, delta, reason } });
      notifySuccess(t('loyalty.designs.stockSaved'));
      return true;
    } catch (e) {
      setStockError(messageOf(e, t('loyalty.designs.saveError')));
      return false;
    }
  };

  return {
    design: design.data?.giftCardDesign ?? null,
    loading: design.loading,
    error: design.error,
    refetch: design.refetch,
    categories: categories.data?.giftCardDesignCategories ?? [],
    saving: creating.loading || updating.loading,
    acting: defaulting.loading || updating.loading,
    adjusting: adjusting.loading,
    formError,
    stockError,
    save,
    makeDefault,
    toggleActive,
    adjustStock,
  };
}
