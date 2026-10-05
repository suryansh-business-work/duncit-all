import type { UseFormReturn } from 'react-hook-form';
import { Alert, Autocomplete, CircularProgress, Stack, TextField } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { ServiceablePincodeValues } from './serviceable-pincode.types';
import { usePincodeAiFill, type AreaSuggestion } from './usePincodeAiFill';

interface PincodeAiFillProps {
  form: UseFormReturn<ServiceablePincodeValues>;
  disabled: boolean;
}

/** Fill with AI for the chosen city — the same answer Admin › Locations fills a city's areas from. */
export default function PincodeAiFill({ form, disabled }: Readonly<PincodeAiFillProps>) {
  const { t } = useTranslation();
  const { fill, apply, loading, error, suggestions } = usePincodeAiFill(form);
  const suggestionLabel = (option: AreaSuggestion) =>
    t('ecommPortal.serviceablePincodes.aiSuggestion', { vars: { area: option.area, pincode: option.pincode } });

  return (
    <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
      <DuncitButton
        size="small"
        color="secondary"
        variant="outlined"
        startIcon={loading ? <CircularProgress size={14} /> : <AutoAwesomeIcon fontSize="small" />}
        onClick={fill}
        disabled={disabled || loading}
        data-testid="serviceable-pincode-ai-fill"
      >
        {loading ? t('ecommPortal.serviceablePincodes.fillingWithAi') : t('ecommPortal.serviceablePincodes.fillWithAi')}
      </DuncitButton>
      {error && (
        <Alert severity="error" sx={{ alignSelf: 'stretch' }} data-testid="serviceable-pincode-ai-error">
          {error}
        </Alert>
      )}
      {suggestions.length > 1 && (
        <Autocomplete<AreaSuggestion>
          options={suggestions}
          value={null}
          blurOnSelect
          fullWidth
          getOptionLabel={suggestionLabel}
          isOptionEqualToValue={(a, b) => a.area === b.area && a.pincode === b.pincode}
          getOptionKey={(option) => `${option.area}|${option.pincode}`}
          onChange={(_event, value) => {
            if (value) apply(value);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              label={t('ecommPortal.serviceablePincodes.aiSuggestions')}
              helperText={t('ecommPortal.serviceablePincodes.aiSuggestionsHint')}
            />
          )}
          data-testid="serviceable-pincode-ai-suggestions"
        />
      )}
    </Stack>
  );
}
