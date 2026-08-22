import {
  Autocomplete,
  FormHelperText,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { SOMETHING_FOR_YOU_ROUTES, type SomethingForYouAction } from '@duncit/utils';
import type { SomethingForYouForm } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  form: SomethingForYouForm;
  setForm: (next: SomethingForYouForm) => void;
}

const ROUTE_OPTIONS = SOMETHING_FOR_YOU_ROUTES.map((route) => ({
  ...route,
  // Searchable by either half: an admin looks for "referral" as often as
  // for "Refer and earn".
  search: `${route.label} ${route.path}`,
}));

/**
 * What the card does when somebody presses it.
 *
 * Two destinations that behave differently enough to be chosen rather than
 * guessed. A ROUTE stays inside the product — the app pushes a screen, mWeb
 * pushes a history entry — while a URL leaves it, which on a phone means
 * handing over to the browser and losing the app. The stored strings look
 * almost identical, so the toggle is what carries the intent.
 *
 * The in-app list is a searchable menu rather than a free-text box because a
 * mistyped path is a card that silently lands on Not Found — and it is the one
 * failure nobody sees until a user reports it.
 */
export default function CallToActionSection({ form, setForm }: Readonly<Props>) {
  const { t } = useTranslation();
  const selectedRoute = ROUTE_OPTIONS.find((route) => route.path === form.link_path) ?? null;

  const chooseAction = (action: SomethingForYouAction | null) => {
    if (!action) return;
    setForm({ ...form, action_type: action });
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" fontWeight={700}>
        Call to action
      </Typography>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={form.action_type}
        onChange={(_event, value: SomethingForYouAction | null) => chooseAction(value)}
      >
        <ToggleButton value="NONE">{t('admin.somethingForYou.ctaNothing')}</ToggleButton>
        <ToggleButton value="ROUTE">{t('admin.somethingForYou.ctaScreen')}</ToggleButton>
        <ToggleButton value="URL">{t('admin.somethingForYou.ctaLink')}</ToggleButton>
      </ToggleButtonGroup>

      {form.action_type === 'NONE' && (
        <FormHelperText>{t('admin.somethingForYou.ctaNothingHint')}</FormHelperText>
      )}

      {form.action_type === 'ROUTE' && (
        <Autocomplete
          options={ROUTE_OPTIONS}
          value={selectedRoute}
          onChange={(_event, option) => setForm({ ...form, link_path: option?.path ?? '' })}
          getOptionLabel={(option) => option.label}
          filterOptions={(options, state) => {
            const term = state.inputValue.trim().toLowerCase();
            if (!term) return options;
            return options.filter((option) => option.search.toLowerCase().includes(term));
          }}
          isOptionEqualToValue={(option, value) => option.path === value.path}
          renderOption={(props, option) => (
            <li {...props} key={option.path}>
              <Stack>
                <Typography variant="body2">{option.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.path}
                </Typography>
              </Stack>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('admin.somethingForYou.ctaScreenHint')}
              helperText={t('admin.somethingForYou.screenSearchHint')}
            />
          )}
        />
      )}

      {form.action_type === 'URL' && (
        <TextField
          label={t('admin.somethingForYou.ctaLinkHint')}
          value={form.link_url}
          onChange={(event) => setForm({ ...form, link_url: event.target.value })}
          fullWidth
          placeholder="https://duncit.com/…"
          helperText={t('admin.somethingForYou.linkHint')}
        />
      )}
    </Stack>
  );
}
