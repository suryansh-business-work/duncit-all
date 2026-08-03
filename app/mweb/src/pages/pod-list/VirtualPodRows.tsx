import type { MutableRefObject } from 'react';
import { Box } from '@mui/material';
import { isAdRow, type FeedRow, type VirtualRange } from '@duncit/virtual-scroll';
import AdCard from '../../components/ads/AdCard';
import type { PublicAd } from '../../components/ads/useActiveAds';
import PodCard from '../home-page/PodCard';

export const LIST_GAP = 12;

interface VirtualPodRowsProps {
  rows: FeedRow<any, PublicAd>[];
  range: VirtualRange;
  listRef: MutableRefObject<HTMLDivElement | null>;
  measureRow: (row: number) => (el: HTMLElement | null) => void;
  hostNameOf: (pod: any) => string | null;
  onOpenPod: (pod: any) => void;
}

/** The windowed body of a full pod list: only the rows inside the viewport
 * (+ overscan) are mounted, between two spacers sized by the range. */
export default function VirtualPodRows({
  rows,
  range,
  listRef,
  measureRow,
  hostNameOf,
  onOpenPod,
}: Readonly<VirtualPodRowsProps>) {
  const visible = rows.slice(range.start, range.end + 1);
  return (
    <Box ref={listRef}>
      {range.leadPad > 0 && <Box sx={{ height: range.leadPad }} />}
      {visible.map((row, offset) => {
        const rowIndex = range.start + offset;
        if (isAdRow(row)) {
          return (
            <Box key={row.adKey} ref={measureRow(rowIndex)} sx={{ mb: `${LIST_GAP}px` }}>
              <AdCard ad={row.ad} />
            </Box>
          );
        }
        return (
          <Box
            key={row.items[0].id}
            ref={measureRow(rowIndex)}
            sx={{
              display: 'flex',
              gap: `${LIST_GAP}px`,
              mb: `${LIST_GAP}px`,
              justifyContent: { xs: 'center', sm: 'flex-start' },
            }}
          >
            {row.items.map((pod: any) => (
              <PodCard key={pod.id} pod={pod} hostName={hostNameOf(pod)} onOpen={() => onOpenPod(pod)} />
            ))}
          </Box>
        );
      })}
      {range.trailPad > 0 && <Box sx={{ height: range.trailPad }} />}
    </Box>
  );
}
