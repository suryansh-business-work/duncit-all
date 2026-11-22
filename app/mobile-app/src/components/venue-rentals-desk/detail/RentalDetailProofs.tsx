import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { rentalActorKey, type RentalProofValues } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { DuncitButton } from '@/components/DuncitButton';
import type { RentalDetail } from '@/hooks/useRentalBookingDetail';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/utils/date-format';

import { DetailSection, keyedRows } from './DetailSection';
import { RentalProofSheet } from './RentalProofSheet';

const THUMB = 72;

interface Props {
  detail: RentalDetail;
  onAddProof: (input: RentalProofValues) => Promise<void>;
}

/** The optional notes and photos on a rental, who added each and when, and Add proof. */
export function RentalDetailProofs({ detail, onAddProof }: Readonly<Props>) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const proofs = keyedRows(detail.proofs, (proof) => `${proof.added_at}-${proof.added_by_name}`);
  return (
    <DetailSection
      title={t('venueRentals.detail.proofs')}
      testID="rental-detail-proofs"
      action={
        <DuncitButton
          testID="rental-detail-add-proof"
          label={t('venueRentals.proof.add')}
          accessibilityLabel={t('venueRentals.proof.title', {
            vars: { name: detail.booking.name },
          })}
          variant="outline"
          size="sm"
          onPress={() => setAdding(true)}
        />
      }
    >
      {proofs.length === 0 ? (
        <Text fontSize={12.5} color="$muted" testID="rental-detail-no-proofs">
          {t('venueRentals.proof.empty')}
        </Text>
      ) : null}
      {proofs.map(({ row: proof, key }) => (
        <YStack key={key} gap={6} testID="rental-detail-proof">
          {proof.note ? (
            <Text fontSize={13} color="$color">
              {proof.note}
            </Text>
          ) : null}
          {proof.image_urls.length > 0 ? (
            <XStack gap={8} flexWrap="wrap">
              {proof.image_urls.map((url, n) => (
                <YStack
                  key={url}
                  width={THUMB}
                  height={THUMB}
                  borderRadius="$4"
                  overflow="hidden"
                  backgroundColor="$soft"
                >
                  <AppImage
                    source={{ uri: url }}
                    style={{ width: THUMB, height: THUMB }}
                    accessibilityLabel={t('venueRentals.proof.photoAlt', { vars: { n: n + 1 } })}
                  />
                </YStack>
              ))}
            </XStack>
          ) : null}
          <Text fontSize={12} color="$muted">
            {t('venueRentals.proof.addedBy', {
              vars: {
                name: proof.added_by_name,
                role: t(rentalActorKey(proof.added_by_role)),
                at: formatDateTime(proof.added_at),
              },
            })}
          </Text>
        </YStack>
      ))}
      {adding ? (
        <RentalProofSheet
          name={detail.booking.name}
          onClose={() => setAdding(false)}
          onSave={onAddProof}
        />
      ) : null}
    </DetailSection>
  );
}
