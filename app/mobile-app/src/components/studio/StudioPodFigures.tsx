import { formatMoney } from '@duncit/utils';
import { Text, XStack, YStack } from 'tamagui';

import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { StudioPodFiguresData } from './studio-pods';

interface FigureTileProps {
  label: string;
  value: string;
  caption?: string;
  testID: string;
}

/** One figure in the strip: label, the number, and an optional sub-line. */
function FigureTile({ label, value, caption, testID }: Readonly<FigureTileProps>) {
  return (
    <YStack
      testID={testID}
      flexBasis="30%"
      flexGrow={1}
      minWidth={100}
      gap={2}
      padding={10}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <Text fontSize={11} fontWeight="700" color="$primary" numberOfLines={1}>
        {label}
      </Text>
      <Text fontSize={16} fontWeight="700" color="$color" numberOfLines={1}>
        {value}
      </Text>
      {caption ? (
        <Text fontSize={10.5} color="$muted" numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </YStack>
  );
}

interface StudioPodFiguresProps {
  figures: StudioPodFiguresData;
  /** Copy key for the scope tile — "Venues" in Venue Studio, "Clubs" in Club Studio. */
  scopeLabelKey: string;
  testID: string;
}

/**
 * The figures strip above both studio pod lists: how many pods, how they split
 * across the lifecycle, how full they are, how many people are coming, when the
 * next one runs — and what the pods collected wherever the server exposes it.
 */
export function StudioPodFigures({
  figures,
  scopeLabelKey,
  testID,
}: Readonly<StudioPodFiguresProps>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();

  const fillPct = Math.round(figures.fill_rate * 100);
  const nextPod = figures.next_pod_date_time
    ? formatDateTime(figures.next_pod_date_time)
    : t('mweb.studioPods.noneScheduled');

  const tiles: FigureTileProps[] = [
    { testID: `${testID}-scope`, label: t(scopeLabelKey), value: String(figures.scope) },
    { testID: `${testID}-total`, label: t('mweb.studioPods.total'), value: String(figures.total) },
    {
      testID: `${testID}-upcoming`,
      label: t('mweb.studioPods.bucketUpcoming'),
      value: String(figures.upcoming),
    },
    {
      testID: `${testID}-live`,
      label: t('mweb.studioPods.bucketLive'),
      value: String(figures.ongoing),
    },
    {
      testID: `${testID}-past`,
      label: t('mweb.studioPods.bucketPast'),
      value: String(figures.completed),
    },
    {
      testID: `${testID}-cancelled`,
      label: t('mweb.studioPods.bucketCancelled'),
      value: String(figures.cancelled),
    },
    {
      testID: `${testID}-spots`,
      label: t('mweb.studioPods.spotsFilled'),
      value: `${figures.filled_spots} / ${figures.total_spots}`,
      caption: t('mweb.studioPods.fillRate', { vars: { pct: fillPct } }),
    },
    {
      testID: `${testID}-attendees`,
      label: t('mweb.studioPods.attendees'),
      value: String(figures.total_attendees),
    },
    { testID: `${testID}-next`, label: t('mweb.studioPods.nextPod'), value: nextPod },
  ];

  // Only the club query exposes collected money; the venue list carries no such
  // field, so its strip ends one tile earlier rather than showing a fake zero.
  if (figures.total_revenue !== null) {
    tiles.push({
      label: t('mweb.studioPods.collected'),
      value: formatMoney(figures.total_revenue, {
        symbol: figures.currency_symbol ?? undefined,
      }),
      testID: `${testID}-revenue`,
    });
  }

  return (
    <XStack testID={testID} flexWrap="wrap" gap={10}>
      {tiles.map((tile) => (
        <FigureTile
          key={tile.testID}
          testID={tile.testID}
          label={tile.label}
          value={tile.value}
          caption={tile.caption}
        />
      ))}
    </XStack>
  );
}
