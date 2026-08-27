import {
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Radio,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { SEARCH_SORT_OPTIONS, type SearchSort } from './searchSort';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  value: SearchSort;
  onClose: () => void;
  onSelect: (next: SearchSort) => void;
}

export default function SearchSortMenu({ open, value, onClose, onSelect }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" slotProps={{
      paper: { sx: { borderRadius: '16px' } }
    }}>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          pr: 1
        }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('mweb.search.sortResults')}</DialogTitle>
        <DuncitIconButton aria-label={t('mweb.search.closeSort')} onClick={onClose}>
          <CloseIcon />
        </DuncitIconButton>
      </Stack>
      {/* The option list is the scroll area, so the title row stays pinned. */}
      <DialogContent dividers sx={{ p: 0 }}>
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
              <Radio
                checked={option.value === value}
                tabIndex={-1}
                disableRipple
                sx={{ mr: 0.5 }}
              />
              <ListItemText
                primary={option.label}
                secondary={option.description}
                slotProps={{
                  primary: { sx: { fontWeight: 600 } }
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
