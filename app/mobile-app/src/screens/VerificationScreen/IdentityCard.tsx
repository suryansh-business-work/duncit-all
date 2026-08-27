import { MaterialIcons } from '@expo/vector-icons';
import { isVerificationLocked } from '@duncit/verification';
import { Spinner, Text, XStack } from 'tamagui';

import type { Verification } from '@/hooks/useVerifications';
import { useThemeColors } from '@/hooks/useThemeColors';

import { VerificationCard } from './VerificationCard';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  item: Verification;
  busy: boolean;
  docError: string | null;
  onPickImage: () => void;
  onPickPdf: () => void;
}

function PickButton({
  testID,
  label,
  icon,
  busy,
  onPress,
}: Readonly<{
  testID: string;
  label: string;
  icon: 'image' | 'picture-as-pdf';
  busy: boolean;
  onPress: () => void;
}>) {
  const { primary } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-disabled={busy}
      onPress={busy ? undefined : onPress}
      alignItems="center"
      gap={6}
      paddingHorizontal={14}
      height={40}
      borderRadius={999}
      borderWidth={1}
      borderColor="$primary"
      opacity={busy ? 0.6 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      {busy ? (
        <Spinner size="small" color={primary} />
      ) : (
        <MaterialIcons name={icon} size={16} color={primary} />
      )}
      <Text fontSize={13} fontWeight="700" color="$primary">
        {label}
      </Text>
    </XStack>
  );
}

/** Identity verification — upload an ID document (image or PDF, 4 MB cap). */
export function IdentityCard({ item, busy, docError, onPickImage, onPickPdf }: Readonly<Props>) {
  const { t } = useTranslation();
  const locked = isVerificationLocked(item.status);
  return (
    <VerificationCard item={item}>
      {locked ? null : (
        <XStack gap={10} flexWrap="wrap">
          <PickButton
            testID="verification-upload-photo"
            label={t('verification.uploadPhoto')}
            icon="image"
            busy={busy}
            onPress={onPickImage}
          />
          <PickButton
            testID="verification-upload-pdf"
            label={t('verification.uploadPdf')}
            icon="picture-as-pdf"
            busy={busy}
            onPress={onPickPdf}
          />
        </XStack>
      )}
      {docError ? (
        <Text testID="verification-doc-error" fontSize={12} color="$danger">
          {docError}
        </Text>
      ) : null}
    </VerificationCard>
  );
}
