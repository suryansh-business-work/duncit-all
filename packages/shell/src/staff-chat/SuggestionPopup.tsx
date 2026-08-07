import { List, ListItemButton, ListItemText, Paper } from '@mui/material';

export interface Suggestion {
  /** Unique and stable — the list keys off it. */
  key: string;
  label: string;
}

interface Props {
  items: Suggestion[];
  /** Which one Enter or Tab would take. */
  active: number;
  onPick: (item: Suggestion) => void;
}

/**
 * What the composer is offering, above the box you are typing in.
 *
 * One list for both `@` and `:`. They differ only in what fills them and what
 * picking one writes, and two popovers that behave subtly differently is how a
 * composer starts feeling unpredictable.
 */
export default function SuggestionPopup({ items, active, onPick }: Readonly<Props>) {
  if (items.length === 0) return null;

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'absolute',
        left: 8,
        right: 8,
        bottom: '100%',
        mb: 0.5,
        maxHeight: 180,
        overflowY: 'auto',
        zIndex: 2,
      }}
    >
      <List dense disablePadding>
        {items.map((item, index) => (
          <ListItemButton
            key={item.key}
            selected={index === active}
            // Mouse down, not click: click fires after the textarea has already
            // lost focus, and blurring closes this list before the pick lands.
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(item);
            }}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}
