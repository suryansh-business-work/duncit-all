import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthAlert } from '@/screens/auth/AuthAlert';

interface Props {
  phone?: string | null;
  busy: boolean;
  /** Why the disconnect was refused, worded. */
  error: string | null;
  onDisconnect: () => void;
}

/** The linked-account summary once the session is CONNECTED, with Disconnect. */
export function ConnectedSummary({ phone, busy, error, onDisconnect }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Card testID="wa-connected">
      <XStack alignItems="center" gap="$3">
        <MaterialCommunityIcons name="whatsapp" size={28} color={theme.success?.val} />
        <YStack flex={1} gap="$1">
          <Text fontWeight="700" role="heading">
            {t('crm.tools.connected')}
          </Text>
          <Text color="$muted">{phone ? `+${phone}` : t('crm.tools.accountLinked')}</Text>
          <Text color="$muted" fontSize="$2">
            {t('crm.tools.sessionSaved')}
          </Text>
        </YStack>
        <DuncitButton
          label={t('crm.tools.disconnect')}
          onPress={onDisconnect}
          variant="outline"
          tone="danger"
          size="sm"
          disabled={busy}
          testID="wa-disconnect"
        />
      </XStack>
      {error ? <AuthAlert message={error} testID="wa-disconnect-error" /> : null}
    </Card>
  );
}
