import { Box, Typography } from '@mui/material';
import { slotTileLines } from '../group';
import type { CalendarSlot, SlotFormatter } from '../types';

export interface SlotTimeGridProps {
  slots: readonly CalendarSlot[];
  selectedSlotId: string;
  onPick: (slot: CalendarSlot) => void;
  fmt: SlotFormatter;
  freeLabel: string;
  /** Headline on whole-day / whole-date-range slot tiles. */
  wholeDayLabel: string;
  showPrice: boolean;
}

/**
 * The time step: one tile per slot on the chosen day. Kept identical to the
 * Tamagui grid in ../native — same order, same two lines, same selected state.
 */
export default function SlotTimeGrid({
  slots,
  selectedSlotId,
  onPick,
  fmt,
  freeLabel,
  wholeDayLabel,
  showPrice,
}: Readonly<SlotTimeGridProps>) {
  return (
    <Box
      sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 1 }}
    >
      {slots.map((slot) => {
        const selected = slot.id === selectedSlotId;
        const { headline: time, secondary } = slotTileLines(
          slot,
          fmt,
          { free: freeLabel, wholeDay: wholeDayLabel },
          showPrice,
        );
        return (
          <Box
            key={slot.id}
            role="button"
            tabIndex={slot.disabled ? -1 : 0}
            aria-pressed={selected}
            aria-disabled={slot.disabled}
            aria-label={secondary ? `${time} · ${secondary}` : time}
            data-testid={`slot-tile-${slot.id}`}
            onClick={() => {
              if (!slot.disabled) onPick(slot);
            }}
            onKeyDown={(event) => {
              if (slot.disabled) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onPick(slot);
              }
            }}
            sx={{
              p: 1,
              // A theme multiplier, so each surface's own shape decides: mWeb
              // caps corners at 4px, the portals keep their 8px chrome.
              borderRadius: 1,
              border: selected ? 2 : 1,
              borderColor: selected ? 'primary.main' : 'divider',
              bgcolor: selected ? 'primary.main' : 'background.paper',
              color: selected ? 'primary.contrastText' : 'text.primary',
              textAlign: 'center',
              cursor: slot.disabled ? 'not-allowed' : 'pointer',
              opacity: slot.disabled ? 0.45 : 1,
              transition: 'border-color 140ms ease',
              '&:hover': { borderColor: slot.disabled ? 'divider' : 'primary.main' },
            }}
          >
            <Typography variant="body2" fontWeight={900}>
              {time}
            </Typography>
            {secondary && (
              <Typography
                variant="caption"
                sx={{ color: selected ? 'primary.contrastText' : 'text.secondary' }}
              >
                {secondary}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
