import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Text, YStack } from 'tamagui';
import { logs } from '@duncit/logs';
import { TRUECALLER_COPY } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { truecallerIds, type TruecallerIds } from '@/services/truecaller.service';
import { TruecallerButton } from './TruecallerButton';
import { isTruecallerLinked } from './useTruecallerNative';

interface Props {
  intent: 'SIGN_IN' | 'SIGN_UP';
  loading?: boolean;
  onError: (message: string) => void;
}

/** Whether the identifiers this platform's SDK needs are all present. */
const usable = (ids: TruecallerIds | null): ids is TruecallerIds => {
  if (!ids) return false;
  return Platform.OS === 'android' ? !!ids.androidClientId : !!ids.iosAppKey && !!ids.iosAppLink;
};

/**
 * Truecaller as a cell of the round-button row: nothing at all unless this
 * binary carries the SDK and Tech still holds its identifiers.
 */
export function TruecallerCell({ intent, loading, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const [linked] = useState(isTruecallerLinked);
  const [ids, setIds] = useState<TruecallerIds | null>(null);

  useEffect(() => {
    if (!linked) return undefined;
    let live = true;
    truecallerIds()
      .then((found) => {
        if (live) setIds(found);
      })
      .catch((error: unknown) => logs.mobileApp.warn('TruecallerCell', 'truecallerIds', { error }));
    return () => {
      live = false;
    };
  }, [linked]);

  if (!linked || !usable(ids)) return null;
  return (
    <YStack alignItems="center" gap={8}>
      <TruecallerButton ids={ids} intent={intent} loading={loading} onError={onError} />
      <Text fontSize={14} color="$muted">
        {t(TRUECALLER_COPY.short)}
      </Text>
    </YStack>
  );
}
