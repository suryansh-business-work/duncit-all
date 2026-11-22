import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  SEND_MONEY,
  SEND_MONEY_OPTIONS,
  SEND_MONEY_RECIPIENT,
  type Recipient,
  type SendMoneyOptionsData,
} from './queries';
import type { RecipientOption } from './RecipientPicker';
import {
  EMPTY_SEND_MONEY_VALUES,
  buildSendMoneySchema,
  toSendMoneyInput,
  type SendMoneyFormValues,
} from './send-money.schema';

/** A fresh id for one intended transfer. Never reused after it succeeded, always reused after it failed. */
export function mintRequestId(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * Everything the Send Money page does, apart from drawing it: the recipient and
 * their verified accounts, the form, the confirmation step and the send.
 *
 * The request id is minted once and kept until the transfer SUCCEEDS. A failed
 * attempt (a dropped connection, a refusal) retried with the same id can never
 * pay twice — the server returns the transfer if it was already made — while a
 * second, deliberate payment starts a new id.
 */
export function useSendMoneyForm() {
  const { t } = useTranslation();
  const [recipientOption, setRecipientOption] = useState<RecipientOption | null>(null);
  const [requestId, setRequestId] = useState(mintRequestId);
  const [confirming, setConfirming] = useState(false);
  // A second click lands before the first one's loading state has rendered; only a ref sees it.
  const inFlight = useRef(false);

  const { data: optionsData } = useQuery<SendMoneyOptionsData>(SEND_MONEY_OPTIONS, { fetchPolicy: 'cache-and-network' });
  const { data: recipientData, loading: loadingRecipient } = useQuery<{ sendMoneyRecipient: Recipient }>(SEND_MONEY_RECIPIENT, {
    variables: { id: recipientOption?.id },
    skip: !recipientOption,
    // Accounts are read fresh each time: a payment is made to what is verified NOW.
    fetchPolicy: 'network-only',
  });
  const [send, { loading: sending }] = useMutation(SEND_MONEY);

  const schema = useMemo(
    () =>
      buildSendMoneySchema({
        recipientRequired: t('finance.payouts.recipientRequired'),
        accountRequired: t('finance.payouts.accountRequired'),
        amountRequired: t('finance.payouts.sendAmountRequired'),
        amountPrecision: t('finance.payouts.amountPrecision'),
        categoryRequired: t('finance.payouts.categoryRequired'),
        reasonRequired: t('finance.payouts.reasonRequired'),
        reasonTooLong: t('finance.payouts.sendReasonTooLong'),
        notesTooLong: t('finance.payouts.notesTooLong'),
        referenceTooLong: t('finance.payouts.referenceTooLong'),
        urlInvalid: t('finance.payouts.urlInvalid'),
      }),
    [t],
  );
  const form = useForm<SendMoneyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_SEND_MONEY_VALUES,
    mode: 'onSubmit',
  });
  const { setValue, reset, handleSubmit, watch, getValues } = form;

  const recipient = recipientOption ? (recipientData?.sendMoneyRecipient ?? null) : null;
  const accountId = watch('account_id');
  const account = recipient?.verified_accounts.find((a) => a.id === accountId) ?? null;

  const chooseRecipient = useCallback(
    (next: RecipientOption | null) => {
      setRecipientOption(next);
      setValue('recipient_user_id', next?.id ?? '', { shouldValidate: false });
      // Another person's account must never stay selected.
      setValue('account_id', '', { shouldValidate: false });
    },
    [setValue],
  );

  // One verified account needs no choosing: select it as soon as it loads.
  useEffect(() => {
    const only = recipient?.verified_accounts.length === 1 ? recipient.verified_accounts[0] : null;
    if (only) setValue('account_id', only.id);
  }, [recipient, setValue]);

  const review = handleSubmit(() => setConfirming(true));

  // The confirmation sends the form as it stands: the same rules run once more, so
  // there is no separate "pending" copy of the values that could drift from the form.
  const confirm = handleSubmit(async (values) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await send({ variables: { input: toSendMoneyInput(values, requestId) } });
      notifySuccess(t('finance.payouts.sendSuccess'));
      setRecipientOption(null);
      reset(EMPTY_SEND_MONEY_VALUES);
      setRequestId(mintRequestId());
    } catch (e) {
      notifyError(parseApiError(e));
    } finally {
      inFlight.current = false;
      setConfirming(false);
    }
  });

  const options = optionsData?.sendMoneyOptions;
  return {
    form,
    options,
    recipientOption,
    recipient,
    loadingRecipient,
    account,
    confirming,
    values: confirming ? getValues() : null,
    sending,
    chooseRecipient,
    review,
    confirm,
    cancelConfirm: () => setConfirming(false),
    canSend: !!options?.payouts_configured && !!recipient && recipient.verified_accounts.length > 0,
  };
}
