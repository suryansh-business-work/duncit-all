import { useCallback, useEffect, useMemo, useState } from 'react';
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
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  return `req-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
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
  const [pending, setPending] = useState<SendMoneyFormValues | null>(null);

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
  const { setValue, reset, handleSubmit, watch } = form;

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

  const review = handleSubmit((values) => setPending(values));

  const confirm = useCallback(async () => {
    if (!pending) return;
    try {
      await send({ variables: { input: toSendMoneyInput(pending, requestId) } });
      notifySuccess(t('finance.payouts.sendSuccess'));
      setPending(null);
      setRecipientOption(null);
      reset(EMPTY_SEND_MONEY_VALUES);
      setRequestId(mintRequestId());
    } catch (e) {
      setPending(null);
      notifyError(parseApiError(e));
    }
  }, [pending, requestId, send, reset, t]);

  const options = optionsData?.sendMoneyOptions;
  return {
    form,
    options,
    recipientOption,
    recipient,
    loadingRecipient,
    account,
    pending,
    sending,
    chooseRecipient,
    review,
    confirm,
    cancelConfirm: () => setPending(null),
    canSend: !!options?.payouts_configured && !!recipient && recipient.verified_accounts.length > 0,
  };
}
