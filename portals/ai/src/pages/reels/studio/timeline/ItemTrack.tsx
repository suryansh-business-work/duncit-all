import { Box, ButtonBase, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { ITEM_ROW_HEIGHT, msToPx } from './geometry';

type Tone = 'info' | 'secondary' | 'warning';

/** Each tone's fill and the text colour MUI pairs with it for contrast. */
const TONE: Readonly<Record<Tone, { bg: string; fg: string }>> = {
  info: { bg: 'info.main', fg: 'info.contrastText' },
  secondary: { bg: 'secondary.main', fg: 'secondary.contrastText' },
  warning: { bg: 'warning.main', fg: 'warning.contrastText' },
};

export interface TrackBlock {
  id: string;
  startMs: number;
  endMs: number;
  /** Which row of the track; overlapping blocks sit on separate rows. */
  lane: number;
  /** What is printed on the block. */
  text: string;
  /** What it is called aloud — the kind of item and its words or name. */
  label: string;
  selected: boolean;
  onSelect: () => void;
}

interface Props {
  blocks: readonly TrackBlock[];
  zoom: number;
  /** The block colour — one per track, so the eye tells text from overlays from music. */
  tone: Tone;
  testId: string;
}

/** A track of timed items — texts, overlays or the music — each a button that selects it. */
export default function ItemTrack({ blocks, zoom, tone, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  const lanes = blocks.reduce((most, block) => Math.max(most, block.lane + 1), 1);

  return (
    <Box sx={{ position: 'relative', height: lanes * ITEM_ROW_HEIGHT + 6 }} data-testid={testId}>
      {blocks.length === 0 && (
        <Typography variant="caption" sx={{ position: 'absolute', left: 8, top: 4, color: 'text.secondary', userSelect: 'none' }}>
          {t('ai.reels.editor.trackEmpty')}
        </Typography>
      )}
      {blocks.map((block) => (
        <ButtonBase
          key={block.id}
          onClick={block.onSelect}
          aria-pressed={block.selected}
          aria-label={block.label}
          data-testid={`${testId}-${block.id}`}
          sx={{
            position: 'absolute',
            left: msToPx(block.startMs, zoom),
            top: 3 + block.lane * ITEM_ROW_HEIGHT,
            width: Math.max(12, msToPx(block.endMs - block.startMs, zoom)),
            height: ITEM_ROW_HEIGHT - 4,
            px: 0.75,
            justifyContent: 'flex-start',
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: TONE[tone].bg,
            color: TONE[tone].fg,
            outline: block.selected ? '2px solid' : 'none',
            outlineColor: 'text.primary',
            outlineOffset: 1,
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
          }}
        >
          <Typography variant="caption" noWrap sx={{ fontWeight: 600 }}>
            {block.text}
          </Typography>
        </ButtonBase>
      ))}
    </Box>
  );
}
