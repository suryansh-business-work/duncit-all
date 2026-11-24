import { useState } from 'react';
import { Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { logs } from '@duncit/logs';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTicketWalletLinks } from '@/hooks/useTicketWalletLinks';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

interface WalletButtonProps {
  testID: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

function WalletButton({ testID, icon, label, onPress }: Readonly<WalletButtonProps>) {
  const { primary } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="link"
      tabIndex={0}
      aria-label={label}
      onPress={onPress}
      flex={1}
      minHeight={44}
      gap={6}
      alignItems="center"
      justifyContent="center"
      borderRadius={999}
      borderWidth={1}
      borderColor="$primary"
      paddingHorizontal={12}
      pressStyle={PRESS_STYLE.control}
    >
      <Ionicons name={icon} size={16} color={primary} />
      <Text fontSize={13} fontWeight="600" color="$accent" numberOfLines={1}>
        {label}
      </Text>
    </XStack>
  );
}

/**
 * "Add to Apple Wallet" / "Add to Google Wallet" for the booked pod's ticket —
 * RN twin of the buttons on mWeb's SuccessPodCard. Each shows only when the
 * server returns its link (that wallet is set up in the Tech portal). The
 * system browser opens the link: Safari hands a .pkpass to Wallet, and Google's
 * save page adds the pass to Google Wallet.
 */
export function WalletButtons({ podId }: Readonly<{ podId: string | undefined }>) {
  const { t } = useTranslation();
  const { apple_pass_url: appleUrl, google_save_url: googleUrl } = useTicketWalletLinks(podId);
  const [error, setError] = useState<string | null>(null);
  if (!appleUrl && !googleUrl) return null;

  const open = (url: string) => {
    setError(null);
    fireAndForget(
      Linking.openURL(url).catch((cause: unknown) => {
        logs.mobileApp.error('checkout', 'openWalletLink', { error: cause });
        setError(t('mweb.checkout.walletOpenFailed'));
      }),
    );
  };

  return (
    <YStack testID="success-pod-wallets" gap={6}>
      <XStack gap={8}>
        {appleUrl ? (
          <WalletButton
            testID="success-pod-apple-wallet"
            icon="logo-apple"
            label={t('mweb.checkout.appleWallet')}
            onPress={() => open(appleUrl)}
          />
        ) : null}
        {googleUrl ? (
          <WalletButton
            testID="success-pod-google-wallet"
            icon="logo-google"
            label={t('mweb.checkout.googleWallet')}
            onPress={() => open(googleUrl)}
          />
        ) : null}
      </XStack>
      {error ? (
        <Text role="alert" testID="wallet-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
