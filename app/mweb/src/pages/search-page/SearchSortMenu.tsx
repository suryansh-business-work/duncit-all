import {
  Dialog,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Radio,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { SEARCH_SORT_OPTIONS, type SearchSort } from './searchSort';

interface Props {
  open: boolean;
  value: SearchSort;
  onClose: () => void;
  onSelect: (next: SearchSort) => void;
}

export default function SearchSortMenu({ open, value, onClose, onSelect }: Readonly<Props>) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pr: 1 }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Sort Results</DialogTitle>
        <IconButton aria-label="Close sort" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
      <List sx={{ pb: 2 }}>
        {SEARCH_SORT_OPTIONS.map((option) => (
          <ListItemButton
            key={option.value}
            selected={option.value === value}
            onClick={() => {
              onSelect(option.value);
              onClose();
            }}
          >
            <Radio checked={option.value === value} tabIndex={-1} disableRipple sx={{ mr: 0.5 }} />
            <ListItemText
              primary={option.label}
              secondary={option.description}
              primaryTypographyProps={{ fontWeight: 800 }}
            />
          </ListItemButton>
        ))}
      </List>
    </Dialog>
  );
}
