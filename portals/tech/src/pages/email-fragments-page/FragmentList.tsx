import { Box, Chip, List, ListItemButton, ListItemText } from '@mui/material';
import type { Fragment } from './queries';

interface Props {
  list: Fragment[];
  selected: string | null;
  onSelect: (category: string) => void;
}

/**
 * The nine, in the order the code lists its categories. No add button and no
 * delete: the set is fixed by `EMAIL_CATEGORIES` on the server, so a tenth
 * could never be reached and a missing one would leave sends unwrapped.
 */
export default function FragmentList({ list, selected, onSelect }: Readonly<Props>) {
  return (
    <Box
      sx={{
        width: 280,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflowY: 'auto',
      }}
    >
      <List dense disablePadding>
        {list.map((f) => (
          <ListItemButton
            key={f.category}
            selected={selected === f.category}
            onClick={() => onSelect(f.category)}
          >
            <ListItemText
              primary={f.name}
              secondary={<span style={{ fontFamily: 'monospace', fontSize: 11 }}>{f.category}</span>}
            />
            {!f.is_active && <Chip size="small" label="off" />}
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
