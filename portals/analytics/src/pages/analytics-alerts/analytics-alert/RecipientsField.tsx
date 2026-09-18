import { Autocomplete, Chip, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}

/** Split what was typed or pasted on commas, spaces and new lines — a list pasted from a mail client works. */
const splitAddresses = (text: string) =>
  text
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

/** Who is mailed when the alert trips: type an address and press Enter, or paste a list. */
export default function RecipientsField({ value, onChange, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const change = (next: readonly string[]) => onChange([...new Set(next.flatMap(splitAddresses))]);
  return (
    <Autocomplete<string, true, false, true>
      multiple
      freeSolo
      options={[]}
      value={value}
      onChange={(_event, next) => change(next)}
      renderValue={(selected, getItemProps) =>
        selected.map((email, index) => {
          const { key, ...itemProps } = getItemProps({ index });
          return <Chip key={key} size="small" label={email} {...itemProps} />;
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={t('analytics.alerts.recipients')}
          helperText={error ?? t('analytics.alerts.recipientsHint')}
          error={Boolean(error)}
          slotProps={{
            ...params.slotProps,
            htmlInput: { ...params.slotProps.htmlInput, 'data-testid': 'analytics-alert-recipients', type: 'email' },
          }}
        />
      )}
    />
  );
}
