import { MaterialIcons } from '@expo/vector-icons';
import { Text } from 'tamagui';
import type { VenueFoodOrder } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useFoodInvoice } from '@/hooks/useFoodInvoice';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  order: VenueFoodOrder;
  /** The key the screen reads the order with. */
  orderKey: string | null;
}

/**
 * The venue's invoice for a paid order, handed to the OS share sheet as a PDF.
 * Drawn only once the server says there is one. Tamagui twin of mWeb's
 * venue-food-order-page invoice card.
 */
export function FoodOrderInvoiceCard({ order, orderKey }: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const invoice = useFoodInvoice(order, orderKey);

  return (
    <SurfaceCard gap={12} testID="food-order-invoice">
      <SectionHeader testID="food-order-invoice-header" title={t('mweb.venueFood.invoice.title')} />
      <Text fontSize={14} color="$muted">
        {t('mweb.venueFood.invoice.hint', { vars: { venue: order.venue_name } })}
      </Text>
      <DuncitButton
        testID="food-order-invoice-download"
        label={t(
          invoice.downloading
            ? 'mweb.venueFood.invoice.preparing'
            : 'mweb.venueFood.invoice.download',
        )}
        variant="soft"
        fullWidth
        loading={invoice.downloading}
        disabled={invoice.downloading}
        icon={<MaterialIcons name="receipt-long" size={18} color={accent} />}
        onPress={() => fireAndForget(invoice.download())}
      />
      {invoice.error ? (
        <Text testID="food-order-invoice-error" role="alert" fontSize={13} color="$danger">
          {invoice.error}
        </Text>
      ) : null}
    </SurfaceCard>
  );
}
