import { useState } from 'react';
import { Text } from 'tamagui';
import { makeConsent, type ConsentCategory } from '@duncit/utils';

import { ConsentSwitches } from '@/components/consent';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { useConsentStore } from '@/stores/consent.store';

/**
 * The tracking choices, changeable at any time — withdrawing consent is as
 * easy as giving it. A switch saves at once; the signed-in sync
 * (useConsentSync) records the new answer on the server. Twin of mWeb's
 * TrackingChoicesCard (rule 27).
 */
export function TrackingChoicesCard() {
  const { t } = useTranslation();
  const choice = useConsentStore((s) => s.choice);
  const setChoice = useConsentStore((s) => s.setChoice);
  const [saved, setSaved] = useState(false);
  const values = { analytics: choice?.analytics === true, marketing: choice?.marketing === true };

  const change = (category: ConsentCategory, checked: boolean) => {
    setChoice(makeConsent({ ...values, [category]: checked }));
    setSaved(true);
  };

  return (
    <SurfaceCard testID="privacy-tracking-card" gap={12}>
      <Text role="heading" fontSize={17} fontWeight="600" color="$color">
        {t('privacy.page.trackingTitle')}
      </Text>
      <Text fontSize={14} color="$muted">
        {t('privacy.page.trackingBlurb')}
      </Text>
      <ConsentSwitches values={values} onChange={change} />
      {saved ? (
        <Text testID="privacy-tracking-saved" role="status" fontSize={12.5} color="$success">
          {t('privacy.page.saved')}
        </Text>
      ) : null}
    </SurfaceCard>
  );
}
