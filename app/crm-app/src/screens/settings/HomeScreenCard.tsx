import { useState } from 'react';
import { Text } from 'tamagui';
import { CrmTelephony } from 'crm-telephony';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

type PinState = 'idle' | 'sent' | 'unsupported';

/**
 * Settings → Home screen: put a Duncit CRM Dialer icon on the home screen
 * (Android's pinned shortcut). Tapping it opens the CRM dialer, which places a
 * normal SIM call. The widget is added from the launcher's widget list.
 */
export function HomeScreenCard() {
  const { t } = useTranslation();
  const [pin, setPin] = useState<PinState>('idle');

  const pinDialer = () => {
    const placed = CrmTelephony?.canPinShortcut() ? CrmTelephony.pinDialerShortcut(t('crmApp.native.dialer')) : false;
    setPin(placed ? 'sent' : 'unsupported');
  };

  return (
    <Card title={t('crmApp.settings.homeScreen')}>
      <Text color="$muted">{t('crmApp.settings.pinDialerHint')}</Text>
      <DuncitButton label={t('crmApp.settings.pinDialer')} onPress={pinDialer} testID="settings-pin-dialer" fullWidth />
      {pin === 'sent' ? (
        <Text color="$success" aria-live="polite">
          {t('crmApp.settings.pinDialerSent')}
        </Text>
      ) : null}
      {pin === 'unsupported' ? (
        <Text color="$muted" aria-live="polite">
          {t('crmApp.settings.pinDialerUnsupported')}
        </Text>
      ) : null}
      <Text color="$muted">{t('crmApp.settings.widgetHint')}</Text>
    </Card>
  );
}
