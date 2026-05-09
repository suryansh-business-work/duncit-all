import { Box, Chip, List, ListItemButton, ListItemText } from '@mui/material';
import type { Tpl } from './queries';

interface Props {
  list: Tpl[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function TemplateList({ list, selected, onSelect }: Props) {
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
        {list.map((t) => (
          <ListItemButton
            key={t.template_id}
            selected={selected === t.template_id}
            onClick={() => onSelect(t.template_id)}
          >
            <ListItemText
              primary={t.name}
              secondary={
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{t.slug}</span>
              }
            />
            {!t.is_active && <Chip size="small" label="off" />}
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
