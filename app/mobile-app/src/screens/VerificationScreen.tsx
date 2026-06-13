import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { DetailSkeleton } from '@/components/Skeleton';
import { useVerifications, type Verification } from '@/hooks/useVerifications';
import { useThemeColors } from '@/hooks/useThemeColors';

const LABELS: Record<Verification['type'], string> = {
  IDENTITY: 'Identity Verification',
  ADDRESS: 'Address Verification',
  PHONE: 'Phone Verification',
  EMAIL: 'Email Verification',
  BANK_ACCOUNT: 'Bank Account Verification',
  POLICE: 'Police Verification',
  SELFIE: 'Selfie Verification',
};

const STATUS_META: Record<Verification['status'], { label: string; color: string }> = {
  NOT_SUBMITTED: { label: 'Not submitted', color: '#9aa0a6' },
  PENDING: { label: 'Under review', color: '#fb8c00' },
  APPROVED: { label: 'Verified', color: '#22c55e' },
  REJECTED: { label: 'Rejected', color: '#e53935' },
};

/** One verification type — check icon, label, status chip and an upload button
 * until it is approved. */
function VerificationRow({
  item,
  busy,
  onUpload,
}: Readonly<{ item: Verification; busy: boolean; onUpload: () => void }>) {
  const { primary } = useThemeColors();
  const meta = STATUS_META[item.status];
  const verified = item.status === 'APPROVED';

  return (
    <XStack
      testID={`verification-${item.type}`}
      alignItems="center"
      gap={12}
      padding={14}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <MaterialIcons name="check-circle" size={22} color={verified ? '#22c55e' : '#cfd2d6'} />
      <YStack flex={1} gap={4}>
        <Text fontSize={14.5} fontWeight="900" color="$color">
          {LABELS[item.type]}
        </Text>
        <XStack
          alignSelf="flex-start"
          paddingHorizontal={8}
          paddingVertical={2}
          borderRadius={999}
          backgroundColor={meta.color}
        >
          <Text fontSize={11} fontWeight="900" color="#ffffff">
            {meta.label}
          </Text>
        </XStack>
        {item.status === 'REJECTED' && item.reject_reason ? (
          <Text fontSize={12} color="$danger">
            {item.reject_reason}
          </Text>
        ) : null}
      </YStack>
      {!verified ? (
        <XStack
          testID={`verification-upload-${item.type}`}
          role="button"
          aria-label={`Upload ${LABELS[item.type]}`}
          aria-disabled={busy}
          onPress={busy ? undefined : onUpload}
          alignItems="center"
          gap={6}
          paddingHorizontal={14}
          height={40}
          borderRadius={999}
          borderWidth={1}
          borderColor="$primary"
          opacity={busy ? 0.6 : 1}
          pressStyle={{ opacity: 0.8 }}
        >
          {busy ? (
            <Spinner size="small" color={primary} />
          ) : (
            <MaterialIcons name="upload-file" size={16} color={primary} />
          )}
          <Text fontSize={13} fontWeight="900" color="$primary">
            {item.status === 'NOT_SUBMITTED' ? 'Upload' : 'Re-upload'}
          </Text>
        </XStack>
      ) : null}
    </XStack>
  );
}

/** Verification — upload a document for each of the 7 types; an admin then
 * approves/rejects in the admin panel. RN twin of mWeb's VerificationPage. */
export function VerificationScreen() {
  const { items, isLoading, busyType, uploadFor } = useVerifications();

  if (isLoading && items.length === 0) {
    return (
      <StackScreen header title="Verification" testID="verification-screen">
        <DetailSkeleton testID="verification-loading" />
      </StackScreen>
    );
  }

  return (
    <StackScreen header title="Verification" testID="verification-screen">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Text fontSize={13} color="$muted">
          Upload documents to verify your account. Each is reviewed by our team.
        </Text>
        {items.map((item) => (
          <VerificationRow
            key={item.type}
            item={item}
            busy={busyType === item.type}
            onUpload={() => {
              uploadFor(item.type).catch(() => undefined);
            }}
          />
        ))}
      </ScrollView>
    </StackScreen>
  );
}
