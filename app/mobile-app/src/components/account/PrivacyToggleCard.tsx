import { useState } from 'react';
import { Text, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { AppSwitch } from '@/components/AppSwitch';
import { useTranslation } from '@/hooks/useTranslation';
import { IconDisc } from './IconDisc';

import { fireAndForget } from '@/utils/fire-and-forget';

/** Account privacy toggle — a private profile hides posts and status from people
 * who don't follow you (Instagram-style). Name + avatar stay visible. */
export function PrivacyToggleCard({
  isPrivate,
  onChange,
}: Readonly<{ isPrivate: boolean; onChange: (next: boolean) => Promise<void> }>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const onValueChange = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      await onChange(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SurfaceCard testID="privacy-card" flexDirection="row" alignItems="center" gap={16}>
      <IconDisc icon="lock-outline" />
      <YStack flex={1}>
        <Text fontSize={15} fontWeight="500" color="$color">
          Private account
        </Text>
        <Text fontSize={14} color="$muted">
          When private, only followers see your posts and status.
        </Text>
      </YStack>
      <AppSwitch
        testID="privacy-switch"
        aria-label={t('mweb.account.togglePrivateAccount')}
        value={isPrivate}
        disabled={busy}
        onValueChange={(next) => fireAndForget(onValueChange(next))}
      />
    </SurfaceCard>
  );
}
