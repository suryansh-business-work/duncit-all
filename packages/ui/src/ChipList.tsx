import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';

export interface ChipListProps {
  /** The values to draw, one chip each. */
  items: readonly string[];
  /** What an empty list reads as — usually a dash. */
  empty: string;
  size?: 'small' | 'medium';
}

/**
 * A list of short values as outlined chips — hashtags, perks, what a pod
 * offers — or the caller's "nothing here" text when the list is empty.
 *
 * Shared because two read-only summaries of the same Auto Pod render it: the
 * template's own review step inside `@duncit/pod-form`, and the admin
 * console's offer page. A second copy is exactly the drift rule 40 exists to
 * stop, and the chips are what a reader compares between the two.
 */
export function ChipList({ items, empty, size = 'small' }: Readonly<ChipListProps>) {
  if (items.length === 0) return <>{empty}</>;
  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {items.map((item) => (
        <Chip key={item} size={size} variant="outlined" label={item} />
      ))}
    </Stack>
  );
}
