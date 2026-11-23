import { useCallback, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  PAYMENT_DETAIL,
  REFUND_PAYMENT_TO_SOURCE,
  type PaymentDetail,
  type PaymentRefundEntry,
  type PaymentRefundSection,
} from './queries';

/** The refund the open dialog is about, with the key that makes a double click answer once. */
export interface RefundTarget {
  section: PaymentRefundSection;
  entry: PaymentRefundEntry;
  clientRequestId: string;
}

export interface RefundToSourceApi {
  target: RefundTarget | null;
  busy: boolean;
  error: string | null;
  open: (section: PaymentRefundSection, entry: PaymentRefundEntry) => void;
  close: () => void;
  /** Send the refund the open dialog is about, with the note Finance typed. */
  submit: (current: RefundTarget, note: string) => Promise<void>;
}

interface RefundData {
  refundPaymentToSource: PaymentDetail;
}

/**
 * Send one owed refund back to its source and refresh the audit from the answer.
 *
 * Like the retry, the mutation answers with the whole detail and that reply is
 * written straight into the page's query: a refund and a refetch racing each
 * other would show the page as it was before the write it was meant to prove.
 * A refusal still WROTE (an attempt was counted, a failure recorded), so a
 * failure asks the server for the fresh audit instead.
 */
export function useRefundToSource(paymentDocId: string): RefundToSourceApi {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [target, setTarget] = useState<RefundTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mutate, { loading }] = useMutation<RefundData>(REFUND_PAYMENT_TO_SOURCE, {
    update(cache, { data }) {
      // Apollo only calls `update` on an error-free reply, and the field is non-null in the schema.
      cache.writeQuery({
        query: PAYMENT_DETAIL,
        variables: { id: paymentDocId },
        data: { paymentDetail: (data as RefundData).refundPaymentToSource },
      });
    },
  });

  const open = useCallback((section: PaymentRefundSection, entry: PaymentRefundEntry) => {
    setError(null);
    // One key per opening: pressing Confirm twice in the same dialog is one request.
    setTarget({ section, entry, clientRequestId: globalThis.crypto.randomUUID() });
  }, []);

  const close = useCallback(() => setTarget(null), []);

  const submit = useCallback(
    async (current: RefundTarget, note: string) => {
      setError(null);
      try {
        await mutate({
          variables: {
            input: {
              payment_doc_id: paymentDocId,
              kind: current.section.kind,
              entry_id: current.entry.id,
              note,
              client_request_id: current.clientRequestId,
            },
          },
        });
        notifySuccess(t('finance.payment.refundArea.refundSent'));
        setTarget(null);
      } catch (cause) {
        setError(parseApiError(cause));
        await client.refetchQueries({ include: [PAYMENT_DETAIL] });
      }
    },
    [client, mutate, paymentDocId, t],
  );

  return { target, busy: loading, error, open, close, submit };
}
