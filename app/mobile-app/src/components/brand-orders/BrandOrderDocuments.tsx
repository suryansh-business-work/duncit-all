import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { SHIPMENT_DOCUMENTS, type ShipmentDocumentKind } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  busy: boolean;
  onDocument: (kind: ShipmentDocumentKind, mode: 'print' | 'download') => void;
}

/** The shipping label, GST invoice and pickup manifest — each to print or to
 * save. RN twin of mWeb's BrandOrderDocuments. */
export function BrandOrderDocuments({ busy, onDocument }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color } = useThemeColors();
  return (
    <YStack gap={8} testID="brand-order-documents">
      <Text fontSize={13} fontWeight="600" color="$color">
        {t('mweb.brandOrders.documents')}
      </Text>
      {SHIPMENT_DOCUMENTS.map((doc) => (
        <XStack key={doc.kind} gap={8} flexWrap="wrap">
          <DuncitButton
            label={t(doc.printKey)}
            variant="outline"
            size="sm"
            icon={<MaterialIcons name="print" size={16} color={color} />}
            disabled={busy}
            testID={`brand-order-print-${doc.kind}`}
            onPress={() => onDocument(doc.kind, 'print')}
          />
          <DuncitButton
            label={t(doc.downloadKey)}
            variant="outline"
            size="sm"
            icon={<MaterialIcons name="file-download" size={16} color={color} />}
            disabled={busy}
            testID={`brand-order-download-${doc.kind}`}
            onPress={() => onDocument(doc.kind, 'download')}
          />
        </XStack>
      ))}
    </YStack>
  );
}
