import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { LocationButton } from '@/components/LocationButton';
import { RequestPodSheet } from '@/forms/request-pod';
import type { NearbyItem } from '@/hooks/useNearbyPartners';
import type { NearbySearchState } from '@/hooks/useNearbySearch';
import { useTranslation } from '@/hooks/useTranslation';
import { toErrorMessage } from '@/utils/errors';
import { NearbyResults } from './NearbyResults';
import { SearchFilters } from './SearchFilters';

interface Props {
  /** What is being searched for. */
  kind: 'HOST' | 'VENUE';
  state: NearbySearchState;
  items: readonly NearbyItem[];
  loading: boolean;
  error: string | null;
  quota: { limit: number; remaining: number } | null;
  /** Sends the request; throws with the server's refusal. */
  send: (item: NearbyItem, note: string) => Promise<unknown>;
}

/**
 * Everything under a nearby search's header: where it searches from (the
 * picked location, changeable in place), the filters, this month's allowance,
 * the results and the Request Pod sheet. mWeb twin: NearbySearchBody.
 */
export function NearbySearchBody({
  kind,
  state,
  items,
  loading,
  error,
  quota,
  send,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<NearbyItem | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const quotaReached = quota !== null && quota.remaining <= 0;

  const submit = async (note: string) => {
    if (!target) return false;
    setSendError(null);
    setSending(true);
    try {
      await send(target, note);
      setSent(true);
      setTarget(null);
      return true;
    } catch (err) {
      setSendError(toErrorMessage(err, t('mweb.account.somethingWentWrong')));
      return false;
    } finally {
      setSending(false);
    }
  };

  return (
    <YStack gap={16}>
      <XStack alignItems="center" gap={12} testID="nearby-location">
        <Text flex={1} fontSize={14} fontWeight="600" color="$color" numberOfLines={2}>
          {state.placeName || t('podRequests.pickLocation')}
        </Text>
        <LocationButton />
      </XStack>
      <SearchFilters state={state} />
      {quota ? (
        <Text
          testID="nearby-quota"
          fontSize={13}
          fontWeight="600"
          color={quotaReached ? '$danger' : '$muted'}
        >
          {quotaReached
            ? t('podRequests.quotaReached', { vars: { limit: quota.limit } })
            : t('podRequests.quotaLeft', {
                vars: { remaining: quota.remaining, limit: quota.limit },
              })}
        </Text>
      ) : null}
      {sent ? (
        <Text testID="nearby-sent" role="status" fontSize={13} color="$success">
          {t('podRequests.requestSent')}
        </Text>
      ) : null}
      <NearbyResults
        kind={kind}
        state={state}
        items={items}
        loading={loading}
        error={error}
        quotaReached={quotaReached}
        onRequest={(item) => {
          setSendError(null);
          setSent(false);
          setTarget(item);
        }}
      />
      <RequestPodSheet
        targetName={target?.name ?? null}
        sending={sending}
        error={sendError}
        onClose={() => setTarget(null)}
        onSubmit={submit}
      />
    </YStack>
  );
}
