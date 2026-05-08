import { Chip, Stack, Typography } from '@mui/material';

interface Props {
  items: string[];
  emptyText: string;
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning';
  variant?: 'filled' | 'outlined';
}

export default function PodChipList({
  items,
  emptyText,
  color = 'default',
  variant = 'outlined',
}: Props) {
  if (!items || items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyText}
      </Typography>
    );
  }
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
      {items.map((item, i) => (
        <Chip key={`${item}-${i}`} label={item} color={color} variant={variant} size="small" />
      ))}
    </Stack>
  );
}
