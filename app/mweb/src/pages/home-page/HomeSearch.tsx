import { useNavigate } from 'react-router';
import { InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/SearchRounded';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  locationId?: string;
  zoneName?: string;
  /** Disabled when there are no clubs/pods to search. */
  disabled?: boolean;
}

/** Home-page search launcher — the pill at the top of Home. Tapping it opens
 * the full Search experience (clubs, pods, categories, suggestions, sort &
 * filter) at /search. Native twin: HomeSearchRow's pill. */
export default function HomeSearch({ disabled }: Readonly<Props>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const open = () => {
    if (!disabled) navigate('/search');
  };

  return (
    <TextField
      fullWidth
      disabled={disabled}
      placeholder={t('mweb.home.searchPods')}
      onClick={open}
      onFocus={open}
      sx={{
        '& .MuiOutlinedInput-root': {
          height: 52,
          borderRadius: 999,
          pl: '18px',
          bgcolor: 'background.paper',
          cursor: disabled ? 'default' : 'pointer',
        },
        '& .MuiOutlinedInput-notchedOutline, & .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline':
          { borderColor: 'var(--duncit-card-border)' },
        '& .MuiOutlinedInput-input': { cursor: 'inherit', fontSize: 14 },
        '& .MuiOutlinedInput-input::placeholder': { color: 'text.secondary', opacity: 1 },
      }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
            </InputAdornment>
          ),
        },

        htmlInput: {
          'aria-label': 'Search Duncit',
          enterKeyHint: 'search',
          readOnly: true,
        }
      }} />
  );
}
