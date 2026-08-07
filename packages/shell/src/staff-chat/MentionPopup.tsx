import { List, ListItemButton, ListItemText, Paper } from '@mui/material';

interface Props {
  /** Names still matching what has been typed after the @. */
  names: string[];
  /** Which one Enter or Tab would take. */
  active: number;
  onPick: (name: string) => void;
}

/**
 * Who you can mention, above the box you are typing in.
 *
 * A one-to-one thread has exactly one candidate, which sounds like a list not
 * worth having — but it is what makes the mention discoverable at all, and what
 * guarantees the name is spelled the way the bubble highlights it.
 */
export default function MentionPopup({ names, active, onPick }: Readonly<Props>) {
  if (names.length === 0) return null;

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
        {names.map((name, index) => (
          <ListItemButton
            key={name}
            selected={index === active}
            // Mouse down, not click: click fires after the textarea has already
            // lost focus, and blurring closes this list before the pick lands.
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(name);
            }}
          >
            <ListItemText primary={`@${name}`} />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}
