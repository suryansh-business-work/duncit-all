import { ScrollView, Text } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { DetailSkeleton } from '@/components/Skeleton';
import { useVerifications, type Verification } from '@/hooks/useVerifications';

import { AddressCard } from './AddressCard';
import { EmailCard } from './EmailCard';
import { IdentityCard } from './IdentityCard';

/** Verification — three types (Identity / Address / Email). Identity is a
 * document upload, Address a structured form, Email a terminal app chip. RN twin
 * of mWeb's VerificationPage. */
export function VerificationScreen() {
  const {
    items,
    isLoading,
    busyType,
    docError,
    uploadIdentityImage,
    uploadIdentityPdf,
    submitAddress,
  } = useVerifications();

  if (isLoading && items.length === 0) {
    return (
      <StackScreen header title="Verification" testID="verification-screen">
        <DetailSkeleton testID="verification-loading" />
      </StackScreen>
    );
  }

  const renderCard = (item: Verification) => {
    if (item.type === 'IDENTITY') {
      return (
        <IdentityCard
          key={item.type}
          item={item}
          busy={busyType === 'IDENTITY'}
          docError={docError}
          onPickImage={() => {
            uploadIdentityImage().catch(() => undefined);
          }}
          onPickPdf={() => {
            uploadIdentityPdf().catch(() => undefined);
          }}
        />
      );
    }
    if (item.type === 'ADDRESS') {
      return (
        <AddressCard
          key={item.type}
          item={item}
          busy={busyType === 'ADDRESS'}
          onSubmit={(values) => {
            submitAddress(values).catch(() => undefined);
          }}
        />
      );
    }
    return <EmailCard key={item.type} item={item} />;
  };

  return (
    <StackScreen header title="Verification" testID="verification-screen">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Text fontSize={13} color="$muted">
          Verify your account. Identity and address are reviewed by our team.
        </Text>
        {items.map(renderCard)}
      </ScrollView>
    </StackScreen>
  );
}
