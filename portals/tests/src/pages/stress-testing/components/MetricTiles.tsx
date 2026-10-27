import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { StatCard } from '@duncit/ui';

export interface MetricTile {
  id: string;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  /** 0–100 draws a usage bar under the value. */
  percent?: number;
  valueColor?: string;
}

interface Props {
  tiles: readonly MetricTile[];
  /** Minimum tile width before the grid wraps. */
  minWidth?: number;
}

/** A CSS grid track list that wraps tiles once they would shrink below `minWidth`. */
const wrappingColumns = (minWidth: number) => ['repeat(auto-fill, minmax(', minWidth, 'px, 1fr))'].join('');

/** A wrapping grid of stat cards — the live pulse and a run's KPIs share it. */
export default function MetricTiles({ tiles, minWidth = 170 }: Readonly<Props>) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: wrappingColumns(minWidth),
      }}
    >
      {tiles.map((tile) => (
        <StatCard
          key={tile.id}
          label={tile.label}
          value={tile.value}
          hint={tile.hint}
          icon={tile.icon}
          iconColor="text.secondary"
          percent={tile.percent}
          valueColor={tile.valueColor}
          valueVariant="h6"
        />
      ))}
    </Box>
  );
}
