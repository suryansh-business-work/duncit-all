import { Chip, Stack } from '@mui/material';
import type { NotificationChip, NotificationFilterKey } from '@duncit/utils';

interface Props {
  chips: NotificationChip[];
  value: NotificationFilterKey;
  onChange: (key: NotificationFilterKey) => void;
}

/** Category filter row. Only categories actually present get a chip — eleven
 * fixed chips would leave most of them permanently empty. */
export default function NotificationFilterChips({ chips, value, onChange }: Readonly<Props>) {
  if (chips.length <= 2) return null;
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        px: 1.5,
        pb: 1.25,
        overflowX: 'auto',
        flexWrap: 'nowrap',
        // The chip row scrolls; the page never does.
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}
    >
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          label={`${chip.label} ${chip.count}`}
          onClick={() => onChange(chip.key)}
          color={value === chip.key ? 'primary' : 'default'}
          variant={value === chip.key ? 'filled' : 'outlined'}
          aria-pressed={value === chip.key}
          sx={{
            flex: '0 0 auto',
            fontWeight: 700,
            bgcolor: value === chip.key ? undefined : 'background.paper',
            transition: 'background-color 160ms ease, color 160ms ease',
          }}
        />
      ))}
    </Stack>
  );
}
