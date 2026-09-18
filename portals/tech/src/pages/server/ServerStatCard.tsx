import { StatCard } from '@duncit/ui';

/** The shared StatCard styled as the Tech portal's server and database tiles. */
export default function ServerStatCard(
  props: Readonly<{ label: string; value: string; sub?: string; percent?: number }>,
) {
  return (
    <StatCard
      {...props}
      labelVariant="caption"
      labelWeight={700}
      labelSx={{ letterSpacing: 0.3 }}
      valueNoWrap
      sx={{ height: '100%' }}
    />
  );
}
