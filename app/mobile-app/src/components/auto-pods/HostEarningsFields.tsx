import { Input, Slider, Text, XStack, YStack } from 'tamagui';
import type { AutoPodLabels } from '@duncit/utils';

import { LoadingIndicator } from '@/components/LoadingIndicator';
import { HostProjectionLines } from '@/components/auto-pods/HostProjectionLines';
import type { AutoPodHostProjection } from '@/hooks/useAutoPodHostProjection';

const inputStyle = {
  size: '$4',
  backgroundColor: '$surface',
  color: '$color',
  placeholderTextColor: '$muted',
  borderColor: '$borderColor',
} as const;

interface SpotsSliderProps {
  min: number;
  max: number;
  value: number;
  label: string;
  onChange: (next: number) => void;
}

/** Tamagui's slider bound to whole spots. Hoisted to module scope — a component
 * defined inside another remounts on every render (S6478). */
function SpotsSlider({ min, max, value, label, onChange }: Readonly<SpotsSliderProps>) {
  return (
    <Slider
      testID="auto-pod-spots-slider"
      min={min}
      max={max}
      step={1}
      value={[value]}
      onValueChange={([next]) => onChange(next ?? min)}
      aria-label={label}
    >
      <Slider.Track>
        <Slider.TrackActive />
      </Slider.Track>
      <Slider.Thumb index={0} circular size="$2" />
    </Slider>
  );
}

interface Props {
  /** The ticket price as typed — empty while the field is. */
  price: string;
  onPrice: (next: string) => void;
  spots: number;
  onSpots: (next: number) => void;
  projection: AutoPodHostProjection | null;
  loading: boolean;
  /** The last projection read threw — say so rather than sit silent. */
  failed: boolean;
  labels: AutoPodLabels;
  formatMoney: (amount: number) => string;
}

/**
 * Step 4 of Create a Pod, as a host meets it on an Auto Pod: the venue's
 * ceiling, the ticket price they type, the spots they drag to, and what the
 * server says that adds up to. It replaced a bare pair of number inputs, which
 * asked a host to commit to a price without ever showing what it paid them.
 *
 * The Tamagui twin of `@duncit/auto-pods`' `HostEarningsFields` (rule 27), and
 * the same block backs both the read-only calculator and the assign sheet.
 */
export function HostEarningsFields({
  price,
  onPrice,
  spots,
  onSpots,
  projection,
  loading,
  failed,
  labels,
  formatMoney,
}: Readonly<Props>) {
  // The venue's booked space fixes the ceiling; until the server answers there
  // is no honest range to drag along, and a plain number input stands in.
  const min = projection?.min_spots ?? 0;
  const max = projection?.max_spots ?? 0;
  const slidable = max > min;
  const current = Math.max(min, Math.min(max, spots));
  const priceInvalid = price.trim() !== '' && (Number(price) || 0) <= 0;

  return (
    <YStack gap={10}>
      {projection ? (
        <Text testID="auto-pod-total-spots" fontSize={13} fontWeight="700" color="$color">
          {labels.earningsTotalSpots(projection.max_spots)}
        </Text>
      ) : null}

      <Input
        testID="auto-pod-earnings-price"
        {...inputStyle}
        keyboardType="numeric"
        value={price}
        // Digits only — a ticket price is whole rupees, and anything else
        // would feed a bogus collection into the projection.
        onChangeText={(text) => onPrice(text.replace(/[^0-9]/g, ''))}
        placeholder={labels.earningsAddPrice}
        aria-label={labels.earningsAddPrice}
      />
      {priceInvalid ? (
        <Text testID="auto-pod-earnings-price-error" fontSize={12} color="$danger">
          {labels.earningsPricePositive}
        </Text>
      ) : null}

      {slidable ? (
        <YStack gap={6}>
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={13} fontWeight="700" color="$color">
              {labels.spotsField}
            </Text>
            <Text testID="auto-pod-spots-value" fontSize={18} fontWeight="700" color="$color">
              {current}
            </Text>
          </XStack>
          <SpotsSlider
            min={min}
            max={max}
            value={current}
            label={labels.spotsField}
            onChange={onSpots}
          />
          <Text fontSize={12} color="$muted">
            {labels.spotsRange(min, max)}
          </Text>
        </YStack>
      ) : (
        <Input
          testID="auto-pod-earnings-spots"
          {...inputStyle}
          keyboardType="numeric"
          value={spots > 0 ? String(spots) : ''}
          onChangeText={(text) => onSpots(Number(text.replace(/[^0-9]/g, '')) || 0)}
          placeholder={labels.spotsField}
          aria-label={labels.spotsField}
        />
      )}

      {loading ? <LoadingIndicator /> : null}

      {projection ? (
        <HostProjectionLines projection={projection} labels={labels} formatMoney={formatMoney} />
      ) : (
        <Text testID="auto-pod-earnings-hint" fontSize={12.5} color="$muted">
          {labels.earningsEnterPrice}
        </Text>
      )}

      {failed ? (
        <Text testID="auto-pod-earnings-failed" fontSize={12} color="$danger">
          {labels.loadFailed}
        </Text>
      ) : null}
    </YStack>
  );
}
