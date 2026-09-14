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
    <Dialog data-testid="search-sort-menu" open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="search-sort-menu-title">
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          pr: 1.5
        }}>
        <DialogTitle id="search-sort-menu-title" sx={{ fontSize: '1.0625rem', fontWeight: 600 }}>{t('mweb.search.sortResults')}</DialogTitle>
        <DuncitIconButton
          data-testid="search-sort-menu-close"
          aria-label={t('mweb.search.closeSort')}
          onClick={onClose}
          sx={{ width: 40, height: 40, minHeight: 40, bgcolor: 'action.hover' }}
        >
          <CloseIcon />
        </DuncitIconButton>
      </Stack>
      {/* The option list is the scroll area, so the title row stays pinned. */}
      <DialogContent dividers sx={{ p: 0 }}>
        <List sx={{ pb: 2 }}>
          {SEARCH_SORT_OPTIONS.map((option) => (
            <ListItemButton
              key={option.value}
              data-testid={`search-sort-menu-option-${option.value}`}
              selected={option.value === value}
              aria-pressed={option.value === value}
              onClick={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              {/* Visual only: the row button carries the pressed state, so the
                  radio is not a second, unlabeled control inside it. */}
              <Radio
                checked={option.value === value}
                tabIndex={-1}
                disableRipple
                slotProps={{ input: { tabIndex: -1, 'aria-hidden': true } }}
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
