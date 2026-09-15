import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

interface StillNeedHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Opened by an FAQ's "Not really": points the member at the live support
 * chat. Tamagui twin of mWeb's StillNeedHelpDialog. */
export function StillNeedHelpDialog({ open, onClose }: Readonly<StillNeedHelpDialogProps>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const startChat = () => {
    onClose();
    navigation.navigate('LiveChat');
  };

  const footer = (
    <DuncitButton
      testID="faqs-still-need-help-chat"
      label={t('mweb.common.chatWithUs')}
      size="lg"
      fullWidth
      icon={<MaterialIcons name="chat-bubble-outline" size={18} color={onPrimary} />}
      onPress={startChat}
    />
  );

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="faqs-still-need-help"
      title={t('mweb.faqsPage.stillNeedHelp')}
      closeLabel={t('mweb.common.close')}
      variant="center"
      footer={footer}
    >
      <Text testID="faqs-still-need-help-body" fontSize={14} lineHeight={20} color="$muted">
        {t('mweb.faqsPage.stillNeedHelpBody')}
      </Text>
    </DuncitDialog>
  );
}
