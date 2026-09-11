import { Text } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';

interface Props {
  label: string;
  value: string | number;
  /** `lg` for a short count, `md` for money that must not be cut off. */
  size?: 'md' | 'lg';
}

/** Stat tile shared by the studio dashboards: a muted label over the figure, on
 * a surface card. mWeb twin: pages/host-dashboard-page/StatCard. */
export function StatTile({ label, value, size = 'md' }: Readonly<Props>) {
  return (
    <SurfaceCard flex={1} gap={4}>
      <Text fontSize={12} fontWeight="600" color="$muted" numberOfLines={1}>
        {label}
      </Text>
      <Text
        fontSize={size === 'lg' ? 24 : 20}
        fontWeight="700"
        color="$color"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
    </SurfaceCard>
  );
}
