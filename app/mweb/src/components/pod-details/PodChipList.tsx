import { Chip, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface Props {
  items: string[];
  emptyText: string;
  /** Tints the check beside each item. */
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning';
}

/** A wrapped list of soft pills, each with a tinted check, or an empty hint.
 * Native twin: ChipList in components/details/PodSections. */
export default function PodChipList({ items, emptyText, color = 'default' }: Readonly<Props>) {
  if (!items || items.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {emptyText}
      </Typography>
    );
  }
  const tint = color === 'default' ? 'text.secondary' : `${color}.main`;
  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
      {items.map((item, i) => (
        <Chip
          key={`${item}-${i}`}
          label={item}
          icon={<CheckCircleIcon />}
          sx={{ bgcolor: 'action.hover', '& .MuiChip-icon': { color: tint, fontSize: 16 } }}
        />
      ))}
    </Stack>
  );
}
